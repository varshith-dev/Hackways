package repository

import (
	"context"

	"github.com/eventflow/rsvp-core/internal/domain"
)

type Repository interface {
	GetEvent(ctx context.Context, id string) (*domain.Event, error)
	ListEvents(ctx context.Context) ([]*domain.Event, error)
	CreateEvent(ctx context.Context, event *domain.Event, tiers []*domain.TicketTier) error
	UpdateEvent(ctx context.Context, event *domain.Event, tiers []*domain.TicketTier) error
	GetTier(ctx context.Context, id string) (*domain.TicketTier, error)
	GetTiersByEvent(ctx context.Context, eventID string) ([]*domain.TicketTier, error)

	// CreateRSVPAtomic attempts to atomically decrement remaining_capacity on the tier.
	// If remaining_capacity == 0, returns domain.ErrSoldOut without inserting —
	// unless force is true (paid tiers only: the payment is already captured
	// by the time this is called, so capacity is clamped at 0 instead of
	// rejecting, trading a rare oversold seat for never waitlisting someone
	// who already paid).
	// If user already RSVP'd, returns domain.ErrAlreadyRSVPd.
	CreateRSVPAtomic(ctx context.Context, rsvp *domain.RSVP, force bool) (*domain.RSVP, int, error)

	// CreateWaitlistEntry creates a waitlisted RSVP and assigns the next FIFO position.
	CreateWaitlistEntry(ctx context.Context, rsvp *domain.RSVP) (*domain.WaitlistEntry, error)

	GetRSVP(ctx context.Context, id string) (*domain.RSVP, error)
	GetRSVPByEventAndUser(ctx context.Context, eventID, userID string) (*domain.RSVP, error)
	CancelRSVP(ctx context.Context, id string) (*domain.RSVP, string, bool, error)

	// PopNextWaitlist claims the next waitlisted user using SELECT ... FOR UPDATE SKIP LOCKED
	PopNextWaitlist(ctx context.Context, eventID, tierID string) (*domain.WaitlistEntry, error)

	// PromoteWaitlistEntry updates waitlist status to PROMOTED and RSVP status to CONFIRMED
	PromoteWaitlistEntry(ctx context.Context, entryID, rsvpID, tierID string) error

	GetEventCapacitySnapshot(ctx context.Context, eventID, tierID string) (*domain.EventCapacitySnapshot, error)

	// CreateUser inserts a new account. Returns domain.ErrEmailTaken if the email is already registered.
	CreateUser(ctx context.Context, user *domain.User) error
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, id string) (*domain.User, error)
	GetUserByGoogleID(ctx context.Context, googleID string) (*domain.User, error)
	LinkGoogleID(ctx context.Context, userID, googleID string) error
	UpdateUserName(ctx context.Context, userID, name string) error
	UpdateUserRole(ctx context.Context, userID string, role domain.UserRole) error
	ListUsers(ctx context.Context) ([]*domain.User, error)

	Close() error
}
