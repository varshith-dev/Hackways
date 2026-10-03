package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/eventflow/rsvp-core/internal/cache"
	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/eventflow/rsvp-core/internal/eventbus"
	"github.com/eventflow/rsvp-core/internal/repository"
)

type RSVPService struct {
	repo       repository.Repository
	cache      cache.CacheService
	bus        eventbus.EventBus
	workerPool *WaitlistWorkerPool
}

func NewRSVPService(
	repo repository.Repository,
	cache cache.CacheService,
	bus eventbus.EventBus,
	workerPool *WaitlistWorkerPool,
) *RSVPService {
	return &RSVPService{
		repo:       repo,
		cache:      cache,
		bus:        bus,
		workerPool: workerPool,
	}
}

// CreateRSVP executes the multi-tier high-concurrency reservation pipeline
func (s *RSVPService) CreateRSVP(ctx context.Context, req *domain.CreateRSVPRequest) (*domain.RSVPResponse, error) {
	// 1. Idempotency Check: if key already exists, return identical response
	if req.IdempotencyKey != "" {
		cachedBytes, found, err := s.cache.GetIdempotency(ctx, req.IdempotencyKey)
		if err == nil && found && len(cachedBytes) > 0 {
			var resp domain.RSVPResponse
			if err := json.Unmarshal(cachedBytes, &resp); err == nil {
				resp.Cached = true
				return &resp, nil
			}
		}
	}

	// 2. Validate Event & Tier existence
	event, err := s.repo.GetEvent(ctx, req.EventID)
	if err != nil {
		return nil, err
	}
	if event.Status == domain.EventStatusCancelled {
		return nil, errors.New("event has been cancelled")
	}
	if event.RSVPDeadline != nil && time.Now().After(*event.RSVPDeadline) {
		return nil, domain.ErrDeadlinePassed
	}

	tier, err := s.repo.GetTier(ctx, req.TierID)
	if err != nil {
		return nil, err
	}

	// 3. Fast-Path Ingress: Valkey Lua Atomic Reservation
	reservation, err := s.cache.ReserveSeat(ctx, req.TierID, req.UserID, req.EventID, tier.RemainingCapacity)
	if err != nil {
		log.Printf("[RSVPService] Valkey check error (proceeding to Postgres): %v", err)
		reservation.Status = "CONFIRMED" // Fallback to DB ACID on cache failure
	}

	if reservation.Status == "ALREADY_RSVPD" {
		// Fetch existing RSVP
		existing, err := s.repo.GetRSVPByEventAndUser(ctx, req.EventID, req.UserID)
		if err == nil && existing != nil {
			return &domain.RSVPResponse{
				RSVP:    existing,
				Message: "You are already registered for this event",
			}, nil
		}
		return nil, domain.ErrAlreadyRSVPd
	}

	var finalResp *domain.RSVPResponse

	// If Valkey indicated available capacity, attempt PostgreSQL ACID decrement
	if reservation.Status == "CONFIRMED" {
		rsvp := &domain.RSVP{
			EventID:        req.EventID,
			TierID:         req.TierID,
			UserID:         req.UserID,
			UserEmail:      req.UserEmail,
			UserName:       req.UserName,
			IdempotencyKey: req.IdempotencyKey,
		}

		confirmedRSVP, remainingCap, err := s.repo.CreateRSVPAtomic(ctx, rsvp)
		if err == nil {
			// Seat successfully booked in Postgres!
			finalResp = &domain.RSVPResponse{
				RSVP:    confirmedRSVP,
				Message: "RSVP confirmed successfully",
			}

			// Publish event asynchronously to NATS
			_ = s.bus.Publish(ctx, eventbus.SubjectRSVPCreated, &eventbus.EventPayload{
				EventID:   req.EventID,
				TierID:    req.TierID,
				RSVPID:    confirmedRSVP.ID,
				UserID:    req.UserID,
				UserEmail: req.UserEmail,
				UserName:  req.UserName,
				Status:    string(domain.RSVPStatusConfirmed),
				Payload: map[string]interface{}{
					"remaining_capacity": remainingCap,
				},
				Timestamp: time.Now().UTC(),
			})

			if remainingCap == 0 {
				_ = s.bus.Publish(ctx, eventbus.SubjectCapacityReached, &eventbus.EventPayload{
					EventID:   req.EventID,
					TierID:    req.TierID,
					Status:    "SOLD_OUT",
					Timestamp: time.Now().UTC(),
				})
			}
		} else if errors.Is(err, domain.ErrSoldOut) {
			// Race condition: another transaction took the last seat in Postgres!
			// Route to waitlist immediately
			reservation.Status = "WAITLIST"
		} else if errors.Is(err, domain.ErrAlreadyRSVPd) {
			return nil, domain.ErrAlreadyRSVPd
		} else {
			// Postgres failure: compensate Valkey counter
			_, _ = s.cache.ReleaseSeat(ctx, req.TierID, req.UserID, req.EventID)
			return nil, fmt.Errorf("failed to persist RSVP: %w", err)
		}
	}

	// 4. Waitlist Route: if sold out or Postgres returned ErrSoldOut
	if reservation.Status == "WAITLIST" {
		waitlistRSVP := &domain.RSVP{
			EventID:        req.EventID,
			TierID:         req.TierID,
			UserID:         req.UserID,
			UserEmail:      req.UserEmail,
			UserName:       req.UserName,
			IdempotencyKey: req.IdempotencyKey,
		}

		entry, err := s.repo.CreateWaitlistEntry(ctx, waitlistRSVP)
		if err != nil {
			return nil, err
		}

		finalResp = &domain.RSVPResponse{
			RSVP:             waitlistRSVP,
			WaitlistPosition: entry.Position,
			Message:          fmt.Sprintf("Capacity reached. You have been added to the waitlist at position #%d.", entry.Position),
		}

		_ = s.bus.Publish(ctx, eventbus.SubjectRSVPCreated, &eventbus.EventPayload{
			EventID:   req.EventID,
			TierID:    req.TierID,
			RSVPID:    waitlistRSVP.ID,
			UserID:    req.UserID,
			UserEmail: req.UserEmail,
			UserName:  req.UserName,
			Status:    string(domain.RSVPStatusWaitlist),
			Payload: map[string]interface{}{
				"waitlist_position": entry.Position,
			},
			Timestamp: time.Now().UTC(),
		})
	}

	// 5. Cache Idempotency response
	if req.IdempotencyKey != "" && finalResp != nil {
		if respBytes, err := json.Marshal(finalResp); err == nil {
			_ = s.cache.SetIdempotency(ctx, req.IdempotencyKey, respBytes, 24*time.Hour)
		}
	}

	return finalResp, nil
}

// CancelRSVP releases capacity and queues waitlist promotion if a confirmed seat was held
func (s *RSVPService) CancelRSVP(ctx context.Context, rsvpID string) (*domain.RSVP, error) {
	rsvp, freedTierID, wasConfirmed, err := s.repo.CancelRSVP(ctx, rsvpID)
	if err != nil {
		return nil, err
	}

	if wasConfirmed {
		// Release Valkey cache reservation only if confirmed
		_, _ = s.cache.ReleaseSeat(ctx, freedTierID, rsvp.UserID, rsvp.EventID)

		// Trigger worker pool waitlist promotion for this tier
		s.workerPool.EnqueuePromotion(rsvp.EventID, freedTierID)
	}

	// Publish cancellation event to NATS
	_ = s.bus.Publish(ctx, eventbus.SubjectRSVPCancelled, &eventbus.EventPayload{
		EventID:   rsvp.EventID,
		TierID:    freedTierID,
		RSVPID:    rsvp.ID,
		UserID:    rsvp.UserID,
		UserEmail: rsvp.UserEmail,
		UserName:  rsvp.UserName,
		Status:    string(domain.RSVPStatusCancelled),
		Payload: map[string]interface{}{
			"was_confirmed": wasConfirmed,
		},
		Timestamp: time.Now().UTC(),
	})

	return rsvp, nil
}

func (s *RSVPService) GetCapacity(ctx context.Context, eventID, tierID string) (*domain.EventCapacitySnapshot, error) {
	return s.repo.GetEventCapacitySnapshot(ctx, eventID, tierID)
}

func (s *RSVPService) ReconcileCapacity(ctx context.Context, eventID, tierID string) error {
	snapshot, err := s.repo.GetEventCapacitySnapshot(ctx, eventID, tierID)
	if err != nil {
		return err
	}
	return s.cache.SetCapacity(ctx, tierID, snapshot.RemainingCapacity)
}

func (s *RSVPService) GetRSVP(ctx context.Context, id string) (*domain.RSVP, error) {
	return s.repo.GetRSVP(ctx, id)
}

func (s *RSVPService) GetTiersByEvent(ctx context.Context, eventID string) ([]*domain.TicketTier, error) {
	return s.repo.GetTiersByEvent(ctx, eventID)
}
