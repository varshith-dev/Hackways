package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port              string
	GRPCPort          string
	DatabaseURL       string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	ValkeyAddr        string
	ValkeyPassword    string
	ValkeyDB          int
	NatsURL           string
	RateLimitRPS      int
	RateLimitBurst    int
	WaitlistWorkers   int
	WaitlistQueueSize int
	UseInMemoryStore  bool // Auto-enabled if DATABASE_URL is not set, useful for quick verification
	AuthSecret        string
	AdminEmails       []string // These accounts are always granted the admin role, on signup and login
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		GRPCPort:          getEnv("GRPC_PORT", "50051"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/eventflow?sslmode=disable"),
		DBMaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 50),
		DBMaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 25),
		DBConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		ValkeyAddr:        getEnv("VALKEY_ADDR", "localhost:6379"),
		ValkeyPassword:    getEnv("VALKEY_PASSWORD", ""),
		ValkeyDB:          getEnvAsInt("VALKEY_DB", 0),
		NatsURL:           getEnv("NATS_URL", "nats://localhost:4222"),
		RateLimitRPS:      getEnvAsInt("RATE_LIMIT_RPS", 500),
		RateLimitBurst:    getEnvAsInt("RATE_LIMIT_BURST", 1000),
		WaitlistWorkers:   getEnvAsInt("WAITLIST_WORKERS", 8),
		WaitlistQueueSize: getEnvAsInt("WAITLIST_QUEUE_SIZE", 10000),
		UseInMemoryStore:  getEnvAsBool("USE_IN_MEMORY_STORE", false),
		AuthSecret:        getEnv("AUTH_SECRET", "hackways-dev-secret-change-in-production"),
		AdminEmails:       getEnvAsList("ADMIN_EMAILS", []string{"meridbase@gmail.com", "varshith.code@gmail.com"}),
	}
}

func getEnvAsList(key string, defaultVal []string) []string {
	val, ok := os.LookupEnv(key)
	if !ok || val == "" {
		return defaultVal
	}
	parts := strings.Split(val, ",")
	list := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(strings.ToLower(p)); trimmed != "" {
			list = append(list, trimmed)
		}
	}
	return list
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if val, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return defaultVal
}

func getEnvAsBool(key string, defaultVal bool) bool {
	if val, ok := os.LookupEnv(key); ok {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

func getEnvAsDuration(key string, defaultVal time.Duration) time.Duration {
	if val, ok := os.LookupEnv(key); ok {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}
