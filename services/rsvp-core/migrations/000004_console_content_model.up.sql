-- Hackways Database Schema Migration: 000004_console_content_model.up.sql
-- Extends the ticketing-core schema (000001) with everything apps/web and
-- apps/console actually need beyond the reservation hot path — the fields
-- and entities that today only exist in the per-app JSON flat file
-- (.server_data/platform_store.json). Additive and idempotent, like every
-- migration before it: safe to run against the live database as-is.
--
-- NOT applied automatically — see DEPLOYMENT.md's migration process
-- (docker exec -i eventflow-postgres psql -U postgres -d eventflow < this file).
-- NOT yet read or written by any application code; see the Phase 2 plan for
-- the serverStore.ts cutover this is a prerequisite for.

-- ============================================================
-- Events: the console's content model, beyond the ticketing core
-- ============================================================
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(32) NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    ADD COLUMN IF NOT EXISTS page_theme VARCHAR(32) NOT NULL DEFAULT 'auto',
    ADD COLUMN IF NOT EXISTS media_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS partners JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS channel_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64),
    ADD COLUMN IF NOT EXISTS team_registration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS team_min_size INTEGER,
    ADD COLUMN IF NOT EXISTS team_max_size INTEGER,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

ALTER TABLE events ALTER COLUMN channel_id TYPE VARCHAR(64) USING channel_id::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON events (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events (organizer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_channel ON events (channel_id) WHERE channel_id IS NOT NULL;

-- Ticket tiers: the approval workflow the console UI already exposes
ALTER TABLE ticket_tiers
    ADD COLUMN IF NOT EXISTS approval_mode VARCHAR(32) NOT NULL DEFAULT 'AUTO_APPROVE' CHECK (approval_mode IN ('AUTO_APPROVE', 'REQUIRES_APPROVAL'));

-- ============================================================
-- RSVPs become the attendee record: ticket code, check-in, VIP/speaker
-- flags, and custom-question answers all live on the reservation itself
-- rather than a parallel "attendees" table for the same person.
-- ============================================================
ALTER TABLE rsvps
    ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checked_in_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS entrance VARCHAR(64),
    ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_speaker BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS team_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_ticket_code ON rsvps (ticket_code) WHERE ticket_code IS NOT NULL;

-- 000001's status CHECK only covers the ticketing-reservation states Go
-- itself ever sets (CONFIRMED/WAITLIST/PENDING_CONFIRMATION/CANCELLED).
-- apps/web's StoredAttendee layers console-side lifecycle states on top of
-- the same row (CHECKED_IN, REFUNDED, PENDING_APPROVAL, REJECTED) — widen
-- the constraint to accept the full superset; Go's own code path never
-- writes the new values, so this only adds permissions, never removes any.
-- ASSUMES the default Postgres-assigned constraint name from an unnamed
-- inline CHECK on migration 000001 (tablename_columnname_check) — verify
-- this name matches before applying (\d rsvps in psql) if 000001 ever
-- changes.
ALTER TABLE rsvps DROP CONSTRAINT IF EXISTS rsvps_status_check;
ALTER TABLE rsvps ADD CONSTRAINT rsvps_status_check CHECK (
    status IN ('CONFIRMED', 'WAITLIST', 'PENDING_CONFIRMATION', 'CHECKED_IN', 'REFUNDED', 'PENDING_APPROVAL', 'REJECTED', 'CANCELLED')
);

-- ============================================================
-- Orders: the payment/checkout record, distinct from the reservation
-- itself (one RSVP can exist without ever needing a paid order).
-- ============================================================
-- status is a superset: StoredOrder's own type (apps/web/src/lib/api.ts) only
-- declares CONFIRMED/REFUNDED/DISPUTED, but orders/route.ts actually writes
-- "COMPLETED" as its default — a pre-existing mismatch in the real code, not
-- introduced here. Accepting both rather than rejecting what the app sends.
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    ticket_code VARCHAR(64),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_name VARCHAR(255),
    rsvp_id UUID REFERENCES rsvps(id) ON DELETE SET NULL,
    tier_id UUID REFERENCES ticket_tiers(id) ON DELETE SET NULL,
    tier_name VARCHAR(255),
    buyer_name VARCHAR(255),
    buyer_email VARCHAR(255),
    amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'REFUNDED', 'DISPUTED', 'FAILED')),
    payment_method VARCHAR(64),
    razorpay_payment_id VARCHAR(255),
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_event ON orders (event_id, created_at DESC);

-- ============================================================
-- Teams: team registration, referenced back from rsvps.team_id above.
-- ============================================================
-- members (TeamMember[] in the JSON store) aren't duplicated here — they're
-- the rsvps already linked via rsvps.team_id above, queried back by team_id
-- rather than stored twice.
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL,
    leader_name VARCHAR(255),
    leader_email VARCHAR(255),
    min_size INTEGER,
    max_size INTEGER,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULL', 'LOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_event_code UNIQUE (event_id, code)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_rsvps_team'
    ) THEN
        ALTER TABLE rsvps ADD CONSTRAINT fk_rsvps_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- Channels: communities/organizer pages. No Postgres representation
-- existed before this migration.
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(128) NOT NULL,
    owner_name VARCHAR(255),
    avatar_url TEXT,
    banner_url TEXT,
    follower_count INTEGER NOT NULL DEFAULT 0,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    visibility VARCHAR(32) NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ChannelRole (types.ts) is lowercase: 'owner' | 'admin' | 'host'.
CREATE TABLE IF NOT EXISTS channel_members (
    channel_id VARCHAR(64) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'host' CHECK (role IN ('owner', 'admin', 'host')),
    avatar_url TEXT,
    assigned_event_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_channel'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT fk_events_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- Event staff: the real, indexable replacement for the host_users JSON
-- blob apps/{web,console} currently keep inline on each event. Organizer
-- is still tracked on events.organizer_id; this is co-hosts and granted
-- staff (CO_HOST / CHECKIN_STAFF / FINANCE_VIEWER), checked by
-- lib/tenantAccess.ts's assertEventAccess() once this table is live.
-- ============================================================
CREATE TABLE IF NOT EXISTS event_staff (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'CO_HOST' CHECK (role IN ('CO_HOST', 'CHECKIN_STAFF', 'FINANCE_VIEWER')),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_user ON event_staff (user_id, event_id);
