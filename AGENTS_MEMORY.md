# AGENTS_MEMORY.md — Core System Architecture & Multi-Agent Context

> **Audience**: AI Agents (Antigravity, Claude Code, GitHub Copilot) & Engineers working on Hackways.  
> **Source of Truth**: Production architecture, database schemas, access rules, URLs, and operational workflows.

---

## 1. High-Level Architecture Overview

Hackways is a dual Next.js application frontend backed by a Go microservice (`rsvp-core`) and Postgres database deployed on Azure Linux VM (`20.235.19.213`).

```
Internet (Cloudflare Proxy)
   │
   ▼
Azure VM (20.235.19.213)
   │
   ├── NGINX Reverse Proxy (Port 80/443)
   │     ├── hackways.me / www.hackways.me ───► apps/web (Node 3000, systemd: hackways-web)
   │     ├── console.hackways.me ─────────────► apps/console (Node 3001, systemd: hackways-console)
   │     └── /api/v1/ (Backend direct proxy) ─► Docker containers (127.0.0.1)
   │
   └── Docker Compose (`/home/azureuser/event-t/infra`)
         ├── eventflow-rsvp-core (Go binary, Port 8080 HTTP / 50051 gRPC)
         ├── eventflow-postgres (Postgres 16 Alpine, Port 5432)
         ├── eventflow-valkey (Redis compatible, Port 6379)
         └── eventflow-nats (JetStream queue, Port 4222 / 8222)
```

---

## 2. Critical Non-Negotiable Product Rules

1. **Dual Banners on Every Event**:
   - `banner_url` (16:9 Landscape): Explore hero, event ambient header, desktop previews.
   - `square_banner_url` (1:1 Square): Timeline cards, Discover cards, mobile lists.
   - *Never merge or delete either ratio.* Both must always exist on schema, forms, and APIs.
2. **Strict Slugs Across the Platform**:
   - **Never promote raw UUIDs** in user-facing URLs (`https://hackways.me/events/5f890d3b-45fb-47c6-bfba-dd9a28c37dd4`).
   - Links must generate `/events/[slug]` (e.g. `/events/hackways-launch`, `/events/open-source-sprint`).
   - Any raw UUID route triggers an instant canonical 307 redirect to `/events/[slug]`.
3. **Attendee Pass Cancellation Workflow (`BLOCKED` State)**:
   - When an attendee requests cancellation, their pass status becomes `"BLOCKED"` (`cancellationRequested = true`).
   - The ticket spot is **HELD and NOT released immediately**.
   - Public ticket view displays `"Cancellation Pending Review (Pass Blocked)"`.
   - In Console Attendees table, status displays as `"Cancellation Requested (Pass Blocked)"` with host decision buttons:
     - `Approve Cancellation`: revokes the pass and restores spot capacity.
     - `Decline / Keep Pass`: rejects the cancellation request and restores ticket to `CONFIRMED`.
4. **Console Access Gate**:
   - Users must create at least one event or own a community to access the Console.
   - If an attendee account visits `/console` without ownership, they are presented with an actionable onboarding gate ("Create an Event" or "Launch Community").
5. **Manage Event Shortcut**:
   - If the logged-in user is the event organizer, co-host, or admin, a `Manage Event` button renders directly next to `RSVP Now` on the public event page, linking straight to `/console/events/[slug]/overview`.
6. **Paid Ticket Policy**:
   - Tickets with `price_cents > 0` are **unconditionally auto-confirmed (`CONFIRMED`)**. Paid tickets never require approval or waitlist.
7. **No Browser Popups**:
   - Never use `alert()`, `confirm()`, or `prompt()`. Use custom accessible UI dialogs or toast notifications.
8. **No Emojis**:
   - Strictly zero emojis in code, UI text, buttons, badges, notifications, and git commits. Use `lucide-react` icons.

---

## 3. Data Storage & Tenant Isolation

### 3.1 Backend Postgres (`services/rsvp-core/migrations`)
- Migrations 000001–000006 are active on the production PostgreSQL database.
- Key tables: `events`, `ticket_tiers`, `rsvps`, `orders`, `users`, `channels`, `channel_members`.

### 3.2 Dual Server Store Sync (`lib/serverStore.ts`)
- Both `apps/web` and `apps/console` maintain a synchronous persistent JSON store on VM disk at `.server_data/platform_store.json` for ultra-low latency fallback and instant SSR.
- All write actions (`requestAttendeeCancellation`, `approveAttendeeCancellation`, `declineAttendeeCancellation`, `saveUser`, `saveEvent`) commit to disk via `saveToDisk()`.

### 3.3 Strict Tenant Authorization
- Users can ONLY view and edit console dashboards of events where:
  - `session.role === "admin"` OR
  - `event.organizer_id === session.userId` OR
  - User ID/email exists in `event.hosts` or `event.host_users`.
- Unauthorized requests redirect to `/console/organizer?denied=event_not_owned`.

---

## 4. Production Deployment Runbook

- **Azure VM IP**: `20.235.19.213`
- **SSH Command**:
  ```bash
  ssh -i "C:\Users\ADMIN\Documents\Hackways-IN_key.pem" azureuser@20.235.19.213
  ```
- **VM App Root**: `/home/azureuser/event-t`
- **Build & Deploy Steps**:
  1. Test builds locally:
     ```bash
     npm --prefix apps/web run build && npm --prefix apps/console run build
     ```
  2. Package source:
     ```bash
     tar --exclude='node_modules' --exclude='.next' --exclude='.git' -czf deploy.tar.gz apps/web apps/console
     ```
  3. Upload to VM:
     ```bash
     scp -i "<key>.pem" deploy.tar.gz azureuser@20.235.19.213:/home/azureuser/
     ```
  4. Extract, build on VM, and restart:
     ```bash
     ssh -i "<key>.pem" azureuser@20.235.19.213 "tar -xzf /home/azureuser/deploy.tar.gz -C /home/azureuser/event-t/ && npm --prefix /home/azureuser/event-t/apps/web run build && npm --prefix /home/azureuser/event-t/apps/console run build && sudo systemctl restart hackways-web hackways-console"
     ```
- **Systemd Services**:
  - `hackways-web` (Port 3000)
  - `hackways-console` (Port 3001)

---

## 5. Security Invariants (Audited via Cloudflare Security-Audit-Skill)

1. **Platform Settings Gateway Secrets**:
   - `GET /api/v1/platform/settings` never discloses `keySecret` or `webhookSecret` to non-super-admins. Only public gateway configurations (`keyId`, `enabled`, `platformFeePercent`) are returned to general users.
2. **Order Price Tampering Prevention**:
   - `POST /api/v1/orders` validates `data.amount` against the server-side tier price (`tier.price_cents`). Orders with client amount below tier price are rejected with 400. Paid tiers require verified Razorpay payment.
3. **Uploads Authentication**:
   - `POST /api/v1/uploads` strictly enforces valid user sessions (`requireSession`). Referer / origin spoofing bypasses are eliminated.
4. **Console User Verification Gate**:
   - `POST` and `PATCH` `/api/v1/users/[id]/verify` enforce `requireSession(req, ["admin"])` to prevent unauthenticated verification forging.
5. **Event & Team Hijack Protection**:
   - `POST /api/v1/events` verifies existing event ownership before modification.
   - `POST /api/v1/teams` verifies existing team leader email or event organizer permissions before updates.
6. **Telemetry & Public API Scoping**:
   - `GET /api/v1/analytics/track` is restricted to `organizer` and `admin` roles.
   - `GET /api/v1/events/[id]` filters out internal host emails and hides draft/deleted events from unauthorized visitors.

---

## 6. Agent Responsibilities & Rules of Engagement

| Agent | Focus Area | Safe Paths | Restrictions |
|---|---|---|---|
| **Antigravity** | Full-Stack Orchestration, Packaging & VM Deployments, Store Sync | Entire Monorepo | Coordinate changes with `AGENT_MESSAGING.md` |
| **Claude Code** | Backend Security, Go `rsvp-core`, Postgres migrations, Tenant Isolation | `services/rsvp-core/**`, `apps/*/src/lib/` | Do NOT edit UI layouts, JSX components, or CSS styles |
| **GitHub Copilot** | UI polish, responsive mobile layout, micro-interactions | `apps/*/src/components/**`, `apps/*/src/app/**/page.tsx` | Do NOT alter backend auth, data models, or landing pages |

