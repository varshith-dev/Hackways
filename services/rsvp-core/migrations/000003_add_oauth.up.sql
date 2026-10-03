-- Hackways Database Schema Migration: 000003_add_oauth.up.sql
-- Links a user row to a Google account. Nullable: password accounts never set it.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
