-- EventFlow Database Schema Migration: 000001_init_schema.up.sql
-- Concurrency-critical capacity accounting and idempotency tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    organizer_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED')),
    rsvp_deadline TIMESTAMPTZ,
    total_capacity INTEGER NOT NULL CHECK (total_capacity >= 0),
    banner_url TEXT,
    square_banner_url TEXT,
    location VARCHAR(255),
    category VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Tiers Table
-- Capacity accounting: remaining_capacity has a strict non-negative check constraint
CREATE TABLE IF NOT EXISTS ticket_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    total_capacity INTEGER NOT NULL CHECK (total_capacity >= 0),
    remaining_capacity INTEGER NOT NULL CHECK (remaining_capacity >= 0),
    price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RSVPs Table
-- UNIQUE(event_id, user_id) ensures no user can book multiple confirmed/waitlisted spots on the same event
CREATE TABLE IF NOT EXISTS rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
    user_id VARCHAR(128) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'WAITLIST', 'PENDING_CONFIRMATION', 'CANCELLED')),
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_user UNIQUE (event_id, user_id)
);

-- Waitlist Entries Table
-- Ordered by position ASC / created_at for deterministic FIFO waitlist promotion
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
    rsvp_id UUID NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PROMOTED', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency Records Table (Persisted backup if cache evicts)
CREATE TABLE IF NOT EXISTS idempotency_records (
    key VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- High-concurrency indices
CREATE INDEX IF NOT EXISTS idx_rsvps_event_status ON rsvps(event_id, status);
CREATE INDEX IF NOT EXISTS idx_rsvps_idempotency ON rsvps(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_waitlist_event_status_pos ON waitlist_entries(event_id, status, position ASC);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON ticket_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records(expires_at);
