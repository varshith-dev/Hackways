# PgBouncer — runbook, not executed

I have no access to the Azure VM or its Docker Compose stack from this
working copy, so this is a set of steps for whoever does, not something I
ran. Written as a companion to `DEPLOYMENT.md`'s existing deploy process
(manual, documented there) — intentionally not edited directly since that
file is Antigravity's declared territory (production builds / deploy
pipeline / Azure VM) per `CLAUDE_MESSAGES.md`'s lock table. Fold this in
there if useful.

## Why

`services/rsvp-core`'s own `pgxpool` already does client-side connection
pooling (`DBMaxOpenConns`/`DBMaxIdleConns` in `internal/config/config.go`).
PgBouncer matters once a second consumer — the Postgres-backed
`serverStore.ts` this Phase 2 effort is building — also opens connections
against the same database from Next.js's serverless/per-request model, where
connections churn much faster than one long-lived Go process's pool.
Without PgBouncer, that's a real risk of exhausting Postgres's own
`max_connections` under load. Not urgent before `serverStore.ts` is actually
cut over (nothing new connects yet), but should land before it does.

## Pooling mode: use `session`, not `transaction`

See `docs/phase2-rls-design.md` for why: `transaction` mode is the one
PgBouncer is usually chosen for (fastest connection reuse), but it's unsafe
with Postgres session variables (`SET LOCAL ...`) unless every query that
needs one is individually wrapped — which RLS would need, and which nothing
in this codebase does today. `session` mode avoids that hazard entirely, at
the cost of holding one backend connection per client connection for its
lifetime (the thing PgBouncer normally exists to avoid) — an explicit
trade-off, not an oversight, until the RLS doc's prerequisites are actually
done.

## Steps (on the VM, against the existing `infra/docker-compose.yml` stack)

1. Add a `pgbouncer` service to `infra/docker-compose.yml`, `depends_on:
   postgres`, pointing at the same `eventflow` database credentials already
   in `infra/.env`.
2. `pgbouncer.ini` pool_mode = `session` (see above), `max_client_conn`
   sized for expected concurrent Next.js connections + Go's pool, `listen_port`
   on something that doesn't collide with Postgres's own 5432 (e.g. 6432,
   the PgBouncer convention).
3. Point `DATABASE_URL` (the new env var `lib/db.ts` reads) at PgBouncer's
   port, not Postgres's directly. Leave `services/rsvp-core`'s own
   `DATABASE_URL`/connection config as-is initially — moving Go's already-
   tuned pool behind PgBouncer too is a separate, later decision, not
   required for Next.js's side to benefit.
4. Verify with `psql -h localhost -p 6432 -U postgres -d eventflow` that
   PgBouncer itself answers, then `SHOW POOLS;` via PgBouncer's admin
   console to confirm it's actually proxying rather than erroring silently.
5. Watch Postgres's own `pg_stat_activity` connection count before/after
   switching `DATABASE_URL` over, to confirm it drops rather than staying
   flat (the actual point of this exercise).
