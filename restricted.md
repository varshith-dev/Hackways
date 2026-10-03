# UI / UX Restricted Rules & Anti-Patterns

This document outlines strict visual and interaction design rules for the **Hackways** web platform. Any code, layout, or copy violating these rules is prohibited.

---

## 1. Strictly No Event Cards on the Landing Page (`/`)

- ❌ **NEVER embed event cards on `/`**:
  - No event pass cards in the Hero section.
  - No "Curated upcoming events" card grid.
  - No preview cards, thumbnails, or directory widgets on `/`.
- ✅ **Rule**: The landing page is strictly a clean, minimal product introduction. **ALL event discovery and event cards belong exclusively on `/explore`**.

---

## 2. Strictly No Green/Colored Status Indicator Dots

- ❌ **Prohibited**: Green, pulsing, or colored indicator dots (e.g. `•`, `rounded-full bg-emerald-500`, `animate-ping`, `animate-pulse` dots).
- ❌ Do not use synthetic "live operational" or "capacity status" dots next to text or in buttons.
- ✅ **Rule**: Use clear, direct typography without decorative status dots.

---

## 3. Compact Hero Height (Do Not Make Hero Lengthy)

- ❌ Do not use excessive vertical padding (e.g. `pt-36 pb-32`) that pushes content far below the fold or makes the hero look like a vast empty void.
- ✅ Keep hero height compact, tight, and well-proportioned (`pt-10 sm:pt-14 pb-6 sm:pb-8`).

---

## 4. Prohibited Badges & Synthetic Marketing Pills (DO NOT USE)

Never add synthetic, buzzword-heavy badge pills above headers, over images, or floating in sections.

### Explicitly Banned Pill Labels & Formats
- ❌ **`01 / SETUP`**, **`02 / ADMISSION`**, **`03 / CHECK-IN`**, or any `01 / ...`, `02 / ...` numbered step labels (Banned)
- ❌ **`FREE FOREVER`**, **`MOST POPULAR`**, **`HIGH CONCURRENCY`**, **`SAVE 20%`** pricing card badges (Banned)
- ❌ **`• Mission & Philosophy`**, **`• Support Desk & Live Dispatch`**, **`• Help Center`** pills (Banned)
- ❌ **`GDPR & CCPA Compliant • Version 2.4`**, **`Legal Agreement • Version 3.1`** pills (Banned)
- ❌ Floating logo ornaments or graphic icons floating above hero titles on `/` (Banned)
- ❌ **`• Next-generation event platform`** (Banned)
- ❌ **`Quiet event infrastructure`** (Banned)
- ❌ **`SPEC // 01`**, **`SPEC // 02`**, **`SPEC // 03`**, **`QUEUE LIQUIDITY`**, etc. (Banned)
- ❌ **`01 // ARCHITECTURE`**, **`02 // FOR ORGANIZERS`** (Banned)
- ❌ **`ATOMIC CONCURRENCY ENGINE`** / **`ATOMIC CAPACITY ENGINE`** (Banned)
- ❌ **`ZERO OVERSELLING`** ticker pills (Banned)
- ❌ **`Event Drops • Live Concurrency`** (Banned)
- ❌ **`10,000+ drops served`** or arbitrary fake vanity pills (Banned)
- ❌ **`• Live Event`**, **`Live Event`**, **`LIVE EVENT`**, **`LIVE NOW`** status pill tags (Banned)
- ❌ Badges or pills plastered directly on top of event photography/artwork (e.g., floating waitlist pills, capacity tags obscuring banners).

### Rule:
If a piece of information is essential, present it in honest, clear typography or native metadata fields (such as city, date, or remaining capacity). Do **not** invent floating marketing pills to fill empty vertical space.

---

## 5. Strictly Light Theme for Application Body

- ❌ **Never** use dark theme backgrounds (`#0c0c0e`, `#161619`, `bg-zinc-900`, `bg-zinc-950`) on body content pages, discovery cards, or detail views.
- ✅ The core application canvas must be crisp, breathable light theme (`#ffffff` / `#fafafa` with `border-zinc-200` and deep ink typography).

---

## 6. No Fake Widgets, Simulators, or Developer Telemetry on Public Pages

- ❌ **Never** put simulated transaction logs (e.g., `atomic_decr(tier_general) → OK [cap: 119]`, `TRANSPORT: HTTP/2 SSE`) on marketing or landing pages.
- ❌ **Never** embed fake "Interactive Consoles", "Live Simulation Widgets", or pseudo-calculators that do not exist in the real product.
- ✅ Show only real, tangible UI elements: clean event passes, authentic event metadata, real host profiles, and real capacity counters.

---

## 7. No AI Image Generation Tools

- ❌ **Do not** call `generate_image` or generate new placeholder graphics.
- ✅ Use permanent, high-resolution photography already saved in `/banners/` (`hyperscale-conf.jpg`, `ai-frontiers.jpg`, `tech-leaders.jpg`, etc.) or clean CSS/SVG craft.

---

## 8. No Cluttered Toolbars or Excessive Category Filters on `/explore`

- ❌ **Do not** add noisy secondary filter bars (e.g., `All (3) Hosting (0) Attending (1)`).
- ❌ **Do not** add `[Grid] [List]` toggle toolbars.
- ❌ **Do not** add scrolling rows of 15 colored category chip pills.
- ✅ Keep discovery minimal and focused:
  - Single, quiet search input.
  - Lu.ma-style 2-column discovery feed (Left: event time highlight, title, host avatars, venue pin, city pill, status badge; Right: clean 1:1 square artwork).

---

## 9. No Direct Plagiarism of Reference Sites

- ❌ Do not copy verbatim text snippets, neon green tickers, or surface quirks from inspiration sites (e.g., Oqens ticker bars, cloned taglines).
- ✅ Take architectural inspiration from references (spacious whitespace, stark typographic contrast, quiet confidence), but design authentic, tailored experiences for **Hackways**.

---

## 10. Strictly No SPA Hash Anchors (`#`) & Single-Dashboard Side Panel Architecture

- ❌ **Never** use hash anchors (e.g. `#overview`, `#events`, `/#workflow`, `/#guarantee`) for navigation, tabs, or page architecture.
- ❌ **Never** build dashboards as Single Page Applications (SPA) with `#` routing. Every sub-tab must be an independent, clean URL route (e.g. `/console/super-admin/overview`, `/console/team/tasks`, `/console/organizer/tickets`).
- ❌ **Do NOT use the side panel to connect or link between different dashboards** (e.g. do NOT put "Event Organizer", "Team & Roles", "Door Check-in", "Live Venue", "Finance & Payouts", "Platform Admin" as links in a side panel).
- ✅ **The side panel is strictly to shift sub-tabs within a SINGLE dashboard**:
  - In **Super Admin Dashboard** (`/console/super-admin/*`): Side panel only shifts between the 20 Super Admin sub-tabs (`Overview`, `Events`, `Organizers`, `Orders`, etc.).
  - In **Co-Organizer Dashboard** (`/console/team/*`): Side panel only shifts between the 12 Co-Organizer sub-tabs (`Overview`, `My Events`, `Tasks`, `Attendees`, `Guest List`, `Tickets & Orders`, `Check-in`, `Marketing`, `Communications`, `Reports`, `Team Activity`, `Notifications`).
  - In **Organizer Dashboard** (`/console/organizer/*`): Side panel only shifts between the 14 Organizer sub-tabs (`Overview`, `Events`, `Tickets`, `Orders`, `Attendees`, etc.).
  - **Multi-Event Hosting Principle**: An Organizer is a host entity that can create and manage multiple events simultaneously. The Organizer Dashboard must support multi-event context switching across all hosted events.
- ✅ Switching between different dashboards is done strictly at the global header dashboard switcher or user context switch, NEVER inside the sidebar navigation list.

---

## 11. Strictly No Default Browser Popups, Alerts, or Prompts

- ❌ **NEVER use default browser dialogs**:
  - `window.alert()`
  - `window.prompt()`
  - `window.confirm()`
  - Default browser input dialogs or unstyled prompt modals.
- ✅ **Rule**:
  - All edits (such as price adjustments, ticket caps, transfers) must be executed via **inline UI controls** (e.g. direct inline editable inputs with checkmark/cancel, dedicated drawer/slide-over, or a crafted inline micro-sheet).
  - All confirmations and notifications must use non-blocking toast notifications or sleek in-context confirmation chips, never native browser alert dialogs.
  - Zero browser popups anywhere on the platform.

---

## 12. No Header Clutter & Over-disclosure of User Identity

- ❌ **NEVER disclose redundant user identity metadata or telemetry in the top navigation header**:
  - No exposing raw email addresses (e.g. `user@gmail.com`) in the navbar.
  - No raw role pill tags (e.g. `ATTENDEE`, `ORGANIZER`) in the primary header.
  - No unstyled inline "Sign out" buttons cluttering the navigation bar.
- ✅ **Rule**:
  - Disclosing every term or user property in the global header is unnecessary and creates noise.
  - Display strictly a clean, minimal **profile icon / avatar button** in the header.
  - Tapping/clicking the profile icon opens a quiet dropdown or routes to the dedicated `/profile` page where user identity, registered tickets, communities, and account actions reside.

---

## 13. Strictly No Synthetic Role Labels & Boilerplate Template Cards

- ❌ **NEVER tag users with raw internal role labels (`ATTENDEE`, `ORGANIZER`, `USER`, `MEMBER`)**:
  - Do not slap `ATTENDEE` or `ORGANIZER` pill badges next to people's names in the header, profile, or attendee rosters.
  - Disclosing every internal term, permission, or classification enum is unnecessary, noisy, and prohibited.
- ❌ **No "AI-generated" boilerplate card wrappers or synthetic bios**:
  - Do not wrap profile identity headers in heavy, bloated rounded cards (`rounded-3xl border shadow-xs`).
  - Do not invent hallucinated placeholder bios (e.g. "Software engineer & systems enthusiast exploring...").
  - Do not render repetitive boxed pill-cards where every list item has an isolated "[View]" button. Use clean, natural list layouts with subtle dividers, clear typography, and direct row navigation.

## 14. Action-Oriented UI & No Persistent Global Stats on Sub-Tabs

- ❌ **No Persistent High-Level KPIs Across Unrelated Tabs**:
  - High-level platform GMV, platform net fees, and global drop counters belong strictly on the Overview dashboard.
  - Do NOT plaster static metric ticker blocks across specific operational tabs (such as Attendees, Tickets, KYC, Orders).
- ❌ **No Passive Unactionable Clutter**:
  - Every UI element on screen must serve a direct functional purpose with real actions (not just passive text or isolated single toggles).
  - Provide meaningful admin operations (e.g. Profile Audit details, Session Revocation, Magic Link Reset, Invoicing, Status Adjustment) with immediate feedback and toast notifications.

---

## Summary Checklist Before Committing UI Changes
- [ ] Are there any unneeded pill badges (e.g. `• Next-generation event platform`, `ATTENDEE`)? **Remove them.**
- [ ] Is every page rendered in clean light theme? **Yes.**
- [ ] Are all banner images free of floating badges plastered over them? **Yes.**
- [ ] Is the header kept minimal with just a profile icon (no emails or role pills in navbar)? **Yes.**
- [ ] Are there ZERO synthetic role tags (`ATTENDEE`, `ORGANIZER`) next to user names? **Yes.**
- [ ] Are there ZERO boilerplate/AI-style heavy card wrappers and fake bios? **Yes.**
- [ ] Are persistent global KPIs restricted only to the Overview tab (not repeated on sub-tabs)? **Yes.**
- [ ] Are data table rows equipped with full actionable controls (audit details, session revoke, credentials)? **Yes.**
- [ ] Is `/` kept strictly as a clean, minimal landing page without the directory list? **Yes.**
- [ ] Does `/explore` follow the clean Lu.ma discovery card format without toolbar clutter? **Yes.**
- [ ] Are all dashboard sidebars used strictly for sub-tabs within that single dashboard (no hash `#` anchors)? **Yes.**
- [ ] Are all cross-dashboard links removed from the side panel? **Yes.**
- [ ] Are all emojis completely eliminated across all UI surfaces? **Yes.**
- [ ] Are there ZERO native browser dialogs (`alert`, `prompt`, `confirm`)? **Yes.**
