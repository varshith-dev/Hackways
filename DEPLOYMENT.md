# Deployment Guide — Hackways

Audience: the dev team and any coding agent (Claude, Copilot, etc.) working on
this repo. This is a pin-to-pin runbook for how the live site at
`hackways.me` actually gets built and shipped — not an architecture overview,
though enough architecture is included to make the commands make sense.

**No secrets live in this file.** It names every environment variable the
system needs and exactly where its real value lives, never the value itself.
If you need actual credentials, ask the project owner — they're distributed
out of band (password manager / direct handoff), never committed.

---

## 1. System overview

```
                        ┌─────────────┐
   Browser ──HTTPS──▶   │  Cloudflare │  (proxies 80/443 only — SSH bypasses this)
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │    nginx    │  (TLS termination, path-based routing)
                        └──┬───────┬──┘
                           │       │
              ┌────────────┘       └────────────┐
              ▼                                  ▼
      ┌───────────────┐                  ┌───────────────┐
      │   Next.js      │   proxies most   │   Go service   │
      │  (port 3000)   │   /api/ traffic  │  (rsvp-core,   │
      │  systemd unit  │ ───────────────▶ │   port 8080)   │
      └───────────────┘                  └───────┬───────┘
                                                   │
                           ┌───────────────────────┼────────────────────┐
                           ▼                        ▼                    ▼
                    ┌─────────────┐         ┌─────────────┐     ┌─────────────┐
                    │ PostgreSQL  │         │   Valkey     │     │    NATS     │
                    │  (eventflow)│         │ (Redis-API)  │     │ (JetStream) │
                    └─────────────┘         └─────────────┘     └─────────────┘
```

- **Frontend** (`apps/web`): Next.js 16, deployed as a plain `next start`
  process under systemd — not containerized, not behind a CDN build pipeline.
- **Backend** (`services/rsvp-core`): Go, deployed as a Docker container
  alongside Postgres/Valkey/NATS via Docker Compose.
- **Insights** (`services/insights` — not covered in depth here): Python,
  also Docker Compose, port 8000.
- Everything except nginx itself binds to `127.0.0.1` only. Nothing but
  nginx is reachable from outside the VM.

**Next.js 16 note:** route-gating middleware is named `src/proxy.ts`, not
`middleware.ts` — that rename is new in this major version and easy to miss
if you're used to older Next.js conventions.

---

## 2. Prerequisites

- **SSH access**: an `azureuser` keypair for the VM. Ask the project owner
  for the private key (`Hackways-IN_key.pem`) — it is never committed to
  this repo and should never be requested to be emailed/Slacked in plaintext
  without an encrypted channel.
- **VM address**: `20.235.19.213` — **always SSH to this IP directly, never
  to `hackways.me`.** The domain is Cloudflare-proxied (orange-clouded),
  which forwards only ports 80/443; port 22 against the hostname will hang
  or refuse.
  ```bash
  ssh -4 -i /path/to/Hackways-IN_key.pem azureuser@20.235.19.213
  ```
  The `-4` flag matters — IPv6 routing to this VM has previously failed with
  a hard "Network is unreachable" on some networks.
- **Node.js** version matching `apps/web/package.json` engines, for local
  builds.
- **Go 1.25** for local backend builds (`services/rsvp-core/go.mod`).
- **Docker** only needed on the VM itself (Compose runs there), not locally.

---

## 3. Environment variables

Names only — ask the project owner for values, or read them directly off the
VM (they're already there; nothing below needs re-sending anywhere).

### `infra/.env` (VM only, `chmod 600`, gitignored by `infra/.gitignore`)
| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | Postgres auth, shared with the Go service's `DATABASE_URL` |
| `AUTH_SECRET` | HMAC key signing session tokens — **must match** the same variable in `apps/web/.env.production` byte-for-byte, or every session breaks |

### `apps/web/.env.production` (VM only, `chmod 600`, gitignored by `apps/web/.gitignore`)
| Variable | Purpose |
|---|---|
| `SITE_URL` | `https://hackways.me` — used to build absolute URLs (OAuth redirect, etc.) since `next start` behind a reverse proxy can't infer this from the request |
| `RSVP_SERVICE_URL` | `http://localhost:8080` — how Next.js route handlers reach the Go service server-side |
| `AUTH_SECRET` | Must match `infra/.env`'s copy exactly |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials (GCP Console) |
| `MAILMAN_ACCESS_CODE` / `MAILMAN_SECRET_KEY` | Internal transactional email service (`mailman.cloudrails.in`) |

Both `AUTH_SECRET` copies being out of sync is a real failure mode: every
existing session silently stops verifying, and everyone gets logged out.

---

## 4. Local development

```bash
# Frontend
cd apps/web
npm install
npm run dev            # http://localhost:3000, hits whatever RSVP_SERVICE_URL points to

# Backend
cd services/rsvp-core
go run ./cmd/server     # or: UseInMemoryStore-backed, no Postgres needed for quick checks
```

Always run both before pushing a change that touches the API contract
between them — a route added to one side with no caller/handler on the other
is a common source of silent breakage.

Before any multi-file change: `npx tsc --noEmit -p .` in `apps/web`, and
`go build ./... && go vet ./...` in `services/rsvp-core`. Trust these over
editor/gopls diagnostics — gopls in this workspace reports stale
`BrokenImport` errors on nearly every Go file edit that a real `go build`
shows as clean; don't chase those.

---

## 5. Deploying the frontend (Next.js)

No CI/CD pipeline exists yet — this is a manual build-and-ship process.

```bash
# 1. Build locally
cd apps/web
npm run build

# 2. Package the build output
tar czf web-build.tar.gz .next public package.json package-lock.json next.config.ts

# 3. Ship it
scp -i <key>.pem web-build.tar.gz azureuser@20.235.19.213:/tmp/web-build.tar.gz

# 4. Deploy on the VM
ssh -4 -i <key>.pem azureuser@20.235.19.213
tar xzf /tmp/web-build.tar.gz -C /home/azureuser/event-t/apps/web

# 5. Only if package.json dependencies changed:
cd /home/azureuser/event-t/apps/web && npm ci --omit=dev

# 6. Restart
sudo systemctl restart hackways-web.service
sudo systemctl is-active hackways-web.service   # should print "active"
```

The service definition (`/etc/systemd/system/hackways-web.service`) runs
`next start -H 127.0.0.1 -p 3000` with `WorkingDirectory` at
`/home/azureuser/event-t/apps/web`. `systemctl cat hackways-web.service` on
the VM shows the exact unit if anything here drifts.

**Smoke test after every deploy:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://hackways.me/home     # expect 200
curl -s -o /dev/null -w "%{http_code}\n" https://hackways.me/create   # expect 200
curl -s -D - -o /dev/null https://hackways.me/console | grep location # expect /login redirect, unauthenticated
```

---

## 6. Deploying the backend (Go / rsvp-core)

Also manual, built as a Docker image directly on the VM (no registry).

```bash
# 1. Ship only the changed source files (or the whole services/rsvp-core tree)
scp -i <key>.pem -r services/rsvp-core/internal/... \
  azureuser@20.235.19.213:/home/azureuser/event-t/services/rsvp-core/internal/...

# 2. On the VM, rebuild and restart just this service
ssh -4 -i <key>.pem azureuser@20.235.19.213
cd /home/azureuser/event-t/infra
docker compose build rsvp-core
docker compose up -d rsvp-core
sleep 2 && docker compose ps rsvp-core   # should show "Up"
```

Other containers (`postgres`, `valkey`, `nats`, `insights`) are untouched by
this — `docker compose up -d rsvp-core` only recreates the one service.

**Smoke test:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://hackways.me/api/v1/events   # expect 200
```

### Database migrations

Migration files live in `services/rsvp-core/migrations/`. There is no
automated migration runner wired into deploy yet — apply new ones by hand:

```bash
docker exec -i eventflow-postgres psql -U postgres -d eventflow < migrations/0000N_name.up.sql
```

Check the file applies cleanly against the live schema before running it
(migrations here use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` guards
specifically so a re-run is harmless — keep writing new ones that way).

### One-off direct DB access

```bash
docker exec eventflow-postgres psql -U postgres -d eventflow -c "SELECT ..."
```

Only for genuine one-off fixes (e.g. promoting a stuck account). Anything
that should happen routinely belongs in a real migration or API endpoint
instead, not a remembered `psql` incantation.

---

## 7. nginx routing

Config: `/etc/nginx/sites-available/hackways` on the VM (symlinked from
`sites-enabled/`). nginx matches the **longest prefix**, so order in the
file is load-bearing:

| Path prefix | Routes to | Why |
|---|---|---|
| `/api/v1/auth/` | Next.js `:3000` | Sets the httpOnly session cookie — only Next.js route handlers do this |
| `/api/v1/contact` | Next.js `:3000` | Sends mail via Mailman; its secret key stays out of the Go service entirely |
| `/api/v1/geocode` | Next.js `:3000` | Proxies Photon (location autosuggest) |
| `/api/` (everything else) | Go `:8080` | The actual application API — no trailing slash on `proxy_pass`, so the full path reaches Go's router unchanged |
| `/` | Next.js `:3000` | Everything else — pages |

**If you add a new Next.js-only API route under `/api/v1/...`**, it needs
its own `location` block here, same shape as `/api/v1/geocode`'s, placed
*before* the general `/api/` block — otherwise it silently 404s by falling
through to the Go service, which has no matching route. This has happened
at least twice; it's the single easiest mistake to make when adding a new
Next.js route handler.

### Editing nginx config

Remote `sed -i` on this file has been blocked by tooling classifiers before.
Edit it locally instead:

```bash
scp -i <key>.pem azureuser@20.235.19.213:/etc/nginx/sites-available/hackways ./hackways.nginx
# edit hackways.nginx locally
scp -i <key>.pem ./hackways.nginx azureuser@20.235.19.213:/tmp/hackways.nginx
ssh -4 -i <key>.pem azureuser@20.235.19.213 \
  "sudo cp /etc/nginx/sites-available/hackways /tmp/hackways.bak && \
   sudo cp /tmp/hackways.nginx /etc/nginx/sites-available/hackways && \
   sudo nginx -t && sudo systemctl reload nginx"
```

Always `nginx -t` before `reload` — a syntax error in a reload (not restart)
leaves the old config running, but it's still worth catching before the next
restart surfaces it.

---

## 8. Auth & role model

- Session tokens are HMAC-SHA256 signed, not JWT:
  `base64url(JSON claims) + "." + base64url(HMAC-SHA256(payload))`. Claims:
  `sub, email, name, role, exp`. Verified independently by both the Go
  service (`internal/auth/auth.go`) and Next.js (`src/lib/sessionToken.ts`)
  — they only need to agree on `AUTH_SECRET`.
- Three roles: `attendee` (default on signup), `organizer`, `admin`.
- **`src/proxy.ts` gates routes by role:**
  - `/console/*`, `/m/console/*` → `organizer` or `admin`
  - `/console/users`, `/console/super-admin` → `admin` only
  - `/events/create`, `*/manage`, `/console/events/*` → any signed-in user
    (ownership-checked at the API/page layer instead, not by role)
  - `/create`, `/create/branding`, `/console/start` → explicitly
    unauthenticated-friendly; they show their own "sign in" state
- **Becoming an organizer** happens two ways:
  1. Implicitly: creating an event (Go `handleCreateEvent`) or a community
     (`/api/v1/channels`) promotes an `attendee` automatically and reissues
     the session cookie in the same response.
  2. Explicitly: `/console/start`, backed by
     `POST /api/v1/users/me/organizer` — a dedicated opt-in page reachable
     from the account dropdown's "Console" link, for someone who wants
     console access without hosting anything first.
- **Becoming an admin** is not self-service. Either:
  - add the email to `ADMIN_EMAILS` in `infra/.env` (comma-separated) — this
    self-heals the role to `admin` on every login/signup/OAuth, or
  - a direct one-off `UPDATE users SET role='admin' WHERE email = '...'`
    against the DB (durable in that row, but won't survive the row being
    recreated — prefer `ADMIN_EMAILS` for anything long-term).
- A role change — either kind — only takes effect for the user's **next**
  login. Session cookies are signed at issue time; an already-logged-in user
  must log out and back in to pick up a new role.

### The mobile-redirect / role-gate interaction (read before touching `proxy.ts`)

`proxy.ts` auto-redirects mobile user agents from `/console/*` to the
matching `/m/console/*` path, and that redirect runs **before** the
role/session check. Any path that starts with `/console` but must stay
reachable regardless of role (like `/console/start`, the role gate's own
redirect target) has to be added to the `hasNoMobileEquivalent` exemption
list in that file — otherwise a mobile non-organizer loops forever:
`/console/start → /m/console → (still not organizer) → /console/start →
...`, which shows up in a browser as "this page isn't working"
(`ERR_TOO_MANY_REDIRECTS`). This exact bug has shipped once already; check
the exemption list whenever you add a new path under `/console` that isn't
strictly role-gated.

---

## 9. Known architecture debt

- **Legacy file-based store**: `src/lib/serverStore.ts` reads/writes
  `.server_data/platform_store.json` directly on disk, and is still used in
  parallel with the real Postgres+Go backend for channels/communities
  (`/api/v1/channels`) and some server-rendered console pages (e.g.
  `app/console/organizer/page.tsx`). This has already caused one production
  incident (an 11MB file embedded directly in SSR output, crashing `/home`).
  Not yet migrated off — treat any page using `serverStore` as technical
  debt, not a pattern to copy into new code.
- **No CI/CD**: every deploy in this guide is manual. If you're setting up
  automation, the commands above are the exact steps to encode.
- **No automated migration runner**: new `.sql` files in
  `services/rsvp-core/migrations/` must be applied by hand (§6). Write them
  idempotently (`IF NOT EXISTS` guards) since there's no tracking table
  preventing a re-run.

---

## 10. Rollback

Frontend: keep the previous build's tarball until the new one is confirmed
healthy. Rollback is re-extracting it and restarting the service — same
steps as §5 with the old tarball.

Backend: `docker compose` doesn't retain the previous image by name once
rebuilt. Rely on `git` — check out the previous commit of
`services/rsvp-core`, re-run the build/restart in §6. This is a gap worth
closing (tag images instead of always building `:latest`-equivalent) if
rollback speed ever matters more than it does today.

---

## 11. Troubleshooting checklist

1. **"Network error" on a specific `/api/v1/...` route** → almost always a
   missing nginx carve-out (§7). Check which backend actually owns that
   route and whether nginx's prefix match sends it there.
2. **Logged-in user can't reach a role-gated page** → check `proxy.ts`'s
   gate for that prefix, and remember role changes need a fresh login (§8).
3. **"This page isn't working" / redirect loop** → almost certainly a
   `proxy.ts` redirect target that itself falls under a prefix the same
   function redirects away from. Trace the exact redirect chain by hand
   before changing anything (§8's mobile/role interaction is the known
   example).
4. **Session suddenly invalid for everyone** → `AUTH_SECRET` mismatch
   between `infra/.env` and `apps/web/.env.production`, or one was rotated
   without updating the other.
5. **Go file shows IDE errors but you're not sure they're real** → run
   `go build ./... && go vet ./...` directly; this workspace's gopls
   reports false positives on nearly every edit.
