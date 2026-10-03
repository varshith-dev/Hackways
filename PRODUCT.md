# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Event Hosts / Organizers:** Creators, summit leads, and student hackathon directors creating high-concurrency event drops, managing admission tiers, and auditing attendee rosters.
- **Attendees / Participants:** Students, developers, and attendees claiming limited capacity spots, securing instant RSVPs, and joining waitlists during flash drops.

## Product Purpose

Hackways is a high-performance event tech and ticketing platform built for flash crowd drops, live capacity management, instant RSVPs, hackathons, college summits, and cultural events. Success means zero overselling, zero queue friction, and an effortlessly clean, minimal registration experience.

## Positioning

High-throughput distributed concurrency engine (Go `rsvp-core` token bucket with atomic capacity decrements) combined with real-time SSE live capacity synchronization. Unlike bloated legacy ticketing platforms, Hackways delivers instant, zero-latency access with a clean, distraction-free aesthetic.

## Operating Context

- **Frontend:** Next.js 16 (React 19, Turbopack, Tailwind CSS) deployed as a clean, responsive web application on port 3000.
- **Core Engine:** Go 1.24 distributed RSVP and capacity microservice on port 8080 (gRPC port 50051).
- **Analytics Service:** Python 3.12 FastAPI analytics & attendance metrics service on port 8000.
- **Event Lifecycle:** Drop creation -> live capacity release -> instant RSVP / waitlist -> host guest management.

## Capabilities and Constraints

- **Confirmed Capabilities:**
  - Multi-tier event creation with independent capacity limits.
  - Real-time Server-Sent Events (SSE) capacity streaming to attendee browsers.
  - Idempotent RSVP submission preventing double-booking.
  - Immediate waitlist placement when tier capacity hits zero.
  - Host management console for viewing confirmed guests and waitlists.
- **Constraints:**
  - Strictly clean and minimal UI: zero fake metrics, zero marketing pills, zero clutter.
  - Zero overselling: concurrency safety enforced at the database/storage layer.
  - 1,000 Mouths Rule: effortless pronunciation and zero spelling ambiguity.

## Brand Commitments

- **Name:** Hackways (6 letters: `T - I - V - E - N - T`, blending *Ticket* + *Event*).
- **Aesthetic:** Ultra-clean, quiet luxury, minimal monochrome with high-contrast obsidian black (`#09090b`) and crisp neutral borders.
- **Tone:** Direct, confident, understated. Never loud, cheesy, or cluttered with synthetic telemetry labels.

## Evidence on Hand

- **Active Web App:** Next.js application at `apps/web` running on `http://localhost:3000`.
- **Active Backend Services:** Go `rsvp-core` server running on `http://localhost:8080` and Python `insights` service on `http://localhost:8000`.
- **Data Models:** Protocol Buffers definitions in `proto/eventflow/v1/rsvp.proto`.

## Product Principles

1. **Self-Evident Context:** The interface and name must be instantly understood without needing explanation or marketing copy.
2. **Pure Minimal Craft:** Every element on screen must serve a direct functional purpose; remove all artificial badges, fake stats, and decorative clutter.
3. **Absolute Concurrency Integrity:** Capacity counts and ticket locks are sacred; never oversell, never drop a confirmed spot, and synchronize live state in real time.
