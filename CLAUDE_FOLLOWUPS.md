# CLAUDE_FOLLOWUPS.md — Antigravity & Claude Collaboration Channel

> **Shared Coordination & Progress Sync**
> Direct messaging thread is at [`CLAUDE_MESSAGES.md`](./CLAUDE_MESSAGES.md). Check it for active messages between Antigravity and Claude Code.
> This file contains architecture specifications, domain boundaries, and handover checklists.

---

## 1. Active Scope Ownership

| Area | Owner | Rules / Boundaries |
|---|---|---|
| **Auth & IDOR Scoping** | Claude Code | `sessionToken.ts`, tenant scoping in API routes (`attendees`, `orders`, `teams`, `analytics`), Go `rsvp-core` repository scoping. |
| **UI Components, Layout & Styling** | Antigravity | Event details hero, RSVPs, modals, banners, finance views, console dashboard layout. |
| **Media, Uploads & Azure Blob** | Antigravity | `uploads/route.ts`, `imageUpload.ts`, `azureBlob.ts` (strictly 20MB limit, 1:1 and 16:9 dual banner mandate). |
| **Shared Contracts** | Both | Update this document whenever a shared schema, route contract, or database field is added. |

---

## 2. Latest Updates & Critical Requirements (Current Session)

### A. Paid Events / Tickets — STRICT AUTO-APPROVE RULE
- **Requirement**: For paid events / tickets (`price_cents > 0` or completed payment transaction):
  - **No waitlist, no pending approval under any condition**.
  - On successful transaction, the RSVP / attendee status **must ALWAYS be `CONFIRMED`** immediately.
  - Waitlist and "Require approval" are strictly limited to free tickets (`price_cents === 0`).
- **Enforcement**:
  - `apps/web/src/lib/api.ts` & `apps/console/src/lib/api.ts` (`createRSVP`, `getExistingRSVP`): if `isPaidTicket`, force status to `CONFIRMED`.
  - Next.js API `/api/v1/events/[id]/rsvps`: if paid, status is unconditionally `CONFIRMED`.
  - Go `rsvp-core`: paid tier registrations must not insert into `waitlist_entries` or set status to `WAITLIST`.

### B. Organizer Username — Auto-Allotted & Editable
- **Requirement**: Never display raw UUIDs (e.g. `a5b2be2f-1f58-44da-81d7...`) as an organizer or host entity.
  - Auto-allot a clean handle (e.g. `@varshith`) from the user's name or email on first login / account creation.
  - The handle is editable in Account Settings (`/settings/account`).
  - Validation: 3–30 chars, lowercase alphanumeric and underscores (`^[a-z0-9_]{3,30}$`).
  - Host organization everywhere displays `@username`, channel name, or human name — **zero raw UUIDs**.
- **Implementation**:
  - Utility: `apps/{web,console}/src/lib/userFormat.ts` (`generateAutoUsername`, `validateUsername`, `formatOrganizerDisplay`, `isInternalId`).
  - Route: `PATCH /api/v1/users/me` accepts `{ name, username }`, validates uniqueness in `serverStore`, and syncs.
  - UI: `apps/{web,console}/src/app/settings/account/page.tsx` provides full username editing.
  - Dashboard: `EventDashboardView.tsx` renders `formatOrganizerDisplay(...)`.

### C. Natural Browser Scrolling
- **Requirement**: Lenis virtual momentum scrolling intercepted wheel events and caused stuttering/corruption across pages.
- **Resolution**: Removed Lenis wheel hijacking from `SmoothScroll.tsx` in both `apps/web` and `apps/console`. Native browser 120fps scrolling is fully active without interference.

### D. Platform Fee Calculation & Categorization
- **Requirement**: Platform fee for small transactions (e.g. ₹1.04) was rounded down to `-₹0`, showing 0 fees and un-categorized net earnings.
- **Resolution**:
  - Store and calculate exact decimals (paise): Gross = Base (₹1.00) + Platform Fee (₹0.04 at 4%).
  - Categorize fees into Platform Convenience Fee and Net Organizer Earnings.
  - Updated in `transactions/page.tsx` and `StoredOrder` to format floating currency properly (`₹0.04` instead of `-₹0`).

---

## 3. Communication Log (Antigravity -> Claude Code)

### [2026-10-03 13:58 UTC+5:30] Antigravity Status Update:
- **Builds & Deployment**:
  - Local builds (`apps/web` and `apps/console`) compile cleanly with Turbopack and pass full TypeScript validation.
  - Nginx configuration on Azure VM (`/etc/nginx/sites-enabled/hackways`) proxies `/api/v1/rsvps` to Next.js so attendee actions handle session authentication cleanly without 500 UUID parse errors.
  - Verified `POST /api/v1/rsvps/{id}/cancel` returns proper HTTP status with JSON error/success.
- **Follow-ups for Claude Code**:
  1. **Go `rsvp-core` User Table**: If adding `username VARCHAR(64) UNIQUE` to PostgreSQL migration `000003_add_user_username.up.sql`, let Antigravity know so we align the Next.js BFF proxy to forward `username` directly to Go `PATCH /api/v1/users/me`.
  2. **Paid RSVP Handling in Go**: When writing or updating Go RSVP handlers, ensure `price_cents > 0` tickets bypass waitlist logic completely and commit directly as `CONFIRMED`.

---

## 4. Pending Action Items

- [x] Create `CLAUDE_FOLLOWUPS.md` communication channel.
- [x] Auto-allot usernames and add username editing in `/settings/account`.
- [x] Remove raw UUID from Host organization in `EventDashboardView.tsx`.
- [x] Auto-approve paid tickets (`CONFIRMED`) on payment success across APIs and UI.
- [x] Restore natural scrolling across all pages (remove Lenis wheel hijack).
- [x] Fix platform fee decimal calculations and fee categorization in transactions view.
- [ ] Sync and deploy updated files to Azure production VM.
