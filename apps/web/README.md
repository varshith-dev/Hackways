This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Event browsing

`/explore` shows public, published events in a compact date-first list. Search
matches titles, hosts, categories, and locations. `/my-events` shows the signed-in
account's attendee registrations in Upcoming and Past views; saved-only or
hosted-only events do not appear there. Bookmarking stays available from
Discover. Registration history and bookmarks live in this browser's storage
(scoped per account for bookmarks); they are not synced across devices.

Square event thumbnails prioritize `square_banner_url`; landscape surfaces
prioritize `banner_url`. Both fields are retained. Missing artwork uses a neutral
placeholder, never a stock photo. Known legacy demo communities and stock-photo
defaults are removed without clearing user-created records.

Dashboards start without fabricated identities, banking details, sessions, or
telemetry. Missing integrations display unavailable data rather than invented
measurements. The RSVP service no longer seeds demo events at startup. Console
empty states use the supplied dashboard artwork; uploaded event media stays
separate from these illustrations.

Run `npx playwright test` for desktop, mobile, and dark-mode browsing coverage.
The configuration uses Microsoft Edge and starts or reuses the local dev server.
Tests use isolated browser fixtures and do not seed the application database.

`/channels/create` provides a centered community form with a required name,
optional description, and optional PNG/JPG/WebP logo (up to 2 MB). Creation uses
the signed-in owner, stores the community in this browser, and reports storage
failures without discarding the form. The community tests cover uploads,
signed-out access, persistence, and storage errors.

`/events/create` begins with two hosting options. Solo hosting continues to
`/events/create/details?host=solo`. Community hosting opens a separate picker at
`/events/create/community`; accounts without a community continue directly to
`/channels/create?next=event`. Creating a community in that flow returns to event
details with the new community selected.

Event details include the name, editable link, and independent 16:9 and 1:1
artwork uploads or links. Submission moves to `/events/create/setup`, with a
thick yellow progress ring while saving a draft with 100 free admission places.
The ring reflects setup stages, not estimated upload percentage, and completes
only when the server confirms persistence. The console opens automatically.
Setup errors offer retry or a return to the retained details; retries reuse the
draft ID. Pending details stay in the creation layout's memory, not browser
storage: refreshing an unsaved setup page offers an explicit restart rather
than creating a blank event. Community access is checked against the signed-in
account in the selection and details steps.

## Mobile event management

Event console links open `/mobile/events/[id]/[tab]` at viewport widths up to
767px. Wider screens use the existing `/console/events/[id]/[tab]` dashboard.
Changing the viewport preserves the event, module, query, and fragment; the
organizer-wide desktop dashboard is not replaced.

The mobile dashboard has its own compact overview and collapsible event sidebar.
Management modules reuse the existing event data and actions, with single-column
forms, touch-sized controls, and stacked ticket, order, and attendee records.
Other wide reporting tables scroll within their own container. Both landscape
and square banner editors remain independent. Mobile presentation is not an
additional authorization boundary: the routes inherit the existing console's
access behavior and management APIs; no new authentication layer is introduced.

The development indicator is disabled so its floating control cannot cover
mobile actions. Next.js compile and runtime error overlays remain enabled.

## Console access control & platform fees

Console modules (Marketing, Platform Analytics, Door Check-in, Payouts,
Co-organizer, Communities) are gated per role by a server-side access matrix
enforced in `src/proxy.ts` before any page renders; the console layout also
hides disallowed modules from the switcher and shows a no-access state. User
Management and Super Admin always stay admin-only. Only the platform super
admin (`varshith.code@gmail.com`, admin role) can change the matrix and the
platform fee percentage — via Super Admin → Platform Settings, persisted in
`.server_data/platform_store.json` through `/api/v1/platform/settings`
(authenticated GET, super-admin-only PATCH). The fee percentage drives the
Platform Fees figure in event finance views.

Session UX: the signed-in state hydrates instantly from a validated local
cache (`src/lib/sessionCache.ts`) and revalidates against `/api/v1/auth/me` in
the background — a 401 clears it, offline keeps it. Loading screens across
settings, console start, event creation, and user detail pages use the shared
`Skeleton`/`PageSkeleton` components instead of blank or sign-in flashes.

Run `npx playwright test mobile-event-dashboard.spec.ts --project=desktop`
for mobile-width routing, management, banner persistence, and desktop fallback
coverage. The tests set their own viewport sizes.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
