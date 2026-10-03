# Row-Level Security — design draft, not applied

Status: **design sketch only**. Nothing in this file has been run against any
database. It's written down because it was asked for, and because RLS is
worth doing carefully rather than quickly — getting it wrong (session
variables leaking across a pooled connection to the wrong request) is worse
than not having it, since it creates a false sense of a second enforcement
layer that isn't actually isolating anyone.

## Why this isn't a numbered migration

`migrations/000004` and `000005` are safe to apply as-is — pure additive
schema, matching the convention every prior migration already uses. This
isn't that: enabling RLS changes query *behavior*, not just schema, and it
depends on the application actually setting a session variable on every
request, which nothing in `apps/{web,console}` does today. Applying the
`ENABLE ROW LEVEL SECURITY` statements below without that application-side
change would make every query start failing closed (no rows visible) the
moment it runs, since no policy would ever match. Keeping it out of the
`NNNNNN_name.up.sql` sequence means nobody applies it by habit alongside
000004/000005.

## The real blocker: connection pooling

Postgres RLS policies read session state via `current_setting('app.x', true)`,
set per-connection with `SET LOCAL app.x = '...'` inside a transaction. That
works cleanly with one connection per request. It does **not** work safely
with PgBouncer in `transaction` pooling mode (the mode PgBouncer is actually
useful for) unless every single query that touches a protected table is
wrapped in its own transaction that sets the variable first — miss one, and
you either see no rows (safe but broken) or, in a worse misconfiguration,
a stale variable from whatever request last used that pooled backend
connection (unsafe). `lib/db.ts`'s `pg.Pool` today runs ad-hoc queries, not
one-transaction-per-request — that would need to change everywhere RLS-
protected tables are touched before this is safe to enable.

**This is why Phase 2's actual enforcement is the application layer**
(`tenantAccess.ts`'s `assertEventAccess`, already shipped) — it doesn't have
this hazard, and it's what actually stands between one organizer's data and
another's today. RLS below would be defense-in-depth on top of that, not a
replacement for it, and should land after PgBouncer's pooling mode is a
known, deliberate choice rather than enabled alongside it by coincidence.

## Draft policy shape (for when the above is resolved)

Sketch only — table/column names match migrations 000001/000004, but this
has not been checked against the live schema:

```sql
-- Requires the app to run, inside the SAME transaction as every query that
-- follows, before touching any RLS-protected table:
--   SET LOCAL app.current_user_id = '<session.sub>';
--   SET LOCAL app.current_role = '<session.role>';  -- 'admin' bypasses

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_tenant_isolation ON events
    USING (
        current_setting('app.current_role', true) = 'admin'
        OR organizer_id = current_setting('app.current_user_id', true)
        OR EXISTS (
            SELECT 1 FROM event_staff
            WHERE event_staff.event_id = events.id
              AND event_staff.user_id = current_setting('app.current_user_id', true)
        )
    );

-- Same shape for orders/teams (join through events.id), and rsvps (same
-- organizer_id check via the event it belongs to). Public reads (the
-- unauthenticated event detail page) need a second, narrower policy that
-- allows SELECT where status = 'PUBLISHED' regardless of the session
-- variable — RLS policies are additive (OR'd together) per command type,
-- so this can coexist with the tenant-isolation one above.
```

## What would need to change before enabling this

1. `lib/db.ts` needs a per-request transaction wrapper (`withTenantContext(session, fn)`) that opens a transaction, runs `SET LOCAL app.current_user_id`/`app.current_role`, runs the caller's queries, commits — used everywhere a route handler currently calls a bare pool query against an RLS-protected table.
2. A decision on PgBouncer's pooling mode (`session` mode sidesteps the hazard above entirely, at the cost of the connection-reuse benefit pooling exists for; `transaction` mode needs item 1 done correctly everywhere, no exceptions).
3. Re-run the Phase-1 forged-session-cookie tenant-isolation tests against RLS enabled, to confirm the app-layer and DB-layer checks agree — a mismatch between the two (one allows what the other blocks) is itself a bug worth catching before relying on either.
