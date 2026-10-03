package rest

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/eventflow/rsvp-core/internal/eventbus"
)

// SSEHub manages real-time Server-Sent Events fan-out to connected browser clients
type SSEHub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan []byte]struct{} // eventID -> set of client channels
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		subscribers: make(map[string]map[chan []byte]struct{}),
	}
}

func (h *SSEHub) Subscribe(eventID string) chan []byte {
	h.mu.Lock()
	defer h.mu.Unlock()

	ch := make(chan []byte, 64)
	if _, exists := h.subscribers[eventID]; !exists {
		h.subscribers[eventID] = make(map[chan []byte]struct{})
	}
	h.subscribers[eventID][ch] = struct{}{}
	return ch
}

func (h *SSEHub) Unsubscribe(eventID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, exists := h.subscribers[eventID]; exists {
		delete(clients, ch)
		close(ch)
		if len(clients) == 0 {
			delete(h.subscribers, eventID)
		}
	}
}

func (h *SSEHub) Broadcast(eventID string, eventType string, payload interface{}) {
	h.mu.RLock()
	clients := make([]chan []byte, 0)
	if set, exists := h.subscribers[eventID]; exists {
		for ch := range set {
			clients = append(clients, ch)
		}
	}
	h.mu.RUnlock()

	if len(clients) == 0 {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, string(data)))

	for _, ch := range clients {
		select {
		case ch <- msg:
		default:
			// Client channel full; drop message or skip to avoid blocking server
		}
	}
}

// AttachEventBus pipes NATS/in-memory events directly into SSE broadcasts
func (h *SSEHub) AttachEventBus(bus eventbus.EventBus) {
	_ = bus.Subscribe(eventbus.SubjectRSVPCreated, func(ev *eventbus.EventPayload) {
		h.Broadcast(ev.EventID, "capacity_update", ev)
	})
	_ = bus.Subscribe(eventbus.SubjectRSVPCancelled, func(ev *eventbus.EventPayload) {
		h.Broadcast(ev.EventID, "capacity_update", ev)
	})
	_ = bus.Subscribe(eventbus.SubjectWaitlistPromoted, func(ev *eventbus.EventPayload) {
		h.Broadcast(ev.EventID, "waitlist_promoted", ev)
	})
	_ = bus.Subscribe(eventbus.SubjectCapacityReached, func(ev *eventbus.EventPayload) {
		h.Broadcast(ev.EventID, "capacity_reached", ev)
	})
}

func (h *SSEHub) HandleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	eventID := r.PathValue("id")
	if eventID == "" {
		http.Error(w, "Event ID required", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rc := http.NewResponseController(w)
	_ = rc.SetWriteDeadline(time.Time{})

	clientChan := h.Subscribe(eventID)
	defer h.Unsubscribe(eventID, clientChan)

	// Send initial heartbeat
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"connected\",\"event_id\":\"%s\"}\n\n", eventID)
	flusher.Flush()

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case msg, ok := <-clientChan:
			if !ok {
				return
			}
			_, _ = w.Write(msg)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()
		}
	}
}
