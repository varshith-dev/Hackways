package domain

import (
	"errors"
	"time"
)

var (
	ErrSoldOut            = errors.New("ticket tier is sold out")
	ErrAlreadyRSVPd       = errors.New("user has already submitted an RSVP for this event")
	ErrDeadlinePassed     = errors.New("rsvp deadline has passed")
	ErrEventNotFound      = errors.New("event not found")
	ErrTierNotFound       = errors.New("ticket tier not found")
	ErrRSVPNotFound       = errors.New("rsvp not found")
	ErrWaitlistEmpty      = errors.New("no waitlisted attendees available")
	ErrRateLimitExceeded  = errors.New("rate limit exceeded, please retry shortly")
	ErrConcurrentConflict = errors.New("concurrency conflict during capacity reservation")
	ErrEmailTaken         = errors.New("an account with this email already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid email or password")
)

type UserRole string

const (
	RoleAttendee  UserRole = "attendee"
	RoleOrganizer UserRole = "organizer"
	RoleAdmin     UserRole = "admin"
)

// User is an authenticated account. PasswordHash is never serialized to JSON.
// GoogleID is nil for password-only accounts.
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	GoogleID     *string   `json:"-"`
	Role         UserRole  `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type EventStatus string

const (
	EventStatusDraft     EventStatus = "DRAFT"
	EventStatusPublished EventStatus = "PUBLISHED"
	EventStatusSoldOut   EventStatus = "SOLD_OUT"
	EventStatusCancelled EventStatus = "CANCELLED"
)

type RSVPStatus string

const (
	RSVPStatusConfirmed           RSVPStatus = "CONFIRMED"
	RSVPStatusWaitlist            RSVPStatus = "WAITLIST"
	RSVPStatusPendingConfirmation RSVPStatus = "PENDING_CONFIRMATION"
	RSVPStatusCancelled           RSVPStatus = "CANCELLED"
)

type WaitlistStatus string

const (
	WaitlistStatusActive    WaitlistStatus = "ACTIVE"
	WaitlistStatusPromoted  WaitlistStatus = "PROMOTED"
	WaitlistStatusExpired   WaitlistStatus = "EXPIRED"
	WaitlistStatusCancelled WaitlistStatus = "CANCELLED"
)

type Event struct {
	ID              string      `json:"id"`
	Slug            string      `json:"slug,omitempty"`
	Title           string      `json:"title"`
	Description     string      `json:"description"`
	OrganizerID     string      `json:"organizer_id"`
	Status          EventStatus `json:"status"`
	RSVPDeadline    *time.Time  `json:"rsvp_deadline,omitempty"`
	StartTime       *time.Time  `json:"start_time,omitempty"`
	EndTime         *time.Time  `json:"end_time,omitempty"`
	TimeDisplay     string      `json:"time_display,omitempty"`
	Timezone        string      `json:"timezone,omitempty"`
	IsVirtual       bool        `json:"is_virtual,omitempty"`
	MeetingURL      string      `json:"meeting_url,omitempty"`
	TotalCapacity   int         `json:"total_capacity"`
	BannerURL       string      `json:"banner_url,omitempty"`        // 16:9 Landscape Banner
	SquareBannerURL string      `json:"square_banner_url,omitempty"` // 1:1 Square Banner
	Location        string      `json:"location,omitempty"`
	Category        string      `json:"category,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

type TicketTier struct {
	ID                string    `json:"id"`
	EventID           string    `json:"event_id"`
	Name              string    `json:"name"`
	TotalCapacity     int       `json:"total_capacity"`
	RemainingCapacity int       `json:"remaining_capacity"`
	PriceCents        int       `json:"price_cents"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type RSVP struct {
	ID             string     `json:"id"`
	EventID        string     `json:"event_id"`
	TierID         string     `json:"tier_id"`
	UserID         string     `json:"user_id"`
	UserEmail      string     `json:"user_email"`
	UserName       string     `json:"user_name"`
	Status         RSVPStatus `json:"status"`
	IdempotencyKey string     `json:"idempotency_key,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type WaitlistEntry struct {
	ID        string         `json:"id"`
	EventID   string         `json:"event_id"`
	TierID    string         `json:"tier_id"`
	RSVPID    string         `json:"rsvp_id"`
	UserID    string         `json:"user_id"`
	Position  int            `json:"position"`
	Status    WaitlistStatus `json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type EventCapacitySnapshot struct {
	EventID           string `json:"event_id"`
	TierID            string `json:"tier_id"`
	TotalCapacity     int    `json:"total_capacity"`
	RemainingCapacity int    `json:"remaining_capacity"`
	ConfirmedCount    int    `json:"confirmed_count"`
	WaitlistCount     int    `json:"waitlist_count"`
	IsSoldOut         bool   `json:"is_sold_out"`
}

type CreateRSVPRequest struct {
	EventID        string `json:"event_id"`
	TierID         string `json:"tier_id"`
	UserID         string `json:"user_id"`
	UserEmail      string `json:"user_email"`
	UserName       string `json:"user_name"`
	IdempotencyKey string `json:"idempotency_key"`
}

type RSVPResponse struct {
	RSVP             *RSVP  `json:"rsvp"`
	WaitlistPosition int    `json:"waitlist_position,omitempty"`
	Message          string `json:"message"`
	Cached           bool   `json:"cached,omitempty"`
}
