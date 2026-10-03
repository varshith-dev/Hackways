# CLAUDE AGENTIC SYSTEM DIRECTIVE: HACKWAYS PRODUCTION RESILIENCE, ARCHITECTURE REWIRING & SECURITY HARDBOUND

You are Claude, operating in autonomous expert software engineer mode on the Hackways production monorepo.
Your task is to fix the critical architectural disconnects, broken cross-app wiring, data loss on refresh, zero-security super-admin escalation, and AI-generated UI flaws across `apps/web` and `apps/console`.

---

## 0. ABSOLUTE SYSTEM RULES & COMPLIANCE (ZERO TOLERANCE)

1. **NO EMOJIS**: Never output emojis anywhere: not in code, commit messages, comments, logs, UI labels, buttons, or agent status outputs.
2. **NO FAKE OR TEST DATA**:
   - Never use fake placeholder names ("John Doe", "Varshith", "Jane"), dummy emails ("test@example.com"), or mock arrays.
   - All data stores, attendee lists, order tables, and event registries must start empty and dynamically populate with real inputs.
3. **DUAL BANNER MANDATE (STRICT)**:
   - Every event MUST maintain two separate banner aspect ratios across all models, APIs, editors, and display surfaces:
     - `banner_url`: 16:9 Landscape Banner (Hero, desktop exploration, wide banner).
     - `square_banner_url`: 1:1 Square Banner (Timeline, feed cards, mobile passes, compact cards).
   - Never merge, drop, or conflate the two ratios into a single field.
4. **CANCELLATION COPY**: The action must strictly be labeled "Request cancellation" across all interfaces and backend responses. Never use "Withdraw application".
5. **NO UNLIMITED LABELS**: Never print "Unlimited" or "No limit" on ticket tiers with uncapped capacity. Render only the tier name and price.

---

## 1. ROOT PROBLEM AUDIT & ARCHITECTURAL FLAWS TO ELIMINATE

### Flaw A: Assets & Uploads Disappearing on Refresh
- **Root Cause**: Uploaded assets (banners, logos, avatars) are stored in client React state or serialized as massive transient base64 strings in ephemeral memory. Upon page refresh or process restart, the images vanish.
- **Required Fix**:
  - Implement a persistent, disk-backed or object-storage upload pipeline at `/api/v1/uploads` accepting `multipart/form-data`.
  - Validate image MIME types (`image/jpeg`, `image/png`, `image/webp`) and limit file size to 5MB max.
  - Generate collision-proof file names (`asset_[sha256_hash]_[timestamp].[ext]`).
  - Save files to a persistent shared storage directory (`.server_data/uploads/` symlinked to `apps/web/public/uploads` and `apps/console/public/uploads`).
  - Return permanent public URLs (`/uploads/asset_...`).
  - Save the permanent URL into `banner_url`, `square_banner_url`, `avatar`, or `logo` in the database.
  - Ban inline base64 data URIs in storage models.

### Flaw B: Zero Security & Super Admin Auto-Escalation
- **Root Cause**: Anyone navigating to `/console/super-admin` is granted Super Admin privileges by default. Role checks fall back to `"super_admin"`, and there is no route-level session guard or email allowlist.
- **Required Fix**:
  - Eliminate all default admin fallbacks (`defaultRole: "super_admin"` or fallback to admin).
  - The default unassigned role for any user or visitor is strictly `ATTENDEE`.
  - Implement strict Next.js middleware and API route guards in `apps/console`:
    - Only users with verified sessions whose email matches the server environment allowlist (`SUPER_ADMIN_EMAILS`) can access `/console/super-admin/*` and administrative API endpoints.
    - If unauthenticated: redirect to `/login?redirect=/console/super-admin` with HTTP 302/307.
    - If authenticated but unauthorized: return HTTP 403 Forbidden with an honest "Access Restricted: Platform Administrator privileges required" page. Never render admin dashboards or internal metrics to non-admins.
    - Enforce HTTP-only, secure, SameSite session cookies (`hackways_session`).

### Flaw C: Complete Disconnect Between Console and Web App
- **Root Cause**: `apps/web` (port 3000) and `apps/console` (port 3001) operate as isolated islands. Organizers cannot jump to view their published events on the web, attendees cannot navigate to their console host tools, and state updates made in one do not trigger immediate updates in the other.
- **Required Fix**:
  - **Shared Storage Single Source of Truth**: Both apps must point to the identical shared data store (`.server_data/platform_store.json` or database connection).
  - **Atomic File Writing**: Implement atomic write operations (`write to .tmp` -> `renameSync`) so concurrent requests between web and console never corrupt state.
  - **Interlinked Navigation**:
    - In `apps/console`: Every event detail page must have a prominent "View Live Event" link pointing directly to `[WEB_URL]/events/[id]`.
    - In `apps/console`: Channel management must have a "View Public Channel" link pointing to `[WEB_URL]/channels/[slug]`.
    - In `apps/web`: For logged-in users with organizer or admin permissions, the AppHeader and profile menu must render a "Console" link pointing directly to `[CONSOLE_URL]`.
    - In `apps/web`: Event detail pages must show an "Edit Event in Console" button if the current user is the event organizer or platform admin.
  - **Unified Cross-App Authentication**: Share session cookies across subdomains/domains (`.hackways.com` or localhost) so logging in on Web carries over to Console without re-authenticating.

### Flaw D: Poor Device Caching & Stale State
- **Root Cause**: Inconsistent use of `localStorage` caches with no cache invalidation versioning causes stale event data and expired RSVPs to persist indefinitely on attendee devices, conflicting with live SSR state.
- **Required Fix**:
  - Introduce an `updated_at` timestamp on all events, channels, and orders.
  - When fetching from client cache, compare cached `updated_at` against server headers (`ETag` or `Last-Modified`).
  - On any mutation (RSVP, ticket purchase, event edit), immediately invalidate the local cache and trigger Next.js `revalidatePath` and `revalidateTag`.

### Flaw E: AI-Generated UI Artifacts & Clutter
- **Root Cause**: The UI contains synthetic badges ("STEP 1 OF 2", "50% COMPLETED", "INSTANT PASS", "256-bit encrypted"), redundant review steps that duplicate sidebar data, and robot-like placeholder copy.
- **Required Fix**:
  - **Single-Page RSVP**: When an event has no custom questionnaire, the entire flow must be a single, clean page. No progress indicators, no artificial wizard steps. The primary button directly executes `Pay ₹[Total]` or `Complete registration`.
  - **Multi-Step RSVP (Only When Questions Exist)**: Exactly 2 steps: Step 1 (Attendee details) -> Step 2 (Organizer questions). No redundant step 3 review screen.
  - **Typography & Styling**: Clean, human, minimalist styling matching Linear/Vercel design aesthetics:
    - Neutral palette: `zinc-950`, `zinc-800`, `zinc-600`, `zinc-400`, `zinc-100`.
    - No nested boxes-in-boxes. High visual hierarchy with standard form fields and hairline dividers.

---

## 2. STEP-BY-STEP IMPLEMENTATION PLAN FOR CLAUDE

### STEP 1: Implement Persistent Asset Storage Engine
1. In `apps/web/src/app/api/v1/uploads/route.ts` and `apps/console/src/app/api/v1/uploads/route.ts`:
   - Accept POST with `multipart/form-data` containing `file` and `type` (`banner` | `square_banner` | `avatar` | `logo`).
   - Validate file type and size.
   - Write file to `.server_data/uploads/` and symlink/copy to `public/uploads/`.
   - Return `{ url: "/uploads/[filename]", filename, size }`.
2. Update all client upload components (`EventArtworkInput.tsx`, community logo uploaders) to post to `/api/v1/uploads` and store the returned URL path.
3. Test by uploading a 16:9 banner and a 1:1 square banner, saving the event, hard-refreshing (`Ctrl+F5`), and verifying both images persist.

### STEP 2: Enforce Strict Role-Based Access Control (RBAC) & Route Security
1. In `apps/console/src/middleware.ts`:
   - Read the session token from the `hackways_session` cookie or `Authorization` header.
   - For any route matching `/console/super-admin/:path*`:
     - Verify session is valid.
     - Verify user account type is `ADMIN`.
     - Verify user email exists in `process.env.SUPER_ADMIN_EMAILS` (comma-separated allowlist).
     - If verification fails, return HTTP 403 or redirect to login.
   - For `/console/organizer/:path*`:
     - Verify user is logged in.
     - Verify user is the organizer of the requested event or channel.
2. In `apps/console/src/app/console/mockData.ts` and `CONSOLE_ROLES`:
   - Remove default auto-assignment to super admin. Default user role is `ATTENDEE`.
3. In `apps/web/src/middleware.ts`:
   - Protect attendee profile and management routes from unauthenticated access.

### STEP 3: Complete Cross-App Wiring & Bidirectional Navigation
1. Define shared environment variables in `.env` / `.env.production`:
   - `NEXT_PUBLIC_WEB_URL=http://localhost:3000` (or `https://hackways.com`)
   - `NEXT_PUBLIC_CONSOLE_URL=http://localhost:3001` (or `https://console.hackways.com`)
   - `HACKWAYS_DATA_DIR=/home/azureuser/event-t/.server_data`
2. Update `apps/console`:
   - On event overview page (`/console/events/[id]`): Add an external action button "Preview Live Page" pointing to `${NEXT_PUBLIC_WEB_URL}/events/${id}`.
   - On attendee list: Link attendee ticket codes to live pass verification `${NEXT_PUBLIC_WEB_URL}/verify?code=${ticketCode}`.
3. Update `apps/web`:
   - In `AppHeader.tsx`: If authenticated user has organizer or admin role, add a "Console" nav link to `${NEXT_PUBLIC_CONSOLE_URL}`.
   - On event detail page (`/events/[id]`): If authenticated user is the host/organizer, render "Manage in Console" button linking to `${NEXT_PUBLIC_CONSOLE_URL}/console/events/${id}`.

### STEP 4: Transactional Payment & Fee Pipeline Hardening
1. Ensure dynamic platform fee (4%) is calculated and applied to all paid tiers:
   - `platformFeeCents = Math.round((tierPriceCents * platformFeePercent) / 100)`
   - `totalPayableCents = tierPriceCents + platformFeeCents`
2. On payment completion via Razorpay:
   - Verify payment signature on the server via `crypto.createHmac("sha256", secret)`.
   - Update RSVP record immediately to `status: "CONFIRMED"`.
   - Write order record to `/api/v1/orders`.
   - Generate unique ticket reference `HKW-[EVENT_SUFFIX]-[RANDOM]`.
   - Send confirmation email with QR ticket pass via `lib/mailman.ts`.

### STEP 5: UI De-AI-fication Sweep
1. Remove all instances of:
   - "STEP 1 OF 2" and progress bars on single-page forms.
   - "INSTANT PASS" or "256-bit encrypted" pill badges.
   - Artificial "Review & Payment" screens that repeat sidebar data.
2. Standardize RSVP Page:
   - Left column: Clean 16:9 banner preview (or geometric fallback card if no banner), event title, date, venue, and live Pass Summary card showing ticket price, platform fee, and total.
   - Right column: Full name, email, phone (optional), tier selection (if multiple tiers exist), custom questions (if configured by host), and direct action button: `Pay ₹[Amount]` or `Complete registration`.
3. Verify pass display uses strictly "Request cancellation" instead of "Withdraw application".

---

## 3. VERIFICATION & ACCEPTANCE CRITERIA

Before declaring the task complete, verify the following in sequence:
1. **Asset Persistence**: Upload a banner and a square banner for an event -> Save -> Hard refresh the page -> Both banners must render cleanly with zero broken image icons or data loss.
2. **Security Lockdown**:
   - Access `/console/super-admin` as an unauthenticated or non-admin user -> Must be blocked with 403 Forbidden or redirected to login.
   - Access `/console/super-admin` with a verified admin session -> Dashboard renders cleanly.
3. **Cross-App Links**:
   - Click "Preview Live Page" in Console -> Successfully opens the event page in Web.
   - Click "Console" in Web header -> Successfully opens the management console.
4. **Clean Builds**:
   - Run `npm run build` in `apps/web` -> 0 errors.
   - Run `npm run build` in `apps/console` -> 0 errors.
5. **No Emojis & No Test Data**:
   - Grep codebase for emojis or dummy names ("John Doe", "test@") in user-facing routes -> 0 matches.
