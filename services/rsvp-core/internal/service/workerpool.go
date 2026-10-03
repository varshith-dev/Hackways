package service

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/eventflow/rsvp-core/internal/eventbus"
	"github.com/eventflow/rsvp-core/internal/repository"
)

type PromotionTask struct {
	EventID   string
	TierID    string
	CreatedAt time.Time
}

type WaitlistWorkerPool struct {
	workerCount int
	taskQueue   chan PromotionTask
	repo        repository.Repository
	bus         eventbus.EventBus
	wg          sync.WaitGroup
	ctx         context.Context
	cancel      context.CancelFunc
}

func NewWaitlistWorkerPool(workerCount, queueCapacity int, repo repository.Repository, bus eventbus.EventBus) *WaitlistWorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &WaitlistWorkerPool{
		workerCount: workerCount,
		taskQueue:   make(chan PromotionTask, queueCapacity),
		repo:        repo,
		bus:         bus,
		ctx:         ctx,
		cancel:      cancel,
	}
}

func (p *WaitlistWorkerPool) Start() {
	log.Printf("[WaitlistWorkerPool] Starting %d workers (queue capacity: %d)...", p.workerCount, cap(p.taskQueue))
	for i := 0; i < p.workerCount; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

func (p *WaitlistWorkerPool) EnqueuePromotion(eventID, tierID string) bool {
	select {
	case p.taskQueue <- PromotionTask{
		EventID:   eventID,
		TierID:    tierID,
		CreatedAt: time.Now(),
	}:
		return true
	default:
		log.Printf("[WaitlistWorkerPool] Warning: task queue is full! Backpressure triggered for event %s, tier %s", eventID, tierID)
		return false
	}
}

func (p *WaitlistWorkerPool) worker(id int) {
	defer p.wg.Done()
	log.Printf("[WaitlistWorkerPool] Worker %d active", id)

	for {
		select {
		case <-p.ctx.Done():
			log.Printf("[WaitlistWorkerPool] Worker %d shutting down", id)
			return
		case task, ok := <-p.taskQueue:
			if !ok {
				return
			}
			p.processPromotion(task)
		}
	}
}

func (p *WaitlistWorkerPool) processPromotion(task PromotionTask) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Claim the next active waitlist entry in FIFO order
	entry, err := p.repo.PopNextWaitlist(ctx, task.EventID, task.TierID)
	if err != nil {
		if errors.Is(err, domain.ErrWaitlistEmpty) {
			// No more waitlisted attendees for this tier
			return
		}
		log.Printf("[WaitlistWorkerPool] Error popping waitlist for tier %s: %v", task.TierID, err)
		return
	}

	// 2. Atomically promote the entry and mark the RSVP CONFIRMED
	err = p.repo.PromoteWaitlistEntry(ctx, entry.ID, entry.RSVPID, task.TierID)
	if err != nil {
		log.Printf("[WaitlistWorkerPool] Failed to promote entry %s: %v", entry.ID, err)
		return
	}

	log.Printf("[WaitlistWorkerPool] Successfully promoted user %s (position %d) for event %s", entry.UserID, entry.Position, task.EventID)

	// 3. Emit asynchronous event to NATS JetStream for Python notification dispatcher
	rsvp, _ := p.repo.GetRSVP(ctx, entry.RSVPID)
	userEmail := ""
	userName := ""
	if rsvp != nil {
		userEmail = rsvp.UserEmail
		userName = rsvp.UserName
	}

	_ = p.bus.Publish(ctx, eventbus.SubjectWaitlistPromoted, &eventbus.EventPayload{
		EventID:   task.EventID,
		TierID:    task.TierID,
		RSVPID:    entry.RSVPID,
		UserID:    entry.UserID,
		UserEmail: userEmail,
		UserName:  userName,
		Status:    string(domain.RSVPStatusConfirmed),
		Payload: map[string]interface{}{
			"promoted_from_position": entry.Position,
		},
		Timestamp: time.Now().UTC(),
	})
}

func (p *WaitlistWorkerPool) Stop() {
	p.cancel()
	close(p.taskQueue)
	p.wg.Wait()
	log.Printf("[WaitlistWorkerPool] All workers stopped cleanly.")
}
