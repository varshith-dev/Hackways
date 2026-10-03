package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	grpcserver "github.com/eventflow/rsvp-core/internal/api/grpc"
	"github.com/eventflow/rsvp-core/internal/api/rest"
	"github.com/eventflow/rsvp-core/internal/auth"
	"github.com/eventflow/rsvp-core/internal/cache"
	"github.com/eventflow/rsvp-core/internal/config"
	"github.com/eventflow/rsvp-core/internal/eventbus"
	"github.com/eventflow/rsvp-core/internal/repository"
	"github.com/eventflow/rsvp-core/internal/service"
)

func main() {
	cfg := config.Load()
	log.Printf("==================================================")
	log.Printf("  EventFlow: rsvp-core starting (Port: %s, gRPC: %s)", cfg.Port, cfg.GRPCPort)
	log.Printf("==================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. Data Store Initialization (Postgres with Memory fallback)
	var repo repository.Repository
	if !cfg.UseInMemoryStore {
		pgRepo, err := repository.NewPostgresRepository(ctx, cfg)
		if err != nil {
			log.Printf("[Storage] PostgreSQL unavailable at %s (%v). Falling back to high-concurrency In-Memory Store.", cfg.DatabaseURL, err)
			memRepo := repository.NewMemoryRepository()
			repo = memRepo
		} else {
			log.Printf("[Storage] PostgreSQL connection pool initialized (MaxConns: %d, MinConns: %d)", cfg.DBMaxOpenConns, cfg.DBMaxIdleConns)
			repo = pgRepo
		}
	} else {
		log.Printf("[Storage] Using In-Memory Store as configured.")
		memRepo := repository.NewMemoryRepository()
		repo = memRepo
	}
	defer repo.Close()

	// 2. Cache / Valkey Initialization
	var cacheService cache.CacheService
	valkeyCache, err := cache.NewValkeyCache(cfg.ValkeyAddr, cfg.ValkeyPassword, cfg.ValkeyDB)
	if err != nil {
		log.Printf("[Valkey] Valkey unavailable at %s (%v). Using atomic In-Memory Cache.", cfg.ValkeyAddr, err)
		cacheService = cache.NewMemoryCache()
	} else {
		log.Printf("[Valkey] Connected to Valkey at %s with atomic Lua scripts loaded.", cfg.ValkeyAddr)
		cacheService = valkeyCache
	}
	defer cacheService.Close()

	// 3. Event Bus (NATS JetStream with Memory fallback)
	var bus eventbus.EventBus
	natsBus, err := eventbus.NewNatsEventBus(cfg.NatsURL)
	if err != nil {
		log.Printf("[EventBus] NATS unavailable at %s (%v). Using In-Memory EventBus.", cfg.NatsURL, err)
		bus = eventbus.NewMemoryEventBus()
	} else {
		log.Printf("[EventBus] Connected to NATS JetStream at %s", cfg.NatsURL)
		bus = natsBus
	}
	defer bus.Close()

	// 4. Waitlist Worker Pool
	workerPool := service.NewWaitlistWorkerPool(cfg.WaitlistWorkers, cfg.WaitlistQueueSize, repo, bus)
	workerPool.Start()
	defer workerPool.Stop()

	// 5. RSVP Core Engine
	rsvpService := service.NewRSVPService(repo, cacheService, bus, workerPool)

	// 6. SSE Real-Time Hub
	sseHub := rest.NewSSEHub()
	sseHub.AttachEventBus(bus)

	// 7. gRPC Server
	grpcServer := grpcserver.NewServer(cfg.GRPCPort, rsvpService)
	if err := grpcServer.Start(); err != nil {
		log.Printf("[gRPC] Warning: failed to start gRPC listener: %v", err)
	} else {
		log.Printf("[gRPC] gRPC server listening on :%s", cfg.GRPCPort)
	}
	defer grpcServer.Stop()

	// 8. REST HTTP Server
	if cfg.AuthSecret == "hackways-dev-secret-change-in-production" {
		log.Printf("[Auth] WARNING: AUTH_SECRET is not set; using the insecure default. Set AUTH_SECRET before deploying.")
	}
	authSigner := auth.NewSigner(cfg.AuthSecret)
	restHandler := rest.NewHandler(cfg, rsvpService, repo, cacheService, sseHub, authSigner)
	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      restHandler.RegisterRoutes(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // WriteTimeout must be 0 for persistent SSE streaming connections
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("[HTTP] REST API & SSE streaming listening on http://localhost:%s", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[HTTP] Server terminated unexpectedly: %v", err)
		}
	}()

	// 9. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Printf("[Shutdown] Signal received; initiating graceful shutdown...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("[Shutdown] HTTP server shutdown error: %v", err)
	}
	log.Printf("[Shutdown] EventFlow rsvp-core stopped cleanly.")
}
