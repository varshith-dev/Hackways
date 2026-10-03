-- Hackways Database Schema Migration: 000005_user_profile_and_system_tables.up.sql
-- The console's admin-facing user record (status/verification/notes/comms),
-- platform settings, short links, and device telemetry — none of which have
-- a Postgres home today. Additive and idempotent, like every migration
-- before it. NOT applied automatically; NOT yet read or written by any
-- application code — see the Phase 2 plan.

-- ============================================================
-- Users: extend the real auth row (000002) with the console's admin-facing
-- profile fields, rather than a separate "user_profiles" table for the same
-- person — these are all optional/nullable so existing INSERTs are unaffected.
-- ============================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(64),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS avatar TEXT,
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
        CHECK (account_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'NEW', 'DELETED')),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'PENDING', 'REJECTED')),
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS communications JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username)) WHERE username IS NOT NULL;

-- ============================================================
-- Platform settings: a single global row (module access matrix, platform
-- fee, payment gateway config) — enforced to exactly one row via a
-- constant-expression unique index, matching the JSON store's "one object"
-- shape.
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    module_access JSONB NOT NULL DEFAULT '{}'::jsonb,
    platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 4,
    payment_gateways JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(255)
);

-- ============================================================
-- Short links: marketing/tracking redirects, with click counters. Scope is
-- PLATFORM (no event) or EVENT (tied to one) — matches ShortLinkTracker in
-- apps/web/src/lib/types.ts exactly, including its full utm_* set.
-- ============================================================
CREATE TABLE IF NOT EXISTS short_links (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255),
    destination_url TEXT NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'PLATFORM' CHECK (scope IN ('PLATFORM', 'EVENT')),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    utm_source VARCHAR(128),
    utm_medium VARCHAR(128),
    utm_campaign VARCHAR(128),
    utm_term VARCHAR(128),
    utm_content VARCHAR(128),
    clicks INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON short_links (LOWER(code));

-- ============================================================
-- Device telemetry: high-volume, low-stakes analytics pageview events.
-- The JSON store already caps this at the most recent 50,000 — mirrored
-- here as a rolling table rather than an unbounded one. A real retention
-- job (DELETE WHERE created_at < now() - interval) is a later concern,
-- not blocking this migration. Matches DeviceTelemetryEvent exactly.
-- ============================================================
CREATE TABLE IF NOT EXISTS telemetry_events (
    id VARCHAR(64) PRIMARY KEY,
    visitor_id VARCHAR(128),
    session_id VARCHAR(128),
    pathname TEXT,
    referrer TEXT,
    device VARCHAR(32),
    browser VARCHAR(64),
    os VARCHAR(64),
    screen_resolution VARCHAR(32),
    viewport_size VARCHAR(32),
    timezone VARCHAR(64),
    language VARCHAR(16),
    utm_source VARCHAR(128),
    utm_medium VARCHAR(128),
    utm_campaign VARCHAR(128),
    utm_term VARCHAR(128),
    utm_content VARCHAR(128),
    short_link_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events (created_at DESC);
