import { Pool } from "pg";

// Same connection-string shape and default as services/rsvp-core's
// internal/config/config.go, so local dev needs no separate setup — both
// sides point at the same `eventflow` database.
//
// NOT YET USED by any route handler. This exists so lib/serverStore.ts's
// internals can be migrated to Postgres (see the Phase 2 plan) without that
// migration needing to also invent a connection module from scratch. Until
// that cutover happens, every app/lib/serverStore.ts call still reads and
// writes the JSON flat file exactly as it does today — importing this file
// opens a connection pool but nothing queries it yet.
const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/eventflow";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}
