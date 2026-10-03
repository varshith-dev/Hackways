-- Hackways Database Schema Migration: 000006_pg_foundation_standards.up.sql
-- Integrates foundational PostgreSQL extensions, citext case-insensitivity,
-- trigram fuzzy search indexes, and append-only audit ledger table.

-- ============================================================
-- 1. PostgreSQL Foundational Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- 2. Case-Insensitive citext Conversion
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email' AND data_type != 'USER-DEFINED'
    ) THEN
        ALTER TABLE users ALTER COLUMN email TYPE citext;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username' AND data_type != 'USER-DEFINED'
    ) THEN
        ALTER TABLE users ALTER COLUMN username TYPE citext;
    END IF;
END $$;

-- ============================================================
-- 3. Trigram Fuzzy Search GIN Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_channels_name_trgm ON channels USING gin (name gin_trgm_ops);

-- ============================================================
-- 4. Append-Only Audit Ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,   -- 'order' | 'rsvp' | 'ticket_tier' | 'payout'
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,        -- 'payment_captured' | 'refunded' | 'checked_in' | 'fee_deducted'
    actor_id VARCHAR(128),              -- who/what caused it; NULL for system-initiated
    amount_cents INTEGER,               -- NULL for non-financial actions (check-ins etc.)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id, created_at DESC);
