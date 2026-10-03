package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/eventflow/rsvp-core/internal/config"
	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(ctx context.Context, cfg *config.Config) (*PostgresRepository, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config: %w", err)
	}

	// High-throughput connection pool tuning
	poolConfig.MaxConns = int32(cfg.DBMaxOpenConns)
	poolConfig.MinConns = int32(cfg.DBMaxIdleConns)
	poolConfig.MaxConnLifetime = cfg.DBConnMaxLifetime
	poolConfig.MaxConnIdleTime = 1 * time.Minute
	poolConfig.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgxpool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	return &PostgresRepository{pool: pool}, nil
}

func (r *PostgresRepository) GetEvent(ctx context.Context, idOrSlug string) (*domain.Event, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, COALESCE(slug, ''), title, description, organizer_id, status, rsvp_deadline,
		       start_time, end_time, COALESCE(time_display, ''), COALESCE(timezone, ''), COALESCE(is_virtual, false), COALESCE(meeting_url, ''),
		       total_capacity,
		       COALESCE(banner_url, ''), COALESCE(square_banner_url, ''), COALESCE(location, ''), COALESCE(category, ''),
		       created_at, updated_at
		FROM events WHERE id::text = $1 OR slug = $1`, idOrSlug)

	var ev domain.Event
	err := row.Scan(&ev.ID, &ev.Slug, &ev.Title, &ev.Description, &ev.OrganizerID, &ev.Status, &ev.RSVPDeadline,
		&ev.StartTime, &ev.EndTime, &ev.TimeDisplay, &ev.Timezone, &ev.IsVirtual, &ev.MeetingURL,
		&ev.TotalCapacity,
		&ev.BannerURL, &ev.SquareBannerURL, &ev.Location, &ev.Category, &ev.CreatedAt, &ev.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrEventNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ev, nil
}

func (r *PostgresRepository) ListEvents(ctx context.Context) ([]*domain.Event, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, COALESCE(slug, ''), title, description, organizer_id, status, rsvp_deadline,
		       start_time, end_time, COALESCE(time_display, ''), COALESCE(timezone, ''), COALESCE(is_virtual, false), COALESCE(meeting_url, ''),
		       total_capacity,
		       COALESCE(banner_url, ''), COALESCE(square_banner_url, ''), COALESCE(location, ''), COALESCE(category, ''),
		       created_at, updated_at
		FROM events ORDER BY created_at DESC LIMIT 50`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*domain.Event
	for rows.Next() {
		var ev domain.Event
		if err := rows.Scan(&ev.ID, &ev.Slug, &ev.Title, &ev.Description, &ev.OrganizerID, &ev.Status, &ev.RSVPDeadline,
			&ev.StartTime, &ev.EndTime, &ev.TimeDisplay, &ev.Timezone, &ev.IsVirtual, &ev.MeetingURL,
			&ev.TotalCapacity,
			&ev.BannerURL, &ev.SquareBannerURL, &ev.Location, &ev.Category, &ev.CreatedAt, &ev.UpdatedAt); err != nil {
			return nil, err
		}
		events = append(events, &ev)
	}
	return events, nil
}

func (r *PostgresRepository) CreateEvent(ctx context.Context, event *domain.Event, tiers []*domain.TicketTier) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Slug == "" {
		event.Slug = event.ID
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO events (id, slug, title, description, organizer_id, status, rsvp_deadline,
		                    start_time, end_time, time_display, timezone, is_virtual, meeting_url,
		                    total_capacity, banner_url, square_banner_url, location, category, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())`,
		event.ID, event.Slug, event.Title, event.Description, event.OrganizerID, event.Status, event.RSVPDeadline,
		event.StartTime, event.EndTime, event.TimeDisplay, event.Timezone, event.IsVirtual, event.MeetingURL,
		event.TotalCapacity, event.BannerURL, event.SquareBannerURL, event.Location, event.Category)
	if err != nil {
		return err
	}

	for _, t := range tiers {
		if t.ID == "" {
			t.ID = uuid.New().String()
		}
		t.EventID = event.ID
		t.RemainingCapacity = t.TotalCapacity
		_, err = tx.Exec(ctx, `
			INSERT INTO ticket_tiers (id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
			t.ID, t.EventID, t.Name, t.TotalCapacity, t.RemainingCapacity, t.PriceCents)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) UpdateEvent(ctx context.Context, event *domain.Event, tiers []*domain.TicketTier) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE events SET
			slug = COALESCE(NULLIF($2, ''), slug),
			title = $3,
			description = $4,
			status = $5,
			rsvp_deadline = $6,
			start_time = $7,
			end_time = $8,
			time_display = $9,
			timezone = $10,
			is_virtual = $11,
			meeting_url = $12,
			total_capacity = $13,
			banner_url = $14,
			square_banner_url = $15,
			location = $16,
			category = $17,
			updated_at = NOW()
		WHERE id::text = $1 OR slug = $1`,
		event.ID, event.Slug, event.Title, event.Description, event.Status, event.RSVPDeadline,
		event.StartTime, event.EndTime, event.TimeDisplay, event.Timezone, event.IsVirtual, event.MeetingURL,
		event.TotalCapacity, event.BannerURL, event.SquareBannerURL, event.Location, event.Category)
	if err != nil {
		return err
	}

	if len(tiers) > 0 {
		for _, t := range tiers {
			if t.ID == "" {
				t.ID = uuid.New().String()
			}
			t.EventID = event.ID
			_, err = tx.Exec(ctx, `
				INSERT INTO ticket_tiers (id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
				ON CONFLICT (id) DO UPDATE SET
					name = EXCLUDED.name,
					total_capacity = EXCLUDED.total_capacity,
					remaining_capacity = EXCLUDED.remaining_capacity,
					price_cents = EXCLUDED.price_cents,
					updated_at = NOW()`,
				t.ID, t.EventID, t.Name, t.TotalCapacity, t.RemainingCapacity, t.PriceCents)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) GetTier(ctx context.Context, id string) (*domain.TicketTier, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at
		FROM ticket_tiers WHERE id = $1`, id)

	var t domain.TicketTier
	err := row.Scan(&t.ID, &t.EventID, &t.Name, &t.TotalCapacity, &t.RemainingCapacity, &t.PriceCents, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrTierNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PostgresRepository) GetTiersByEvent(ctx context.Context, eventID string) ([]*domain.TicketTier, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at
		FROM ticket_tiers WHERE event_id = $1 ORDER BY created_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// A plain `var tiers []*domain.TicketTier` stays nil for a tierless
	// (free) event — nil marshals to JSON null, not [], which took down
	// every page listing events once a free event with no tiers existed.
	tiers := []*domain.TicketTier{}
	for rows.Next() {
		var t domain.TicketTier
		if err := rows.Scan(&t.ID, &t.EventID, &t.Name, &t.TotalCapacity, &t.RemainingCapacity, &t.PriceCents, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tiers = append(tiers, &t)
	}
	return tiers, nil
}

// CreateRSVPAtomic solves the "last seat" race condition in PostgreSQL ACID.
// 1. Attempts conditional decrement: UPDATE ticket_tiers SET remaining_capacity = remaining_capacity - 1 WHERE id = $1 AND remaining_capacity > 0 RETURNING remaining_capacity;
// 2. If 0 rows returned, tier is sold out.
// 3. Inserts RSVP record with UNIQUE(event_id, user_id) constraint.
func (r *PostgresRepository) CreateRSVPAtomic(ctx context.Context, rsvp *domain.RSVP) (*domain.RSVP, int, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)

	var newRemaining int
	err = tx.QueryRow(ctx, `
		UPDATE ticket_tiers
		SET remaining_capacity = remaining_capacity - 1,
		    updated_at = NOW()
		WHERE id = $1 AND remaining_capacity > 0
		RETURNING remaining_capacity`, rsvp.TierID).Scan(&newRemaining)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, 0, domain.ErrSoldOut
	}
	if err != nil {
		return nil, 0, err
	}

	if rsvp.ID == "" {
		rsvp.ID = uuid.New().String()
	}
	rsvp.Status = domain.RSVPStatusConfirmed
	rsvp.CreatedAt = time.Now()
	rsvp.UpdatedAt = time.Now()

	_, err = tx.Exec(ctx, `
		INSERT INTO rsvps (id, event_id, tier_id, user_id, user_email, user_name, status, idempotency_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		rsvp.ID, rsvp.EventID, rsvp.TierID, rsvp.UserID, rsvp.UserEmail, rsvp.UserName, rsvp.Status, rsvp.IdempotencyKey, rsvp.CreatedAt, rsvp.UpdatedAt)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			return nil, 0, domain.ErrAlreadyRSVPd
		}
		return nil, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, 0, err
	}

	return rsvp, newRemaining, nil
}

func (r *PostgresRepository) CreateWaitlistEntry(ctx context.Context, rsvp *domain.RSVP) (*domain.WaitlistEntry, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if rsvp.ID == "" {
		rsvp.ID = uuid.New().String()
	}
	rsvp.Status = domain.RSVPStatusWaitlist
	rsvp.CreatedAt = time.Now()
	rsvp.UpdatedAt = time.Now()

	_, err = tx.Exec(ctx, `
		INSERT INTO rsvps (id, event_id, tier_id, user_id, user_email, user_name, status, idempotency_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		rsvp.ID, rsvp.EventID, rsvp.TierID, rsvp.UserID, rsvp.UserEmail, rsvp.UserName, rsvp.Status, rsvp.IdempotencyKey, rsvp.CreatedAt, rsvp.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domain.ErrAlreadyRSVPd
		}
		return nil, err
	}

	var nextPos int
	row := tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(position), 0) + 1 FROM waitlist_entries WHERE event_id = $1 AND tier_id = $2`,
		rsvp.EventID, rsvp.TierID)
	if err := row.Scan(&nextPos); err != nil {
		return nil, err
	}

	entry := &domain.WaitlistEntry{
		ID:        uuid.New().String(),
		EventID:   rsvp.EventID,
		TierID:    rsvp.TierID,
		RSVPID:    rsvp.ID,
		UserID:    rsvp.UserID,
		Position:  nextPos,
		Status:    domain.WaitlistStatusActive,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO waitlist_entries (id, event_id, tier_id, rsvp_id, user_id, position, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		entry.ID, entry.EventID, entry.TierID, entry.RSVPID, entry.UserID, entry.Position, entry.Status, entry.CreatedAt, entry.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return entry, nil
}

func (r *PostgresRepository) GetRSVP(ctx context.Context, id string) (*domain.RSVP, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, event_id, tier_id, user_id, user_email, user_name, status, COALESCE(idempotency_key, ''), created_at, updated_at
		FROM rsvps WHERE id = $1`, id)

	var rsvp domain.RSVP
	err := row.Scan(&rsvp.ID, &rsvp.EventID, &rsvp.TierID, &rsvp.UserID, &rsvp.UserEmail, &rsvp.UserName, &rsvp.Status, &rsvp.IdempotencyKey, &rsvp.CreatedAt, &rsvp.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrRSVPNotFound
	}
	if err != nil {
		return nil, err
	}
	return &rsvp, nil
}

func (r *PostgresRepository) GetRSVPByEventAndUser(ctx context.Context, eventID, userID string) (*domain.RSVP, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, event_id, tier_id, user_id, user_email, user_name, status, COALESCE(idempotency_key, ''), created_at, updated_at
		FROM rsvps WHERE event_id = $1 AND user_id = $2`, eventID, userID)

	var rsvp domain.RSVP
	err := row.Scan(&rsvp.ID, &rsvp.EventID, &rsvp.TierID, &rsvp.UserID, &rsvp.UserEmail, &rsvp.UserName, &rsvp.Status, &rsvp.IdempotencyKey, &rsvp.CreatedAt, &rsvp.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrRSVPNotFound
	}
	if err != nil {
		return nil, err
	}
	return &rsvp, nil
}

func (r *PostgresRepository) CancelRSVP(ctx context.Context, id string) (*domain.RSVP, string, bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, "", false, err
	}
	defer tx.Rollback(ctx)

	var rsvp domain.RSVP
	row := tx.QueryRow(ctx, `
		SELECT id, event_id, tier_id, user_id, user_email, user_name, status, COALESCE(idempotency_key, ''), created_at, updated_at
		FROM rsvps WHERE id = $1 FOR UPDATE`, id)
	err = row.Scan(&rsvp.ID, &rsvp.EventID, &rsvp.TierID, &rsvp.UserID, &rsvp.UserEmail, &rsvp.UserName, &rsvp.Status, &rsvp.IdempotencyKey, &rsvp.CreatedAt, &rsvp.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", false, domain.ErrRSVPNotFound
	}
	if err != nil {
		return nil, "", false, err
	}

	if rsvp.Status == domain.RSVPStatusCancelled {
		return &rsvp, rsvp.TierID, false, nil
	}

	wasConfirmed := rsvp.Status == domain.RSVPStatusConfirmed
	rsvp.Status = domain.RSVPStatusCancelled
	rsvp.UpdatedAt = time.Now()

	_, err = tx.Exec(ctx, `UPDATE rsvps SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, id)
	if err != nil {
		return nil, "", false, err
	}

	// If it was confirmed, capacity is freed
	if wasConfirmed {
		_, err = tx.Exec(ctx, `UPDATE ticket_tiers SET remaining_capacity = remaining_capacity + 1, updated_at = NOW() WHERE id = $1`, rsvp.TierID)
		if err != nil {
			return nil, "", false, err
		}
	} else {
		// If waitlisted, cancel waitlist entry
		_, _ = tx.Exec(ctx, `UPDATE waitlist_entries SET status = 'CANCELLED', updated_at = NOW() WHERE rsvp_id = $1`, id)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, "", false, err
	}

	return &rsvp, rsvp.TierID, wasConfirmed, nil
}

// PopNextWaitlist grabs the oldest active waitlist entry using FOR UPDATE SKIP LOCKED
// to prevent lock contention among multiple worker pool goroutines.
func (r *PostgresRepository) PopNextWaitlist(ctx context.Context, eventID, tierID string) (*domain.WaitlistEntry, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, event_id, tier_id, rsvp_id, user_id, position, status, created_at, updated_at
		FROM waitlist_entries
		WHERE event_id = $1 AND tier_id = $2 AND status = 'ACTIVE'
		ORDER BY position ASC
		LIMIT 1
		FOR UPDATE SKIP LOCKED`, eventID, tierID)

	var entry domain.WaitlistEntry
	err := row.Scan(&entry.ID, &entry.EventID, &entry.TierID, &entry.RSVPID, &entry.UserID, &entry.Position, &entry.Status, &entry.CreatedAt, &entry.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrWaitlistEmpty
	}
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *PostgresRepository) PromoteWaitlistEntry(ctx context.Context, entryID, rsvpID, tierID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Consume the freed seat atomically
	res, err := tx.Exec(ctx, `
		UPDATE ticket_tiers
		SET remaining_capacity = remaining_capacity - 1, updated_at = NOW()
		WHERE id = $1 AND remaining_capacity > 0`, tierID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrSoldOut
	}

	_, err = tx.Exec(ctx, `UPDATE waitlist_entries SET status = 'PROMOTED', updated_at = NOW() WHERE id = $1`, entryID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `UPDATE rsvps SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`, rsvpID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) GetEventCapacitySnapshot(ctx context.Context, eventID, tierID string) (*domain.EventCapacitySnapshot, error) {
	tier, err := r.GetTier(ctx, tierID)
	if err != nil {
		return nil, err
	}

	var confirmedCount, waitlistCount int
	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM rsvps WHERE tier_id = $1 AND status = 'CONFIRMED'`, tierID).Scan(&confirmedCount)
	if err != nil {
		return nil, err
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM waitlist_entries WHERE tier_id = $1 AND status = 'ACTIVE'`, tierID).Scan(&waitlistCount)
	if err != nil {
		return nil, err
	}

	return &domain.EventCapacitySnapshot{
		EventID:           eventID,
		TierID:            tierID,
		TotalCapacity:     tier.TotalCapacity,
		RemainingCapacity: tier.RemainingCapacity,
		ConfirmedCount:    confirmedCount,
		WaitlistCount:     waitlistCount,
		IsSoldOut:         tier.RemainingCapacity <= 0,
	}, nil
}

func (r *PostgresRepository) CreateUser(ctx context.Context, user *domain.User) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO users (id, email, name, password_hash, google_id, role, created_at)
		VALUES ($1, LOWER($2), $3, $4, $5, $6, $7)`,
		user.ID, user.Email, user.Name, user.PasswordHash, user.GoogleID, user.Role, user.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrEmailTaken
		}
		return err
	}
	return nil
}

func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, email, name, password_hash, google_id, role, created_at FROM users WHERE email = LOWER($1)`, email)

	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.GoogleID, &u.Role, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresRepository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, email, name, password_hash, google_id, role, created_at FROM users WHERE id = $1`, id)

	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.GoogleID, &u.Role, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresRepository) GetUserByGoogleID(ctx context.Context, googleID string) (*domain.User, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, email, name, password_hash, google_id, role, created_at FROM users WHERE google_id = $1`, googleID)

	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.GoogleID, &u.Role, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// LinkGoogleID attaches a Google account to an existing password account that
// signed in with Google for the first time, matched by email.
func (r *PostgresRepository) LinkGoogleID(ctx context.Context, userID, googleID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET google_id = $1 WHERE id = $2`, googleID, userID)
	return err
}

func (r *PostgresRepository) UpdateUserName(ctx context.Context, userID, name string) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET name = $1 WHERE id = $2`, name, userID)
	return err
}

func (r *PostgresRepository) UpdateUserRole(ctx context.Context, userID string, role domain.UserRole) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET role = $1 WHERE id = $2`, role, userID)
	return err
}

func (r *PostgresRepository) ListUsers(ctx context.Context) ([]*domain.User, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, email, name, password_hash, google_id, role, created_at FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list users query: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		var u domain.User
		var googleID *string
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &googleID, &u.Role, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		u.GoogleID = googleID
		users = append(users, &u)
	}
	return users, nil
}

func (r *PostgresRepository) Close() error {
	r.pool.Close()
	return nil
}
