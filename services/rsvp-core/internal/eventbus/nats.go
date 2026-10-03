package eventbus

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	StreamName            = "EVENTFLOW"
	SubjectRSVPCreated    = "eventflow.rsvp.created"
	SubjectRSVPCancelled  = "eventflow.rsvp.cancelled"
	SubjectCapacityReached = "eventflow.capacity.reached"
	SubjectWaitlistPromoted = "eventflow.waitlist.promoted"
)

type EventPayload struct {
	EventID   string      `json:"event_id"`
	TierID    string      `json:"tier_id"`
	RSVPID    string      `json:"rsvp_id,omitempty"`
	UserID    string      `json:"user_id,omitempty"`
	UserEmail string      `json:"user_email,omitempty"`
	UserName  string      `json:"user_name,omitempty"`
	Status    string      `json:"status,omitempty"`
	Payload   interface{} `json:"payload,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

type EventBus interface {
	Publish(ctx context.Context, subject string, event *EventPayload) error
	Subscribe(subject string, handler func(event *EventPayload)) error
	Close() error
}

type NatsEventBus struct {
	nc *nats.Conn
	js jetstream.JetStream
}

func NewNatsEventBus(natsURL string) (*NatsEventBus, error) {
	nc, err := nats.Connect(natsURL,
		nats.MaxReconnects(-1),
		nats.ReconnectWait(2*time.Second),
		nats.Timeout(5*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("nats connect failed: %w", err)
	}

	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("jetstream init failed: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Ensure JetStream stream exists with at-least-once retention
	_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:      StreamName,
		Subjects:  []string{"eventflow.>"},
		Retention: jetstream.LimitsPolicy,
		MaxAge:    7 * 24 * time.Hour,
		Storage:   jetstream.FileStorage,
	})
	if err != nil {
		log.Printf("[EventBus] Warning: could not create JetStream stream (might exist or memory mode): %v", err)
	}

	return &NatsEventBus{
		nc: nc,
		js: js,
	}, nil
}

func (b *NatsEventBus) Publish(ctx context.Context, subject string, event *EventPayload) error {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	if b.js != nil {
		_, err = b.js.Publish(ctx, subject, data)
		return err
	}

	return b.nc.Publish(subject, data)
}

func (b *NatsEventBus) Subscribe(subject string, handler func(event *EventPayload)) error {
	_, err := b.nc.Subscribe(subject, func(msg *nats.Msg) {
		var ev EventPayload
		if err := json.Unmarshal(msg.Data, &ev); err == nil {
			handler(&ev)
		}
	})
	return err
}

func (b *NatsEventBus) Close() error {
	return b.nc.Drain()
}

// MemoryEventBus provides a zero-dependency in-process pub/sub for local testing
type MemoryEventBus struct {
	mu          sync.RWMutex
	subscribers map[string][]func(event *EventPayload)
	published   []*EventPayload
}

func NewMemoryEventBus() *MemoryEventBus {
	return &MemoryEventBus{
		subscribers: make(map[string][]func(event *EventPayload)),
	}
}

func (m *MemoryEventBus) Publish(ctx context.Context, subject string, event *EventPayload) error {
	m.mu.Lock()
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}
	m.published = append(m.published, event)
	handlers := append([]func(event *EventPayload){}, m.subscribers[subject]...)
	m.mu.Unlock()

	for _, h := range handlers {
		go h(event)
	}
	return nil
}

func (m *MemoryEventBus) Subscribe(subject string, handler func(event *EventPayload)) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.subscribers[subject] = append(m.subscribers[subject], handler)
	return nil
}

func (m *MemoryEventBus) Close() error {
	return nil
}

var _ EventBus = (*NatsEventBus)(nil)
var _ EventBus = (*MemoryEventBus)(nil)
