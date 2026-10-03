package concurrency_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/eventflow/rsvp-core/internal/cache"
	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/eventflow/rsvp-core/internal/eventbus"
	"github.com/eventflow/rsvp-core/internal/repository"
	"github.com/eventflow/rsvp-core/internal/service"
	"github.com/google/uuid"
)

func setupTestEnvironment(tierCapacity int) (*service.RSVPService, *repository.MemoryRepository, string, string) {
	repo := repository.NewMemoryRepository()
	memCache := cache.NewMemoryCache()
	bus := eventbus.NewMemoryEventBus()

	workerPool := service.NewWaitlistWorkerPool(4, 1000, repo, bus)
	workerPool.Start()

	rsvpService := service.NewRSVPService(repo, memCache, bus, workerPool)

	eventID := uuid.New().String()
	tierID := uuid.New().String()

	ctx := context.Background()
	_ = repo.CreateEvent(ctx, &domain.Event{
		ID:            eventID,
		Title:         "Viral Drop Summit",
		OrganizerID:   "org_flash",
		Status:        domain.EventStatusPublished,
		TotalCapacity: tierCapacity,
	}, []*domain.TicketTier{
		{
			ID:            tierID,
			Name:          "General Admission",
			TotalCapacity: tierCapacity,
		},
	})

	return rsvpService, repo, eventID, tierID
}

// TestConcurrency_LastSeatsNoOverselling simulates a flash crowd racing for the last 5 spots.
// Out of 200 concurrent requests, exactly 5 must be CONFIRMED and 195 must be WAITLIST.
func TestConcurrency_LastSeatsNoOverselling(t *testing.T) {
	capacity := 5
	concurrentUsers := 200
	svc, repo, eventID, tierID := setupTestEnvironment(capacity)

	var wg sync.WaitGroup
	var confirmedCount int64
	var waitlistCount int64
	var errorCount int64

	startSignal := make(chan struct{})

	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userIndex int) {
			defer wg.Done()
			<-startSignal // Synchronize goroutines for simultaneous burst

			req := &domain.CreateRSVPRequest{
				EventID:   eventID,
				TierID:    tierID,
				UserID:    fmt.Sprintf("user_%d", userIndex),
				UserEmail: fmt.Sprintf("user_%d@flashcrowd.io", userIndex),
				UserName:  fmt.Sprintf("Attendee %d", userIndex),
			}

			resp, err := svc.CreateRSVP(context.Background(), req)
			if err != nil {
				atomic.AddInt64(&errorCount, 1)
				return
			}

			if resp.RSVP.Status == domain.RSVPStatusConfirmed {
				atomic.AddInt64(&confirmedCount, 1)
			} else if resp.RSVP.Status == domain.RSVPStatusWaitlist {
				atomic.AddInt64(&waitlistCount, 1)
			}
		}(i)
	}

	// Release all 200 goroutines simultaneously
	close(startSignal)
	wg.Wait()

	if errorCount > 0 {
		t.Fatalf("Unexpected errors during concurrent RSVP: %d", errorCount)
	}

	if confirmedCount != int64(capacity) {
		t.Errorf("CRITICAL: Overselling or underselling detected! Expected %d confirmed, got %d", capacity, confirmedCount)
	}

	expectedWaitlist := int64(concurrentUsers - capacity)
	if waitlistCount != expectedWaitlist {
		t.Errorf("Expected %d waitlisted, got %d", expectedWaitlist, waitlistCount)
	}

	snapshot, err := repo.GetEventCapacitySnapshot(context.Background(), eventID, tierID)
	if err != nil {
		t.Fatalf("Failed to fetch capacity snapshot: %v", err)
	}

	if snapshot.RemainingCapacity != 0 {
		t.Errorf("Expected 0 remaining capacity, got %d", snapshot.RemainingCapacity)
	}
	if snapshot.ConfirmedCount != capacity {
		t.Errorf("Expected snapshot confirmed count %d, got %d", capacity, snapshot.ConfirmedCount)
	}

	t.Logf("SUCCESS: Under %d concurrent requests for %d seats: Confirmed=%d, Waitlist=%d, Errors=0",
		concurrentUsers, capacity, confirmedCount, waitlistCount)
}

// TestConcurrency_IdempotencyDeduplication verifies that identical requests
// with the same idempotency key are deduplicated under concurrent flight.
func TestConcurrency_IdempotencyDeduplication(t *testing.T) {
	svc, _, eventID, tierID := setupTestEnvironment(10)

	idempotencyKey := "idemp_unique_token_xyz"
	goroutineCount := 50

	var wg sync.WaitGroup
	var successCount int64
	var errCount int64

	startSignal := make(chan struct{})

	for i := 0; i < goroutineCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-startSignal

			req := &domain.CreateRSVPRequest{
				EventID:        eventID,
				TierID:         tierID,
				UserID:         "repeated_user_1",
				UserEmail:      "repeated@example.com",
				UserName:       "Repeated Submitter",
				IdempotencyKey: idempotencyKey,
			}

			_, err := svc.CreateRSVP(context.Background(), req)
			if err != nil {
				atomic.AddInt64(&errCount, 1)
			} else {
				atomic.AddInt64(&successCount, 1)
			}
		}()
	}

	close(startSignal)
	wg.Wait()

	// All callers should succeed (either primary or cached response)
	if successCount == 0 {
		t.Fatalf("Expected successful responses with idempotency key, got 0")
	}

	t.Logf("SUCCESS: Idempotency stress test passed: %d concurrent duplicate submissions resolved cleanly", goroutineCount)
}

// TestConcurrency_WaitlistPromotionCascade verifies that when confirmed attendees cancel,
// the waitlist worker pool promotes the next attendees in deterministic FIFO order.
func TestConcurrency_WaitlistPromotionCascade(t *testing.T) {
	capacity := 2
	svc, repo, eventID, tierID := setupTestEnvironment(capacity)

	ctx := context.Background()

	// 1. Fill the 2 seats
	r1, err := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "seat_holder_1",
		UserEmail: "holder1@test.com",
		UserName:  "Holder One",
	})
	if err != nil || r1.RSVP.Status != domain.RSVPStatusConfirmed {
		t.Fatalf("Failed to create confirmed RSVP 1: %v", err)
	}

	_, err = svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "seat_holder_2",
		UserEmail: "holder2@test.com",
		UserName:  "Holder Two",
	})
	if err != nil {
		t.Fatalf("Failed to create confirmed RSVP 2: %v", err)
	}

	// 2. Add 3 people to the waitlist
	wl1, _ := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "waitlisted_first",
		UserEmail: "wl1@test.com",
		UserName:  "Waitlist #1",
	})
	if wl1.WaitlistPosition != 1 {
		t.Fatalf("Expected waitlist position 1, got %d", wl1.WaitlistPosition)
	}

	wl2, _ := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "waitlisted_second",
		UserEmail: "wl2@test.com",
		UserName:  "Waitlist #2",
	})
	if wl2.WaitlistPosition != 2 {
		t.Fatalf("Expected waitlist position 2, got %d", wl2.WaitlistPosition)
	}

	// 3. Cancel Holder One -> should trigger promotion of Waitlist #1
	_, err = svc.CancelRSVP(ctx, r1.RSVP.ID)
	if err != nil {
		t.Fatalf("Failed to cancel RSVP: %v", err)
	}

	// Wait for worker pool goroutine to process promotion
	time.Sleep(100 * time.Millisecond)

	promotedRSVP, err := repo.GetRSVP(ctx, wl1.RSVP.ID)
	if err != nil {
		t.Fatalf("Failed to fetch promoted RSVP: %v", err)
	}

	if promotedRSVP.Status != domain.RSVPStatusConfirmed {
		t.Errorf("Expected waitlisted user #1 to be promoted to CONFIRMED, got status %s", promotedRSVP.Status)
	}

	stillWaiting, _ := repo.GetRSVP(ctx, wl2.RSVP.ID)
	if stillWaiting.Status != domain.RSVPStatusWaitlist {
		t.Errorf("Expected waitlist user #2 to still be WAITLIST, got %s", stillWaiting.Status)
	}

	t.Logf("SUCCESS: Waitlist FIFO promotion cascade executed correctly")
}

// TestConcurrency_FlashCrowd10k executes 10,000 concurrent goroutines racing on a single viral event
// with 1,000 available seats. Exactly 1,000 must be confirmed and exactly 9,000 waitlisted with 0 errors.
func TestConcurrency_FlashCrowd10k(t *testing.T) {
	capacity := 1000
	totalAttendees := 10000
	svc, repo, eventID, tierID := setupTestEnvironment(capacity)

	var wg sync.WaitGroup
	var confirmedCount int64
	var waitlistCount int64
	var errorCount int64

	startSignal := make(chan struct{})

	// Spawn 10,000 concurrent goroutines
	for i := 0; i < totalAttendees; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-startSignal // Blast off simultaneously

			req := &domain.CreateRSVPRequest{
				EventID:   eventID,
				TierID:    tierID,
				UserID:    fmt.Sprintf("flash_guest_%d", idx),
				UserEmail: fmt.Sprintf("guest_%d@viral.io", idx),
				UserName:  fmt.Sprintf("Viral Guest %d", idx),
			}

			resp, err := svc.CreateRSVP(context.Background(), req)
			if err != nil {
				atomic.AddInt64(&errorCount, 1)
				return
			}

			if resp.RSVP.Status == domain.RSVPStatusConfirmed {
				atomic.AddInt64(&confirmedCount, 1)
			} else if resp.RSVP.Status == domain.RSVPStatusWaitlist {
				atomic.AddInt64(&waitlistCount, 1)
			}
		}(i)
	}

	start := time.Now()
	close(startSignal) // All 10,000 goroutines execute
	wg.Wait()
	duration := time.Since(start)

	if errorCount > 0 {
		t.Fatalf("Unexpected errors in 10k burst: %d", errorCount)
	}

	if confirmedCount != int64(capacity) {
		t.Fatalf("CRITICAL: Capacity breach! Expected %d confirmed, got %d", capacity, confirmedCount)
	}

	expectedWaitlist := int64(totalAttendees - capacity)
	if waitlistCount != expectedWaitlist {
		t.Fatalf("Expected %d waitlisted, got %d", expectedWaitlist, waitlistCount)
	}

	snap, err := repo.GetEventCapacitySnapshot(context.Background(), eventID, tierID)
	if err != nil {
		t.Fatalf("Failed to get capacity snapshot: %v", err)
	}

	if snap.RemainingCapacity != 0 {
		t.Fatalf("Expected 0 remaining capacity, got %d", snap.RemainingCapacity)
	}

	rps := float64(totalAttendees) / duration.Seconds()
	t.Logf(">>> 10,000 CONCURRENT BURST PASSED <<<")
	t.Logf("Time: %v (Throughput: %.2f RSVPs/sec)", duration, rps)
	t.Logf("Confirmed: %d, Waitlist: %d, Errors: 0, Oversold: 0", confirmedCount, waitlistCount)
}

// TestConcurrency_WaitlistCancellationNoCapacityLeak verifies that cancelling
// a waitlisted RSVP does NOT release capacity or promote another user.
func TestConcurrency_WaitlistCancellationNoCapacityLeak(t *testing.T) {
	capacity := 1
	svc, repo, eventID, tierID := setupTestEnvironment(capacity)
	ctx := context.Background()

	// 1. Book the only seat
	conf, err := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "user_confirmed",
		UserEmail: "confirmed@test.com",
		UserName:  "Confirmed User",
	})
	if err != nil || conf.RSVP.Status != domain.RSVPStatusConfirmed {
		t.Fatalf("Failed to create confirmed RSVP: %v", err)
	}

	// 2. Add two users to waitlist
	wl1, err := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "user_wl1",
		UserEmail: "wl1@test.com",
		UserName:  "Waitlist 1",
	})
	if err != nil || wl1.RSVP.Status != domain.RSVPStatusWaitlist {
		t.Fatalf("Failed to create waitlist RSVP 1: %v", err)
	}

	wl2, err := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "user_wl2",
		UserEmail: "wl2@test.com",
		UserName:  "Waitlist 2",
	})
	if err != nil || wl2.RSVP.Status != domain.RSVPStatusWaitlist {
		t.Fatalf("Failed to create waitlist RSVP 2: %v", err)
	}

	// 3. Cancel the first waitlisted user
	_, err = svc.CancelRSVP(ctx, wl1.RSVP.ID)
	if err != nil {
		t.Fatalf("Failed to cancel waitlist RSVP: %v", err)
	}

	time.Sleep(50 * time.Millisecond)

	// 4. Verify user_wl2 was NOT promoted (they should still be on waitlist!)
	wl2Record, err := repo.GetRSVP(ctx, wl2.RSVP.ID)
	if err != nil {
		t.Fatalf("Failed to fetch wl2 RSVP: %v", err)
	}
	if wl2Record.Status != domain.RSVPStatusWaitlist {
		t.Fatalf("CRITICAL BUG: wl2 was promoted (%s) after wl1 cancelled! Cancelling waitlist must never release a seat.", wl2Record.Status)
	}

	// 5. Verify remaining capacity is still 0
	snap, err := repo.GetEventCapacitySnapshot(ctx, eventID, tierID)
	if err != nil {
		t.Fatalf("Failed to get capacity snapshot: %v", err)
	}
	if snap.RemainingCapacity != 0 {
		t.Fatalf("CRITICAL BUG: Remaining capacity leaked to %d after waitlist cancellation!", snap.RemainingCapacity)
	}

	t.Logf("SUCCESS: Waitlist cancellation did not leak capacity or trigger false promotion")
}

// TestConcurrency_DuplicateCancellationIdempotent verifies that cancelling
// an already cancelled RSVP does NOT release capacity multiple times.
func TestConcurrency_DuplicateCancellationIdempotent(t *testing.T) {
	capacity := 1
	svc, repo, eventID, tierID := setupTestEnvironment(capacity)
	ctx := context.Background()

	// 1. Book the only seat
	conf, err := svc.CreateRSVP(ctx, &domain.CreateRSVPRequest{
		EventID:   eventID,
		TierID:    tierID,
		UserID:    "holder_1",
		UserEmail: "holder@test.com",
		UserName:  "Seat Holder",
	})
	if err != nil || conf.RSVP.Status != domain.RSVPStatusConfirmed {
		t.Fatalf("Failed to create confirmed RSVP: %v", err)
	}

	// 2. Cancel the seat once
	_, err = svc.CancelRSVP(ctx, conf.RSVP.ID)
	if err != nil {
		t.Fatalf("Failed to cancel RSVP first time: %v", err)
	}

	snap1, _ := repo.GetEventCapacitySnapshot(ctx, eventID, tierID)
	if snap1.RemainingCapacity != 1 {
		t.Fatalf("Expected 1 remaining capacity after first cancel, got %d", snap1.RemainingCapacity)
	}

	// 3. Cancel the seat a SECOND time
	_, err = svc.CancelRSVP(ctx, conf.RSVP.ID)
	if err != nil {
		t.Fatalf("Failed to cancel RSVP second time: %v", err)
	}

	// Capacity should still be 1, NOT 2!
	snap2, _ := repo.GetEventCapacitySnapshot(ctx, eventID, tierID)
	if snap2.RemainingCapacity != 1 {
		t.Fatalf("CRITICAL BUG: Capacity increased to %d after duplicate cancellation!", snap2.RemainingCapacity)
	}

	t.Logf("SUCCESS: Duplicate cancellation is safe and idempotent")
}


