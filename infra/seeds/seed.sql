-- EventFlow Demo Seeds: infra/seeds/seed.sql

-- Fixed UUIDs for repeatable demo testing
-- Event 1: Viral Flash-Crowd Event (Limited Seats)
INSERT INTO events (id, title, description, organizer_id, status, rsvp_deadline, total_capacity, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'HyperScale Conf 2026: Distributed Systems Summit',
    'Join 1,000+ elite engineers diving deep into high-throughput consensus, edge compute, and low-latency stream architectures.',
    'org_01_sysarch',
    'PUBLISHED',
    NOW() + INTERVAL '14 days',
    100,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_tiers (id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'VIP Backstage Access', 10, 2, 49900, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'General Admission Pass', 90, 8, 9900, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Event 2: Sold-Out Event with Active Waitlist
INSERT INTO events (id, title, description, organizer_id, status, rsvp_deadline, total_capacity, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'AI Frontiers Private Keynote & Fireside Chat',
    'An exclusive, invite-only roundtable on next-gen transformer reasoning models and autonomous agent swarms.',
    'org_02_ai_lab',
    'SOLD_OUT',
    NOW() + INTERVAL '3 days',
    30,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_tiers (id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at)
VALUES 
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Private Round Table Seat', 30, 0, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed some RSVPs for Event 2 (30 confirmed)
INSERT INTO rsvps (id, event_id, tier_id, user_id, user_email, user_name, status, created_at, updated_at)
SELECT 
    uuid_generate_v4(),
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'user_' || i,
    'attendee_' || i || '@example.com',
    'Attendee ' || i,
    'CONFIRMED',
    NOW() - (i || ' minutes')::INTERVAL,
    NOW()
FROM generate_series(1, 30) AS i
ON CONFLICT DO NOTHING;

-- Seed 5 Waitlist Entries for Event 2
INSERT INTO rsvps (id, event_id, tier_id, user_id, user_email, user_name, status, created_at, updated_at)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'user_wl_1', 'waitlist1@example.com', 'Elena Rostova', 'WAITLIST', NOW(), NOW()),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'user_wl_2', 'waitlist2@example.com', 'Marcus Chen', 'WAITLIST', NOW(), NOW()),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'user_wl_3', 'waitlist3@example.com', 'Sarah Jenkins', 'WAITLIST', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO waitlist_entries (id, event_id, tier_id, rsvp_id, user_id, position, status, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'user_wl_1', 1, 'ACTIVE', NOW(), NOW()),
    (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'user_wl_2', 2, 'ACTIVE', NOW(), NOW()),
    (uuid_generate_v4(), 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'user_wl_3', 3, 'ACTIVE', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Event 3: High Capacity Tech Mixer
INSERT INTO events (id, title, description, organizer_id, status, rsvp_deadline, total_capacity, created_at, updated_at)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'Tech Leaders Mixer & Founder Showcase',
    'Casual evening mixer connecting tech founders, seed angel syndicates, and senior staff engineers.',
    'org_03_network',
    'PUBLISHED',
    NOW() + INTERVAL '21 days',
    500,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_tiers (id, event_id, name, total_capacity, remaining_capacity, price_cents, created_at, updated_at)
VALUES 
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Standard Registration', 500, 420, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
