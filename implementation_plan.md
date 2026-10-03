# Mandatory Authentication & Role-Based Access Control (RBAC) Architecture

## Executive Summary & Architecture Overview

Currently, several console surfaces under `/console/*` can be visited without an active session, and user roles are not strictly enforced.

This plan implements **Mandatory Authentication** for all console dashboards, an **Admin-Allotted Role Permission Engine**, and grants **Community Admins full access to the Eventing Console** (`/console/events/*` and `/console/events/[id]/*`), as explicitly requested.

---

## User Review Required

> [!IMPORTANT]
> **Key Security & Access Rules for Review:**
> 1. **Mandatory Dashboard Login**:
>    - All routes starting with `/console/*` and `/events/create` require an authenticated session (`hackways_session`).
>    - Unauthenticated requests are immediately intercepted by `middleware.ts` and redirected to `/login?redirect=${pathname}`.
> 2. **Role Permission Matrix**:
>    - `super_admin`: Full, unrestricted access to all consoles (`super-admin`, `kpi`, `users`, `marketing`, `organizer`, `events`, `channels`, `finance`, `checkin`, `team`).
>    - `organizer`: Access to `organizer`, `events`, `channels`, `marketing`, `finance`.
>    - `community_admin`: **Explicit User Requirement**: Granted full access to **Community Consoles** (`/console/channels/*`) and the **Eventing Console** (`/console/events/*`, `/console/events/[id]/*`), plus event creation. Prohibited from platform-wide administrative panels (`super-admin`, `kpi`, `users`).
>    - `event_manager`: Access to assigned `events`, `team`, and `checkin`.
>    - `checkin_staff`: Access to `checkin` scanner and attendee manifest only.
>    - `finance_manager`: Access to `finance` and payout ledger only.
>    - `attendee`: Standard buyer/guest with NO dashboard permissions. If an attendee attempts to access `/console/*`, they are redirected to an **"Access Restricted: Role Authorization Required"** page (`/console/unauthorized`).
> 3. **Admin Role Allotment in Console**:
>    - Super Admins can allot and change user roles in real-time under `/console/super-admin?tab=roles` and `/console/users`.
> 4. **Login Experience & Quick Demo Switcher**:
>    - `/login` provides standard email/password authentication (looking up allotted roles from the system store) plus quick-switch demo badges (`Super Admin`, `Community Admin`, `Platform Organizer`, `Attendee`) for instant verification.

---

## Permission Matrix

| Role | Community Console (`/console/channels/*`) | Eventing Console (`/console/events/*`) | Organizer Overview (`/console/organizer/*`) | Marketing Suite (`/console/marketing`) | Finance & Payouts (`/console/finance`) | Check-in Door Scanner (`/console/checkin`) | Super Admin & KPI (`/console/super-admin/*`, `/kpi`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Organizer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Community Admin** | ✅ | ✅ *(Explicit Requirement)* | ❌ *(Redirected to Channels)* | ❌ | ❌ | ✅ *(For Community Events)* | ❌ |
| **Event Manager** | ❌ | ✅ *(Assigned Events)* | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Check-in Staff** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Finance Manager** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Attendee / Guest** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Proposed Changes

### 1. Route Interception & Middleware
#### [MODIFY] [`apps/web/src/middleware.ts`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/middleware.ts)
- Intercept all `/console/*` routes and `/events/create`.
- If no session cookie exists (`hackways_session` or `eventflow_session`), redirect to `/login?redirect=${encodeURIComponent(pathname)}`.
- Extract session role and enforce permissions:
  - If role is `"attendee"`, redirect to `/console/unauthorized`.
  - If accessing `/console/super-admin`, `/console/kpi`, or `/console/users` without `super_admin` / `admin` role, redirect to permitted console.
  - If `community_admin` accesses `/console/organizer`, redirect to `/console/channels`.

---

### 2. Role Schema & Auth Engine
#### [MODIFY] [`apps/web/src/lib/types.ts`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/lib/types.ts)
- Expand `UserRole`:
  ```ts
  export type UserRole =
    | "super_admin"
    | "admin"
    | "organizer"
    | "community_admin"
    | "event_manager"
    | "checkin_staff"
    | "finance_manager"
    | "attendee";
  ```
- Update `UserSession`:
  ```ts
  export interface UserSession {
    userId: string;
    email: string;
    name: string;
    role: UserRole;
    managed_community_ids?: string[];
  }
  ```

#### [MODIFY] [`apps/web/src/lib/auth.ts`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/lib/auth.ts)
- Add role-specific mock credentials and user lookup:
  - `Varshith Chowdary` (`varshith@hackways.com`) -> `super_admin`
  - `Rohit Reddy` (`community.admin@aihyd.org`) -> `community_admin` (managed_community_ids: `["ch_ai_hyderabad"]`)
  - `Elena Rostova` (`elena.rostova@systems.org`) -> `organizer`
  - `Alex Rivers` (`alex.rivers@cloudtech.com`) -> `attendee`
- Add role verification helper functions: `isSuperAdmin(user)`, `canAccessEventing(user)`, `canAccessCommunity(user, communityId)`.

---

### 3. Login Page Upgrades
#### [MODIFY] [`apps/web/src/app/login/page.tsx`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/app/login/page.tsx)
- Support role allotment lookup: when an email is entered, assign the allotted role from `serverStore` / registered user profiles rather than forcing `"attendee"`.
- Add **1-Click Role Login Badges** for instant testing:
  - `Super Admin (Full Access)`
  - `Community Admin (Community + Eventing Console)`
  - `Platform Organizer (Events + Marketing + Channels)`
  - `Standard Attendee (Ticket Passes Only)`

---

### 4. Console Layout & Role-Based Sidebar Navigation
#### [MODIFY] [`apps/web/src/app/console/layout.tsx`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/app/console/layout.tsx)
- Check authenticated user from `useAuth()`.
- Filter the top console switcher dropdown based on the user's allotted permissions:
  - `community_admin` only sees: **"Community Consoles"** and **"Event Operations"**.
  - `organizer` sees: Organizer, Marketing, Events, Communities, Payouts.
  - `super_admin` sees all consoles.
- If an unauthorized user attempts to view a restricted console, render an elegant **"Access Restricted: Role Authorization Required"** canvas.

---

### 5. Access Restricted Page
#### [NEW] [`apps/web/src/app/console/unauthorized/page.tsx`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/app/console/unauthorized/page.tsx)
- Clean, executive page explaining that access to internal consoles requires an organizer or community admin role allotted by the administrator.
- Action to return to `/my-tickets` or switch accounts.

---

### 6. Admin Role Allotment Interface
#### [MODIFY] [`apps/web/src/app/console/super-admin/SuperAdminView.tsx`](file:///c:/Users/ADMIN/Desktop/event-t/apps/web/src/app/console/super-admin/SuperAdminView.tsx)
- In the `roles` and `attendees` tabs, add an interactive **"Allot Role"** selector:
  - Allows the Super Admin to change any user's role to `super_admin`, `organizer`, `community_admin`, `event_manager`, `checkin_staff`, or `attendee`.
  - Persists role update across localStorage and serverStore.

---

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` to verify type safety across updated middleware, auth types, and console layouts.

### Manual Verification
1. **Unauthenticated Access Check**:
   - Clear session cookie and navigate to `/console/organizer/overview`.
   - Verify immediate redirect to `/login?redirect=%2Fconsole%2Forganizer%2Foverview`.
2. **Community Admin Access**:
   - Log in as **Community Admin** (`community.admin@aihyd.org`).
   - Navigate to `/console/channels/ch_ai_hyderabad` -> Confirm access.
   - Navigate to `/console/events/evt_test_launch_01/overview` (The Eventing Console) -> Confirm **Full Access** granted!
   - Attempt to navigate to `/console/super-admin` -> Confirm access is blocked.
3. **Attendee Access Check**:
   - Log in as **Attendee** (`alex.rivers@cloudtech.com`).
   - Navigate to `/console/organizer` -> Confirm redirect to `/console/unauthorized`.
4. **Admin Role Allotment**:
   - Log in as **Super Admin** -> Promote an attendee to **Community Admin** -> Verify the user can now access the Eventing Console.
