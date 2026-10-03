package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/google/uuid"
)

type MemoryRepository struct {
	mu       sync.RWMutex
	events   map[string]*domain.Event
	tiers    map[string]*domain.TicketTier
	rsvps    map[string]*domain.RSVP
	userRSVP map[string]string // key: eventID:userID -> rsvpID
	waitlist map[string]*domain.WaitlistEntry
	users    map[string]*domain.User // key: user ID
	byEmail  map[string]string       // key: lowercased email -> user ID
	byGoogle map[string]string       // key: google ID -> user ID
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		events:   make(map[string]*domain.Event),
		tiers:    make(map[string]*domain.TicketTier),
		rsvps:    make(map[string]*domain.RSVP),
		userRSVP: make(map[string]string),
		waitlist: make(map[string]*domain.WaitlistEntry),
		users:    make(map[string]*domain.User),
		byEmail:  make(map[string]string),
		byGoogle: make(map[string]string),
	}
}

func (m *MemoryRepository) GetEvent(ctx context.Context, idOrSlug string) (*domain.Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ev, ok := m.events[idOrSlug]
	if !ok {
		for _, e := range m.events {
			if e.Slug == idOrSlug {
				ev = e
				ok = true
				break
			}
		}
	}
	if !ok {
		return nil, domain.ErrEventNotFound
	}
	cp := *ev
	return &cp, nil
}

func (m *MemoryRepository) ListEvents(ctx context.Context) ([]*domain.Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []*domain.Event
	for _, ev := range m.events {
		cp := *ev
		list = append(list, &cp)
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	return list, nil
}

func (m *MemoryRepository) CreateEvent(ctx context.Context, event *domain.Event, tiers []*domain.TicketTier) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()
	m.events[event.ID] = event

	for _, t := range tiers {
		if t.ID == "" {
			t.ID = uuid.New().String()
		}
		t.EventID = event.ID
		t.RemainingCapacity = t.TotalCapacity
		t.CreatedAt = time.Now()
		t.UpdatedAt = time.Now()
		m.tiers[t.ID] = t
	}
	return nil
}

func (m *MemoryRepository) UpdateEvent(ctx context.Context, event *domain.Event, tiers []*domain.TicketTier) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	existing, ok := m.events[event.ID]
	if !ok {
		for _, e := range m.events {
			if e.Slug == event.ID || (event.Slug != "" && e.Slug == event.Slug) {
				existing = e
				ok = true
				break
			}
		}
	}
	if !ok {
		return domain.ErrEventNotFound
	}

	event.CreatedAt = existing.CreatedAt
	event.UpdatedAt = time.Now()
	m.events[existing.ID] = event

	for _, t := range tiers {
		if t.ID == "" {
			t.ID = uuid.New().String()
		}
		t.EventID = existing.ID
		t.UpdatedAt = time.Now()
		m.tiers[t.ID] = t
	}
	return nil
}

func (m *MemoryRepository) GetTier(ctx context.Context, id string) (*domain.TicketTier, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	t, ok := m.tiers[id]
	if !ok {
		return nil, domain.ErrTierNotFound
	}
	cp := *t
	return &cp, nil
}

func (m *MemoryRepository) GetTiersByEvent(ctx context.Context, eventID string) ([]*domain.TicketTier, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list := []*domain.TicketTier{}
	for _, t := range m.tiers {
		if t.EventID == eventID {
			cp := *t
			list = append(list, &cp)
		}
	}
	return list, nil
}

// CreateRSVPAtomic atomically decrements tier remaining capacity.
// Concurrency-safe: protected by m.mu.Lock().
func (m *MemoryRepository) CreateRSVPAtomic(ctx context.Context, rsvp *domain.RSVP) (*domain.RSVP, int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ukey := fmt.Sprintf("%s:%s", rsvp.EventID, rsvp.UserID)
	if _, exists := m.userRSVP[ukey]; exists {
		return nil, 0, domain.ErrAlreadyRSVPd
	}

	tier, ok := m.tiers[rsvp.TierID]
	if !ok {
		return nil, 0, domain.ErrTierNotFound
	}

	if tier.RemainingCapacity <= 0 {
		return nil, 0, domain.ErrSoldOut
	}

	tier.RemainingCapacity--
	tier.UpdatedAt = time.Now()

	if rsvp.ID == "" {
		rsvp.ID = uuid.New().String()
	}
	rsvp.Status = domain.RSVPStatusConfirmed
	rsvp.CreatedAt = time.Now()
	rsvp.UpdatedAt = time.Now()

	cp := *rsvp
	m.rsvps[rsvp.ID] = &cp
	m.userRSVP[ukey] = rsvp.ID

	return &cp, tier.RemainingCapacity, nil
}

func (m *MemoryRepository) CreateWaitlistEntry(ctx context.Context, rsvp *domain.RSVP) (*domain.WaitlistEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ukey := fmt.Sprintf("%s:%s", rsvp.EventID, rsvp.UserID)
	if _, exists := m.userRSVP[ukey]; exists {
		return nil, domain.ErrAlreadyRSVPd
	}

	if rsvp.ID == "" {
		rsvp.ID = uuid.New().String()
	}
	rsvp.Status = domain.RSVPStatusWaitlist
	rsvp.CreatedAt = time.Now()
	rsvp.UpdatedAt = time.Now()

	cp := *rsvp
	m.rsvps[rsvp.ID] = &cp
	m.userRSVP[ukey] = rsvp.ID

	maxPos := 0
	for _, w := range m.waitlist {
		if w.EventID == rsvp.EventID && w.TierID == rsvp.TierID && w.Position > maxPos {
			maxPos = w.Position
		}
	}

	entry := &domain.WaitlistEntry{
		ID:        uuid.New().String(),
		EventID:   rsvp.EventID,
		TierID:    rsvp.TierID,
		RSVPID:    rsvp.ID,
		UserID:    rsvp.UserID,
		Position:  maxPos + 1,
		Status:    domain.WaitlistStatusActive,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	m.waitlist[entry.ID] = entry
	return entry, nil
}

func (m *MemoryRepository) GetRSVP(ctx context.Context, id string) (*domain.RSVP, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	rsvp, ok := m.rsvps[id]
	if !ok {
		return nil, domain.ErrRSVPNotFound
	}
	cp := *rsvp
	return &cp, nil
}

func (m *MemoryRepository) GetRSVPByEventAndUser(ctx context.Context, eventID, userID string) (*domain.RSVP, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ukey := fmt.Sprintf("%s:%s", eventID, userID)
	rsvpID, ok := m.userRSVP[ukey]
	if !ok {
		return nil, domain.ErrRSVPNotFound
	}
	rsvp := m.rsvps[rsvpID]
	cp := *rsvp
	return &cp, nil
}

func (m *MemoryRepository) CancelRSVP(ctx context.Context, id string) (*domain.RSVP, string, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	rsvp, ok := m.rsvps[id]
	if !ok {
		return nil, "", false, domain.ErrRSVPNotFound
	}

	if rsvp.Status == domain.RSVPStatusCancelled {
		cp := *rsvp
		return &cp, rsvp.TierID, false, nil
	}

	wasConfirmed := rsvp.Status == domain.RSVPStatusConfirmed
	rsvp.Status = domain.RSVPStatusCancelled
	rsvp.UpdatedAt = time.Now()

	ukey := fmt.Sprintf("%s:%s", rsvp.EventID, rsvp.UserID)
	delete(m.userRSVP, ukey)

	if wasConfirmed {
		if tier, ok := m.tiers[rsvp.TierID]; ok {
			tier.RemainingCapacity++
			tier.UpdatedAt = time.Now()
		}
	} else {
		for _, w := range m.waitlist {
			if w.RSVPID == id {
				w.Status = domain.WaitlistStatusCancelled
				w.UpdatedAt = time.Now()
			}
		}
	}

	cp := *rsvp
	return &cp, rsvp.TierID, wasConfirmed, nil
}

func (m *MemoryRepository) PopNextWaitlist(ctx context.Context, eventID, tierID string) (*domain.WaitlistEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var active []*domain.WaitlistEntry
	for _, w := range m.waitlist {
		if w.EventID == eventID && w.TierID == tierID && w.Status == domain.WaitlistStatusActive {
			active = append(active, w)
		}
	}

	if len(active) == 0 {
		return nil, domain.ErrWaitlistEmpty
	}

	sort.Slice(active, func(i, j int) bool {
		return active[i].Position < active[j].Position
	})

	candidate := active[0]
	return candidate, nil
}

func (m *MemoryRepository) PromoteWaitlistEntry(ctx context.Context, entryID, rsvpID, tierID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	tier, ok := m.tiers[tierID]
	if !ok {
		return domain.ErrTierNotFound
	}

	if tier.RemainingCapacity <= 0 {
		return domain.ErrSoldOut
	}

	entry, ok := m.waitlist[entryID]
	if !ok {
		return domain.ErrWaitlistEmpty
	}

	rsvp, ok := m.rsvps[rsvpID]
	if !ok {
		return domain.ErrRSVPNotFound
	}

	tier.RemainingCapacity--
	entry.Status = domain.WaitlistStatusPromoted
	entry.UpdatedAt = time.Now()
	rsvp.Status = domain.RSVPStatusConfirmed
	rsvp.UpdatedAt = time.Now()

	ukey := fmt.Sprintf("%s:%s", rsvp.EventID, rsvp.UserID)
	m.userRSVP[ukey] = rsvp.ID

	return nil
}

func (m *MemoryRepository) GetEventCapacitySnapshot(ctx context.Context, eventID, tierID string) (*domain.EventCapacitySnapshot, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	tier, ok := m.tiers[tierID]
	if !ok {
		return nil, domain.ErrTierNotFound
	}

	confirmed := 0
	for _, r := range m.rsvps {
		if r.TierID == tierID && r.Status == domain.RSVPStatusConfirmed {
			confirmed++
		}
	}

	waitlisted := 0
	for _, w := range m.waitlist {
		if w.TierID == tierID && w.Status == domain.WaitlistStatusActive {
			waitlisted++
		}
	}

	return &domain.EventCapacitySnapshot{
		EventID:           eventID,
		TierID:            tierID,
		TotalCapacity:     tier.TotalCapacity,
		RemainingCapacity: tier.RemainingCapacity,
		ConfirmedCount:    confirmed,
		WaitlistCount:     waitlisted,
		IsSoldOut:         tier.RemainingCapacity <= 0,
	}, nil
}

func (m *MemoryRepository) CreateUser(ctx context.Context, user *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := strings.ToLower(user.Email)
	if _, exists := m.byEmail[key]; exists {
		return domain.ErrEmailTaken
	}
	cp := *user
	m.users[user.ID] = &cp
	m.byEmail[key] = user.ID
	if user.GoogleID != nil {
		m.byGoogle[*user.GoogleID] = user.ID
	}
	return nil
}

func (m *MemoryRepository) GetUserByGoogleID(ctx context.Context, googleID string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	id, ok := m.byGoogle[googleID]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	cp := *m.users[id]
	return &cp, nil
}

func (m *MemoryRepository) LinkGoogleID(ctx context.Context, userID, googleID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	u, ok := m.users[userID]
	if !ok {
		return domain.ErrUserNotFound
	}
	gid := googleID
	u.GoogleID = &gid
	m.byGoogle[googleID] = userID
	return nil
}

func (m *MemoryRepository) UpdateUserName(ctx context.Context, userID, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	u, ok := m.users[userID]
	if !ok {
		return domain.ErrUserNotFound
	}
	u.Name = name
	return nil
}

func (m *MemoryRepository) UpdateUserRole(ctx context.Context, userID string, role domain.UserRole) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	u, ok := m.users[userID]
	if !ok {
		return domain.ErrUserNotFound
	}
	u.Role = role
	return nil
}

func (m *MemoryRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	id, ok := m.byEmail[strings.ToLower(email)]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	cp := *m.users[id]
	return &cp, nil
}

func (m *MemoryRepository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	u, ok := m.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	cp := *u
	return &cp, nil
}

func (m *MemoryRepository) ListUsers(ctx context.Context) ([]*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	users := make([]*domain.User, 0, len(m.users))
	for _, u := range m.users {
		cp := *u
		users = append(users, &cp)
	}
	return users, nil
}

func (m *MemoryRepository) Close() error {
	return nil
}

var _ Repository = (*PostgresRepository)(nil)
var _ Repository = (*MemoryRepository)(nil)
