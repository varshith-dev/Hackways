#!/usr/bin/env node
// One-time backfill: .server_data/platform_store.json -> Postgres (migrations
// 000004/000005). TEMPLATE — written for review, not run by me (no reachable
// Postgres from this machine). Safe-by-default: prints a plan and does
// nothing unless you pass --execute. Idempotent either way (every insert
// uses ON CONFLICT DO NOTHING/UPDATE), so re-running after a partial/aborted
// run or after fixing a reconciliation warning is safe.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate-flat-file-to-postgres.mjs          # dry run (default)
//   DATABASE_URL=postgres://... node scripts/migrate-flat-file-to-postgres.mjs --execute # actually writes
//
// Run this AFTER applying migrations 000004 and 000005 by hand (see
// DEPLOYMENT.md's existing migration process) — it assumes those columns
// and tables already exist.

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes("--execute");

// Mirrors lib/serverStore.ts's DATA_DIR resolution: this script lives at
// apps/web/scripts/, so ../../../.server_data is the same repo-root path.
const DATA_DIR = process.env.HACKWAYS_DATA_DIR || process.env.DATA_DIR || path.resolve(__dirname, "..", "..", "..", ".server_data");
const STORE_FILE = path.join(DATA_DIR, "platform_store.json");

function log(...args) {
  console.log(...args);
}

async function main() {
  log(`Mode: ${EXECUTE ? "EXECUTE (writing to Postgres)" : "DRY RUN (no writes — pass --execute to apply)"}`);
  log(`Reading ${STORE_FILE}`);

  const raw = JSON.parse(readFileSync(STORE_FILE, "utf-8"));
  const events = raw.events || [];
  const attendees = raw.attendees || [];
  const orders = raw.orders || [];
  const teams = raw.teams || [];
  const channels = raw.channels || [];
  const users = raw.users || [];
  const settings = raw.settings;
  const shortLinks = raw.short_links || [];

  log(`Found: ${events.length} events, ${attendees.length} attendees, ${orders.length} orders, ${teams.length} teams, ${channels.length} channels, ${users.length} users, ${shortLinks.length} short links, settings: ${settings ? "yes" : "no"}`);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/eventflow" });
  // Connect even in dry-run, if a DB happens to be reachable — a dry run
  // with a real connection gives a genuine reconciliation preview (who'd
  // actually match) instead of a trivial "everything unmatched" result.
  // Written from a machine with no DB access, so this path isn't exercised
  // here; falls back cleanly to the no-connection dry run below if it
  // can't connect.
  let client = null;
  try {
    client = await pool.connect();
  } catch (err) {
    if (EXECUTE) throw err; // --execute with no DB is a real failure, not a fallback case
    log(`(No database reachable for a connected preview — ${err.message}. Showing an unconnected dry run instead: every organizer/owner will show as unmatched below, which is an artifact of not querying Postgres, not a real reconciliation problem.)`);
  }

  try {
    // ------------------------------------------------------------------
    // 1. Users first — everything else's organizer_id/user_id references
    // resolve against this. Matched by EMAIL, not id: the flat file's
    // ServerUserRecord.id and Go's real users.id are not guaranteed to be
    // the same value (two independently-seeded id spaces) — email is the
    // one field both sides agree on.
    // ------------------------------------------------------------------
    const emailToPgId = new Map(); // lowercased email -> Postgres users.id
    if (client) {
      const { rows } = await client.query(`SELECT id, LOWER(email) AS email FROM users`);
      for (const r of rows) emailToPgId.set(r.email, r.id);
    }

    let usersMatched = 0, usersUnmatched = 0;
    for (const u of users) {
      const email = (u.email || "").toLowerCase();
      if (!email) continue;
      const pgId = emailToPgId.get(email);
      if (!pgId) {
        usersUnmatched++;
        log(`  [skip-warn] user "${u.email}" has no matching Postgres users row — Go signup/login creates that row; this script only enriches existing rows, never creates auth accounts.`);
        continue;
      }
      usersMatched++;
      if (EXECUTE) {
        await client.query(
          `UPDATE users SET
             username = COALESCE($2, username),
             phone = COALESCE($3, phone),
             avatar = COALESCE($4, avatar),
             account_status = COALESCE($5, account_status),
             verification_status = COALESCE($6, verification_status),
             notes = COALESCE($7::jsonb, notes),
             communications = COALESCE($8::jsonb, communications),
             last_active = COALESCE($9::timestamptz, last_active)
           WHERE id = $1`,
          [pgId, u.username || null, u.phone || null, u.avatar || null, u.accountStatus || null, u.verificationStatus || null,
           u.notes ? JSON.stringify(u.notes) : null, u.communications ? JSON.stringify(u.communications) : null, u.lastActive || null]
        );
      }
    }
    log(`Users: ${usersMatched} matched/updated, ${usersUnmatched} unmatched (left untouched)`);

    // Resolve organizer_id (ServerUserRecord.id or raw email) -> Postgres users.id
    function resolveUserId(flatFileUserIdOrEmail) {
      if (!flatFileUserIdOrEmail) return null;
      const asEmail = flatFileUserIdOrEmail.toLowerCase();
      if (emailToPgId.has(asEmail)) return emailToPgId.get(asEmail);
      const flatUser = users.find((u) => u.id === flatFileUserIdOrEmail);
      if (flatUser) return emailToPgId.get((flatUser.email || "").toLowerCase()) || null;
      return null;
    }

    // ------------------------------------------------------------------
    // 2. Channels (no dependency on events)
    // ------------------------------------------------------------------
    let channelsOk = 0, channelsSkipped = 0;
    for (const c of channels) {
      const ownerId = resolveUserId(c.owner_id);
      if (!ownerId) { channelsSkipped++; log(`  [skip-warn] channel "${c.slug}" owner "${c.owner_id}" unresolved — skipping`); continue; }
      channelsOk++;
      if (EXECUTE) {
        await client.query(
          `INSERT INTO channels (id, slug, name, description, owner_id, owner_name, avatar_url, banner_url, follower_count, is_private, visibility, verified, social_links, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.slug, c.name, c.description || null, ownerId, c.owner_name || null, c.avatar_url || null, c.banner_url || null,
           c.follower_count || 0, !!c.is_private, c.visibility || "PUBLIC", !!c.verified, JSON.stringify(c.social_links || {}), c.created_at]
        );
        for (const m of c.members || []) {
          const memberId = resolveUserId(m.user_id);
          if (!memberId) continue;
          await client.query(
            `INSERT INTO channel_members (channel_id, user_id, role, avatar_url, assigned_event_ids, added_at)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT (channel_id, user_id) DO NOTHING`,
            [c.id, memberId, m.role || "host", m.avatar_url || null, JSON.stringify(m.assigned_event_ids || []), m.added_at]
          );
        }
      }
    }
    log(`Channels: ${channelsOk} ready, ${channelsSkipped} skipped (unresolved owner)`);

    // ------------------------------------------------------------------
    // 3. Events + tiers. Tier capacity is NOT overwritten on conflict —
    // Go's rsvp-core may have already decremented remaining_capacity via
    // real reservations; this backfill only matters for a tier id that
    // doesn't exist yet.
    // ------------------------------------------------------------------
    const eventIdMap = new Map(); // flat-file event.id -> Postgres events.id (same value if events.id is already a UUID)
    let eventsOk = 0, eventsSkipped = 0;
    for (const e of events) {
      const organizerId = resolveUserId(e.organizer_id);
      if (!organizerId) { eventsSkipped++; log(`  [skip-warn] event "${e.slug || e.id}" organizer "${e.organizer_id}" unresolved — skipping`); continue; }
      eventsOk++;
      eventIdMap.set(e.id, e.id);
      if (EXECUTE) {
        await client.query(
          `INSERT INTO events (id, title, description, organizer_id, status, rsvp_deadline, total_capacity, banner_url, square_banner_url, location, category, created_at, updated_at,
             slug, visibility, page_theme, media_assets, schedule, faqs, custom_questions, partners, contact_email, contact_phone,
             team_registration_enabled, team_min_size, team_max_size, deleted_at, deletion_reason)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,
             $13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21,$22,$23,$24,$25,$26,$27)
           ON CONFLICT (id) DO NOTHING`,
          [e.id, e.title, e.description || "", organizerId, e.status || "PUBLISHED", e.rsvp_deadline || null, e.total_capacity || 0,
           e.banner_url || null, e.square_banner_url || null, e.location || null, e.category || null, e.created_at,
           e.slug || null, e.visibility || "PUBLIC", e.page_theme || "auto", JSON.stringify(e.media_assets || []),
           JSON.stringify(e.schedule || []), JSON.stringify(e.faqs || []), JSON.stringify(e.custom_questions || []),
           JSON.stringify(e.partners || []), e.contact_email || null, e.contact_phone || null,
           !!e.team_registration_enabled, e.team_min_size || null, e.team_max_size || null, e.deleted_at || null, e.deletion_reason || null]
        );
        for (const t of e.tiers || []) {
          await client.query(
            `INSERT INTO ticket_tiers (id, event_id, name, total_capacity, remaining_capacity, price_cents, approval_mode, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
             ON CONFLICT (id) DO NOTHING`,
            [t.id, e.id, t.name, t.total_capacity || 0, t.remaining_capacity ?? t.total_capacity ?? 0, t.price_cents || 0, t.approval_mode || "AUTO_APPROVE"]
          );
        }
      }
    }
    log(`Events: ${eventsOk} ready (+ tiers), ${eventsSkipped} skipped (unresolved organizer)`);

    // ------------------------------------------------------------------
    // 4. Teams (before attendees, so rsvps.team_id can reference them)
    // ------------------------------------------------------------------
    let teamsOk = 0;
    for (const t of teams) {
      teamsOk++;
      if (EXECUTE) {
        await client.query(
          `INSERT INTO teams (id, event_id, name, code, leader_name, leader_email, min_size, max_size, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [t.id, t.event_id, t.name, t.code, t.leader_name || null, t.leader_email || null, t.min_size || null, t.max_size || null, t.status || "OPEN", t.created_at]
        );
      }
    }
    log(`Teams: ${teamsOk} ready`);

    // ------------------------------------------------------------------
    // 5. Attendees -> rsvps. Only inserts a NEW rsvp row if one with this
    // id doesn't already exist (e.g. from a real Go-processed RSVP) —
    // never overwrites ticket status/check-in state that's already live.
    // ------------------------------------------------------------------
    let attendeesOk = 0;
    for (const a of attendees) {
      // team_id: find which team (if any) this attendee belongs to via its members list
      const team = teams.find((t) => (t.members || []).some((m) => m.email?.toLowerCase() === a.email?.toLowerCase() && t.event_id === a.eventId));
      attendeesOk++;
      if (EXECUTE) {
        await client.query(
          `INSERT INTO rsvps (id, event_id, tier_id, user_id, user_email, user_name, status, created_at, updated_at,
             ticket_code, phone, checked_in_at, checked_in_by, entrance, is_vip, is_speaker, answers, team_id, cancelled_at, cancel_reason)
           VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$7,
             $8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18)
           ON CONFLICT DO NOTHING`,
          [a.eventId, a.tierId, a.id, a.email, a.name, a.status, a.registeredAt,
           a.ticketCode, a.phone || null, a.checkedInAt || null, a.checkedInBy || null, a.entrance || null,
           !!a.isVip, !!a.isSpeaker, JSON.stringify(a.answers || {}), team?.id || null, a.cancelledAt || null, a.cancelReason || null]
        );
      }
    }
    log(`Attendees: ${attendeesOk} ready (as rsvps — note: id is NOT preserved, a fresh UUID is generated since rsvps.id is UUID-typed and flat-file attendee ids like "att_..." aren't; ticket_code is preserved and remains the real lookup key)`);

    // ------------------------------------------------------------------
    // 6. Orders
    // ------------------------------------------------------------------
    let ordersOk = 0;
    for (const o of orders) {
      ordersOk++;
      if (EXECUTE) {
        await client.query(
          `INSERT INTO orders (id, ticket_code, event_id, event_name, tier_id, tier_name, buyer_name, buyer_email, amount_cents, status, payment_method, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO NOTHING`,
          [o.id, o.ticketCode || null, o.eventId, o.eventName || null, o.tierId || null, o.tierName || null,
           o.buyerName || null, o.buyerEmail || null, Math.round((o.amount || 0) * 100), o.status || "COMPLETED", o.paymentMethod || null, o.createdAt]
        );
      }
    }
    log(`Orders: ${ordersOk} ready`);

    // ------------------------------------------------------------------
    // 7. Platform settings (single row) + short links
    // ------------------------------------------------------------------
    if (settings && EXECUTE) {
      await client.query(
        `INSERT INTO platform_settings (singleton, module_access, platform_fee_percent, payment_gateways, updated_at, updated_by)
         VALUES (TRUE, $1::jsonb, $2, $3::jsonb, $4, $5)
         ON CONFLICT (singleton) DO UPDATE SET
           module_access = $1::jsonb, platform_fee_percent = $2, payment_gateways = $3::jsonb, updated_at = $4, updated_by = $5`,
        [JSON.stringify(settings.moduleAccess || {}), settings.platformFeePercent ?? 4, JSON.stringify(settings.paymentGateways || {}), settings.updatedAt || null, settings.updatedBy || null]
      );
    }
    log(`Settings: ${settings ? "ready" : "none in flat file"}`);

    let linksOk = 0;
    for (const l of shortLinks) {
      linksOk++;
      if (EXECUTE) {
        await client.query(
          `INSERT INTO short_links (id, code, title, destination_url, scope, event_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, clicks, unique_visitors, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (id) DO NOTHING`,
          [l.id, l.code, l.title || null, l.destination_url, l.scope || "PLATFORM", l.event_id || null,
           l.utm_source || null, l.utm_medium || null, l.utm_campaign || null, l.utm_term || null, l.utm_content || null,
           l.clicks || 0, l.unique_visitors || 0, l.created_at]
        );
      }
    }
    log(`Short links: ${linksOk} ready`);

    log(EXECUTE ? "\nDone — writes committed." : "\nDry run complete — nothing was written. Re-run with --execute to apply.");
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
