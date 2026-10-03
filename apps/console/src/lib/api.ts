import { EventItem, CapacitySnapshot, RSVPResponse, RSVPStatus, Channel, ChannelMember, ChannelRole, EventTeam, TeamMember, MediaAsset } from "./types";
import { cleanEventArtwork, cleanLegacyBrowserData, cleanSeededChannels } from "./demoCleanup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export const BANNER_PRESETS: Array<{
  id: string;
  name: string;
  url: string;
  category: string;
}> = [];


export const INITIAL_CHANNELS: Channel[] = [];

// Empty demo events export for backwards-compatibility without any fake data
export const DEMO_EVENTS: EventItem[] = [];

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Unified Platform Persistent Store Keys (v7 Clean Slate)
// ---------------------------------------------------------------------------
const EVENTS_STORAGE_KEY = "hackways_events_v7";
const TICKETS_STORAGE_KEY = "hackways_tickets_v7";
const ATTENDEES_STORAGE_KEY = "hackways_attendees_v7";
const ORDERS_STORAGE_KEY = "hackways_orders_v7";
const CHANNELS_STORAGE_KEY = "hackways_communities_v9";
const FEATURED_EVENT_KEY = "hackways_featured_event_id_v7";

// Remove known demo content without clearing real events, tickets, or accounts.
if (typeof window !== "undefined") {
  try {
    cleanLegacyBrowserData(localStorage);
  } catch (error) {
    console.error("Unable to remove legacy demo content from browser storage", error);
  }
  try {

    // Bi-directional synchronization: Server store (.server_data/platform_store.json) -> Local Storage
    fetch("/api/v1/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.events && Array.isArray(data.events)) {
          const serverEvents: EventItem[] = data.events.map(cleanEventArtwork);
          // Store server events — extract tiers into isolated per-event keys
          serverEvents.forEach((e) => {
            try {
              localStorage.setItem(`hackways_event_${e.id}`, JSON.stringify(e));
              if (e.slug) {
                localStorage.setItem(`hackways_event_${e.slug.toLowerCase()}`, JSON.stringify(e));
              }
              if (e.tiers && e.tiers.length > 0) {
                const existing = localStorage.getItem(`hackways_tiers_${e.id}`);
                if (!existing) {
                  localStorage.setItem(`hackways_tiers_${e.id}`, JSON.stringify(e.tiers));
                }
              }
            } catch {}
          });
          localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(serverEvents));
          window.dispatchEvent(new CustomEvent("hackways_events_updated", { detail: serverEvents }));
        }
      })
      .catch(() => {});

    fetch("/api/v1/attendees")
      .then((r) => r.json())
      .then((data) => {
        if (data.attendees && Array.isArray(data.attendees)) {
          const serverAttendees: StoredAttendee[] = data.attendees;
          localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(serverAttendees));
          window.dispatchEvent(new CustomEvent("hackways_attendees_updated", { detail: serverAttendees }));
        }
      })
      .catch(() => {});

    fetch("/api/v1/orders")
      .then((r) => r.json())
      .then((data) => {
        if (data.orders && Array.isArray(data.orders)) {
          const serverOrders: StoredOrder[] = data.orders;
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(serverOrders));
          window.dispatchEvent(new CustomEvent("hackways_orders_updated", { detail: serverOrders }));
        }
      })
      .catch(() => {});
  } catch {}
}


export interface UserTicket {
  id: string;
  ticket_code: string;
  event_id: string;
  event_title: string;
  event_banner?: string; // 16:9
  event_square_banner?: string; // 1:1
  event_location?: string;
  event_city?: string;
  event_start_time?: string;
  event_time_display?: string;
  tier_id: string;
  tier_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  price_cents: number;
  status: "CONFIRMED" | "CHECKED_IN" | "WAITLIST" | "PENDING_APPROVAL" | "CANCELLED";
  checked_in_at?: string;
  created_at: string;
}

export interface StoredAttendee {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  tierName: string;
  tierId: string;
  ticketCode: string;
  priceFormatted: string;
  status: "CONFIRMED" | "CHECKED_IN" | "REFUNDED" | "WAITLIST" | "PENDING_APPROVAL" | "REJECTED" | "CANCELLED" | "BLOCKED";
  approvalMode?: "AUTO_APPROVE" | "REQUIRES_APPROVAL" | "OVERFLOW_WAITLIST";
  answers?: Record<string, string | string[]>;
  checkedInAt?: string;
  checkedInBy?: string;
  entrance?: string;
  isVip?: boolean;
  isSpeaker?: boolean;
  registeredAt: string;
  cancellationRequested?: boolean;
  cancellationRequestedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface StoredOrder {
  id: string;
  ticketCode: string;
  eventId: string;
  eventName: string;
  buyerName: string;
  buyerEmail: string;
  tierName: string;
  tierId: string;
  amount: number;
  status: "CONFIRMED" | "REFUNDED" | "DISPUTED";
  paymentMethod: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Events API & Storage
// ---------------------------------------------------------------------------
export function getStoredEvents(includeDeleted: boolean = false): EventItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const events: EventItem[] = JSON.parse(raw);
    const filtered = includeDeleted
      ? events
      : events.filter((e) => !e.deleted_by_organizer && e.status !== "DELETED");

    // Hydrate each event's tiers from its isolated per-event key.
    // This prevents tiers from Event A bleeding into Event B when loaded in bulk.
    return filtered.map((ev) => {
      try {
        const perEventTiers = localStorage.getItem(`hackways_tiers_${ev.id}`);
        if (perEventTiers) {
          return { ...ev, tiers: JSON.parse(perEventTiers) };
        }
        // If no per-event tier key exists, ensure tiers is always an empty array
        // (never inherited from another event's data)
        return { ...ev, tiers: ev.tiers ?? [] };
      } catch {
        return { ...ev, tiers: [] };
      }
    });
  } catch {
    return [];
  }
}

function safeSaveEventsList(events: EventItem[]): void {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("Storage quota exceeded in saveEvent. Attempting automatic cleanup & compaction...", e);
    try {
      // 1. Purge soft-deleted events
      const cleaned = events.filter((ev) => !ev.deleted_by_organizer && ev.status !== "DELETED");
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(cleaned));
      return;
    } catch {}

    try {
      // 2. Strip large base64 strings from older events
      const compacted = events
        .filter((ev) => !ev.deleted_by_organizer && ev.status !== "DELETED")
        .map((ev, idx) => {
          if (idx > 0) {
            const copy = { ...ev };
            if (copy.banner_url && copy.banner_url.length > 50000) {
              copy.banner_url = "";
            }
            if (copy.square_banner_url && copy.square_banner_url.length > 50000) {
              copy.square_banner_url = "";
            }
            if (copy.media_assets) {
              copy.media_assets = copy.media_assets.filter((m) => !m.url?.startsWith("data:"));
            }
            return copy;
          }
          return ev;
        });
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(compacted));
      return;
    } catch {}

    try {
      // 3. Keep only top recent 8 events and trim heavy strings
      const topRecent = events
        .filter((ev) => !ev.deleted_by_organizer && ev.status !== "DELETED")
        .slice(0, 8)
        .map((ev) => {
          const copy = { ...ev };
          if (copy.banner_url && copy.banner_url.length > 100000) {
            copy.banner_url = "";
          }
          if (copy.square_banner_url && copy.square_banner_url.length > 100000) {
            copy.square_banner_url = "";
          }
          if (copy.media_assets) {
            copy.media_assets = [];
          }
          return copy;
        });
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(topRecent));
    } catch (finalErr) {
      console.error("Critical: Unable to save to localStorage after compaction:", finalErr);
    }
  }
}

export function saveEvent(event: EventItem): EventItem {
  if (typeof window === "undefined") return event;
  try {
    const current = getStoredEvents(true); // Preserve all items including archived/deleted
    const existingIdx = current.findIndex((e) => e.id === event.id);

    // Normalize or auto-generate slug
    if (event.slug?.trim()) {
      event.slug = event.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    } else if (event.title?.trim()) {
      event.slug = event.title.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    }

    // By default, every new event has a General Admission (Free) ticket tier that can be modified or removed
    if (existingIdx === -1 && (!event.tiers || event.tiers.length === 0)) {
      const defaultTier = {
        id: `tkt_${Date.now()}`,
        event_id: event.id,
        name: "General Admission",
        price_cents: 0,
        total_capacity: 0,
        remaining_capacity: 0,
        approval_mode: "AUTO_APPROVE" as const,
      };
      event.tiers = [defaultTier];
      event.total_capacity = event.total_capacity || 0;
    }

    // Strip tiers from the bulk store — they live in hackways_tiers_${id} exclusively
    const eventWithoutTiers = { ...event, tiers: [] };
    let updated: EventItem[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = eventWithoutTiers;
    } else {
      updated = [eventWithoutTiers, ...current];
    }
    safeSaveEventsList(updated);

    // Strict per-event dedicated storage to ensure 100% isolation across accounts & events
    try {
      localStorage.setItem(`hackways_event_${event.id}`, JSON.stringify(event));
      if (event.slug) {
        localStorage.setItem(`hackways_event_${event.slug.toLowerCase()}`, JSON.stringify(event));
      }
      if (event.tiers) {
        localStorage.setItem(`hackways_tiers_${event.id}`, JSON.stringify(event.tiers));
      }
    } catch {}

    // Background sync to server store
    try {
      fetch(`/api/v1/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      })
        .then((res) => {
          if (!res.ok && res.status === 404) {
            return fetch("/api/v1/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(event),
            });
          }
        })
        .catch(() => {
          fetch("/api/v1/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
          }).catch(() => {});
        });
    } catch {}

    window.dispatchEvent(new CustomEvent("hackways_events_updated", { detail: event }));
    return event;
  } catch (e) {
    console.error("Failed to save event to local store:", e);
    return event;
  }
}

export async function saveEventAsync(event: EventItem): Promise<EventItem> {
  saveEvent(event);
  try {
    const res = await fetch(`/api/v1/events/${encodeURIComponent(event.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok && res.status === 404) {
      await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    }
  } catch (err) {
    console.warn("Async event save sync error:", err);
  }
  return event;
}

export function deleteEvent(id: string, reason?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getStoredEvents(true);
    const existingIdx = current.findIndex((e) => e.id === id);
    if (existingIdx === -1) return false;

    // Soft-delete: Mark as deleted for organizer and public, but retain for Super Admin audit & compliance
    current[existingIdx] = {
      ...current[existingIdx],
      status: "DELETED",
      deleted_by_organizer: true,
      deleted_at: new Date().toISOString(),
      deletion_reason: reason || "Deleted by organizer with title confirmation",
    };

    safeSaveEventsList(current);
    try {
      localStorage.removeItem(`hackways_event_${id}`);
      localStorage.removeItem(`hackways_tiers_${id}`);
    } catch {}

    // Background sync deletion to server store
    try {
      fetch(`/api/v1/events/${id}`, {
        method: "DELETE",
      }).catch(() => {});
    } catch {}

    window.dispatchEvent(new CustomEvent("hackways_events_updated", { detail: { id, deleted: true } }));
    return true;
  } catch {
    return false;
  }
}

export function isEventPubliclyDiscoverable(event: EventItem): boolean {
  if (event.deleted_by_organizer || event.status === "DELETED") return false;
  // If event is explicitly marked PRIVATE, hide from discovery page
  if (event.visibility === "PRIVATE") return false;
  // If event's community is private, events are private and only community members know about them
  if (event.channel_is_private) return false;
  if (event.channel_id) {
    const channels = getStoredChannels();
    const channel = channels.find((c: Channel) => c.id === event.channel_id);
    if (channel && (channel.visibility === "PRIVATE" || channel.is_private)) {
      return false;
    }
  }
  return true;
}

export async function getEvents(includePrivate: boolean = false): Promise<EventItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/events`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.events)) {
        if (typeof window !== "undefined") {
          localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(data.events));
        }
        return includePrivate ? data.events : data.events.filter(isEventPubliclyDiscoverable);
      }
    }
  } catch {
    // Backend offline fallback
  }
  const all = getStoredEvents();
  return includePrivate ? all : all.filter(isEventPubliclyDiscoverable);
}

export function getPublicDiscoveryEvents(): EventItem[] {
  return getStoredEvents().filter(isEventPubliclyDiscoverable);
}

export function getCommunityEvents(channelId: string, viewerEmailOrId?: string): EventItem[] {
  const all = getStoredEvents();
  const channels = getStoredChannels();
  const channel = channels.find((c: Channel) => c.id === channelId);
  const isPrivate = channel ? (channel.visibility === "PRIVATE" || channel.is_private) : false;

  if (isPrivate) {
    // Only community members will know about the events
    const isMember = channel?.members?.some((m: ChannelMember) =>
      viewerEmailOrId &&
      (m.user_id === viewerEmailOrId || m.email.toLowerCase() === viewerEmailOrId.toLowerCase())
    );
    if (!isMember) {
      return []; // Hidden from non-members
    }
  }

  return all.filter((e) => e.channel_id === channelId);
}

export function getEventSync(id: string, includeDeleted: boolean = false): EventItem | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const normalized = id.toLowerCase();

    // 1. Check strict per-event scoped storage (fastest direct hash map hit)
    const perEventRaw =
      localStorage.getItem(`hackways_event_${id}`) ||
      localStorage.getItem(`hackways_event_${normalized}`);
    if (perEventRaw) {
      const parsed: EventItem = JSON.parse(perEventRaw);
      const perEventTiers =
        localStorage.getItem(`hackways_tiers_${parsed.id}`) ||
        localStorage.getItem(`hackways_tiers_${id}`);
      if (perEventTiers) {
        try {
          parsed.tiers = JSON.parse(perEventTiers);
        } catch {}
      }
      return parsed;
    }

    // 2. Fallback to all stored events array (find by ID or slug)
    const events = getStoredEvents(includeDeleted);
    const found =
      events.find(
        (e) => e.id === id || (e.slug && e.slug.toLowerCase() === normalized)
      ) || null;
    if (found) {
      const perEventTiers =
        localStorage.getItem(`hackways_tiers_${found.id}`) ||
        localStorage.getItem(`hackways_tiers_${id}`);
      if (perEventTiers) {
        try {
          found.tiers = JSON.parse(perEventTiers);
        } catch {}
      }
      return found;
    }
  } catch {}
  return null;
}

export async function getEvent(id: string, includeDeleted: boolean = false): Promise<EventItem | null> {
  // Return instant synchronous cache immediately on first paint
  const cached = getEventSync(id, includeDeleted);

  try {
    const res = await fetch(`${API_BASE}/api/v1/events/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.event) {
        const ev: EventItem = {
          ...data.event,
          tiers: data.tiers || data.event.tiers || [],
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`hackways_event_${ev.id}`, JSON.stringify(ev));
            if (ev.slug) {
              localStorage.setItem(`hackways_event_${ev.slug.toLowerCase()}`, JSON.stringify(ev));
            }
            if (ev.tiers && ev.tiers.length > 0) {
              localStorage.setItem(`hackways_tiers_${ev.id}`, JSON.stringify(ev.tiers));
            }
          } catch {}
        }
        return ev;
      }
    }
  } catch {
    // Backend offline fallback
  }

  return cached;
}

export async function getCapacity(eventId: string, tierId: string): Promise<CapacitySnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/events/${eventId}/capacity?tier_id=${tierId}`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback simulation
  }

  const ev = await getEvent(eventId);
  const tier = ev?.tiers.find((t) => t.id === tierId);
  if (tier) {
    return {
      event_id: eventId,
      tier_id: tierId,
      total_capacity: tier.total_capacity,
      remaining_capacity: tier.remaining_capacity,
      confirmed_count: tier.total_capacity - tier.remaining_capacity,
      waitlist_count: tier.remaining_capacity === 0 ? 1 : 0,
      is_sold_out: tier.remaining_capacity === 0,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// RSVP & Ticket Claiming Engine
// ---------------------------------------------------------------------------
export async function createRSVP(eventId: string, payload: {
  tier_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  answers?: Record<string, string | string[]>;
  idempotency_key?: string;
}): Promise<RSVPResponse> {
  const idemp = payload.idempotency_key || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Attempt backend if online
  try {
    const res = await fetch(`${API_BASE}/api/v1/events/${eventId}/rsvps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idemp,
      },
      body: JSON.stringify({
        ...payload,
        idempotency_key: idemp,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Local fallback
  }

  // Local persistent RSVP engine
  // Strict Duplicate Prevention: Duplicate entries will not be entertained
  const normalizedEmail = payload.user_email.trim().toLowerCase();
  const existingAttendees = getAllAttendees();
  const duplicate = existingAttendees.find(
    (a) =>
      a.eventId === eventId &&
      a.email.trim().toLowerCase() === normalizedEmail &&
      a.status !== "REFUNDED" &&
      a.status !== "REJECTED" &&
      a.status !== "CANCELLED"
  );
  if (duplicate) {
    throw new Error(
      `Duplicate entries will not be entertained: ${payload.user_email} is already registered for this event (Ticket Code: ${duplicate.ticketCode}).`
    );
  }

  const events = getStoredEvents();
  const eventIdx = events.findIndex((e) => e.id === eventId);
  const ev = eventIdx >= 0 ? events[eventIdx] : null;

  const tier = ev?.tiers.find((t) => t.id === payload.tier_id) || ev?.tiers[0];
  const isPaidTicket = Boolean(
    (tier?.price_cents && tier.price_cents > 0) ||
    (payload.answers as any)?.razorpay_payment_id ||
    (payload.answers as any)?.payment_status === "PAID" ||
    (payload.answers as any)?.platform_fee_cents
  );

  const approvalMode = isPaidTicket ? "AUTO_APPROVE" : (tier?.approval_mode || "AUTO_APPROVE");
  const isOvercrowd = tier ? tier.remaining_capacity <= 0 : false;

  let rsvpStatus: "CONFIRMED" | "WAITLIST" | "PENDING_APPROVAL" = "CONFIRMED";
  let statusMessage = "RSVP confirmed successfully";
  let waitlistPosition: number | undefined = undefined;

  if (isPaidTicket) {
    // STRICT RULE: Paid events/tickets on successful transaction ALWAYS auto-approve!
    // There is no concept of waitlist or require approval for paid tickets.
    rsvpStatus = "CONFIRMED";
    statusMessage = "Payment successful! Your admission pass is confirmed.";
    waitlistPosition = undefined;
  } else if (approvalMode === "REQUIRES_APPROVAL") {
    // Requires approval: Host will review and approve
    rsvpStatus = "PENDING_APPROVAL";
    statusMessage = "Application submitted! Pending organizer review & approval.";
  } else if (isOvercrowd || (approvalMode === "OVERFLOW_WAITLIST" && isOvercrowd)) {
    // Overcrowd will be joining waitlist
    rsvpStatus = "WAITLIST";
    statusMessage = "Tier is at capacity. You have joined the waitlist.";
    waitlistPosition = 1;
  } else {
    // Auto approve will automatically approve each and every registration
    rsvpStatus = "CONFIRMED";
    statusMessage = "Registration approved! Your pass is confirmed.";
  }

  const tierSuffix = tier ? tier.name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() : "GEN";
  const ticketCode = `HKW-${Math.floor(10000 + Math.random() * 90000)}-${tierSuffix}`;

  if (ev && tier && rsvpStatus === "CONFIRMED") {
    tier.remaining_capacity = Math.max(0, tier.remaining_capacity - 1);
    ev.attendee_count = (ev.attendee_count || 0) + 1;
    saveEvent(ev);
  }

  const nowIso = new Date().toISOString();
  const rsvpId = `rsvp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const userTicket: UserTicket = {
    id: rsvpId,
    ticket_code: ticketCode,
    event_id: eventId,
    event_title: ev?.title || "Event Pass",
    event_banner: ev?.banner_url,
    event_square_banner: ev?.square_banner_url,
    event_location: ev?.location,
    event_city: ev?.city,
    event_start_time: ev?.start_time,
    event_time_display: ev?.time_display,
    tier_id: tier?.id || payload.tier_id,
    tier_name: tier?.name || "General Admission",
    user_id: payload.user_id,
    user_name: payload.user_name,
    user_email: payload.user_email,
    price_cents: tier?.price_cents || 0,
    status: rsvpStatus,
    created_at: nowIso,
  };

  if (typeof window !== "undefined") {
    try {
      const tickets = getUserTickets();
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify([userTicket, ...tickets]));

      const attendees = getAllAttendees();
      const newAttendee: StoredAttendee = {
        id: `att_${Date.now().toString(36)}`,
        eventId,
        name: payload.user_name,
        email: payload.user_email,
        tierName: tier?.name || "General Admission",
        tierId: tier?.id || payload.tier_id,
        ticketCode,
        priceFormatted: tier?.price_cents ? `₹${(tier.price_cents / 100).toLocaleString()}` : "₹0",
        status: rsvpStatus,
        approvalMode,
        answers: payload.answers,
        registeredAt: nowIso,
      };
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify([newAttendee, ...attendees]));
      try {
        fetch("/api/v1/attendees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAttendee),
        }).catch(() => {});
      } catch {}

      const orders = getAllOrders();
      const newOrder: StoredOrder = {
        id: `ord_${Date.now().toString(36)}`,
        ticketCode,
        eventId,
        eventName: ev?.title || "Event Registration",
        buyerName: payload.user_name,
        buyerEmail: payload.user_email,
        tierName: tier?.name || "General Admission",
        tierId: tier?.id || payload.tier_id,
        amount: tier?.price_cents ? tier.price_cents / 100 : 0,
        status: "CONFIRMED",
        paymentMethod: "UPI / Direct Rail",
        createdAt: nowIso,
      };
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([newOrder, ...orders]));
      try {
        fetch("/api/v1/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newOrder),
        }).catch(() => {});
      } catch {}

      window.dispatchEvent(new CustomEvent("hackways_tickets_updated", { detail: userTicket }));
    } catch (err) {
      console.warn("Storage write error:", err);
    }
  }

  return {
    rsvp: {
      id: rsvpId,
      event_id: eventId,
      tier_id: payload.tier_id,
      user_id: payload.user_id,
      user_email: payload.user_email,
      user_name: payload.user_name,
      status: rsvpStatus,
      answers: payload.answers,
      idempotency_key: idemp,
      created_at: nowIso,
    },
    waitlist_position: waitlistPosition,
    message: statusMessage,
  };
}

export function approveAttendee(attendeeId: string): { success: boolean; message: string } {
  if (typeof window === "undefined") return { success: false, message: "Window unavailable" };
  try {
    const attendees = getAllAttendees();
    const aIdx = attendees.findIndex((a) => a.id === attendeeId);
    if (aIdx === -1) return { success: false, message: "Attendee record not found" };

    const attendee = attendees[aIdx];
    attendee.status = "CONFIRMED";
    localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(attendees));

    const tickets = getUserTickets();
    const tIdx = tickets.findIndex((t) => t.ticket_code === attendee.ticketCode);
    if (tIdx >= 0) {
      tickets[tIdx].status = "CONFIRMED";
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    }

    const events = getStoredEvents();
    const ev = events.find((e) => e.id === attendee.eventId);
    if (ev) {
      const tier = ev.tiers.find((t) => t.id === attendee.tierId || t.name === attendee.tierName);
      if (tier) {
        tier.remaining_capacity = Math.max(0, tier.remaining_capacity - 1);
      }
      ev.attendee_count = (ev.attendee_count || 0) + 1;
      saveEvent(ev);
    }

    window.dispatchEvent(new CustomEvent("hackways_tickets_updated", { detail: { approved: true, attendeeId } }));
    return { success: true, message: `Approved registration for ${attendee.name}. Confirmed pass issued.` };
  } catch {
    return { success: false, message: "Failed to approve registration." };
  }
}

export function rejectAttendee(attendeeId: string): { success: boolean; message: string } {
  if (typeof window === "undefined") return { success: false, message: "Window unavailable" };
  try {
    const attendees = getAllAttendees();
    const aIdx = attendees.findIndex((a) => a.id === attendeeId);
    if (aIdx === -1) return { success: false, message: "Attendee record not found" };

    const attendee = attendees[aIdx];
    attendee.status = "REJECTED";
    localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(attendees));

    const tickets = getUserTickets();
    const tIdx = tickets.findIndex((t) => t.ticket_code === attendee.ticketCode);
    if (tIdx >= 0) {
      tickets[tIdx].status = "CANCELLED";
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    }

    window.dispatchEvent(new CustomEvent("hackways_tickets_updated", { detail: { rejected: true, attendeeId } }));
    return { success: true, message: `Registration for ${attendee.name} has been rejected.` };
  } catch {
    return { success: false, message: "Failed to reject registration." };
  }
}

export function cancelAttendeeRegistration(
  attendeeId: string,
  reason?: string
): { success: boolean; message: string } {
  if (typeof window === "undefined") return { success: false, message: "Window unavailable" };
  try {
    const attendees = getAllAttendees();
    const aIdx = attendees.findIndex((a) => a.id === attendeeId);
    if (aIdx === -1) return { success: false, message: "Attendee record not found." };

    const attendee = attendees[aIdx];
    if (attendee.status === "CANCELLED" || attendee.status === "REFUNDED") {
      return { success: false, message: "This registration is already cancelled." };
    }

    const wasConfirmed = attendee.status === "CONFIRMED" || attendee.status === "CHECKED_IN";
    attendee.status = "CANCELLED";
    attendee.cancelledAt = new Date().toISOString();
    attendee.cancelReason = reason || "Cancelled by event organiser";
    attendees[aIdx] = attendee;
    localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(attendees));

    // Release capacity back if previously confirmed
    if (wasConfirmed) {
      const events = getStoredEvents();
      const ev = events.find((e) => e.id === attendee.eventId);
      if (ev) {
        const tier = ev.tiers.find((t) => t.id === attendee.tierId || t.name === attendee.tierName);
        if (tier) {
          tier.remaining_capacity = Math.min(tier.total_capacity, tier.remaining_capacity + 1);
        }
        ev.attendee_count = Math.max(0, (ev.attendee_count || 1) - 1);
        saveEvent(ev);
      }
    }

    // Invalidate matching user tickets
    const tickets = getUserTickets();
    let ticketsChanged = false;
    for (const t of tickets) {
      if (
        t.ticket_code.toLowerCase() === attendee.ticketCode.toLowerCase() ||
        (t.event_id === attendee.eventId && t.user_email.toLowerCase() === attendee.email.toLowerCase())
      ) {
        t.status = "CANCELLED";
        ticketsChanged = true;
      }
    }
    if (ticketsChanged) {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    }

    // Mark matching order as refunded/cancelled
    const orders = getAllOrders();
    const oIdx = orders.findIndex(
      (o) =>
        o.ticketCode.toLowerCase() === attendee.ticketCode.toLowerCase() ||
        (o.eventId === attendee.eventId && o.buyerEmail.toLowerCase() === attendee.email.toLowerCase())
    );
    if (oIdx >= 0) {
      orders[oIdx].status = "REFUNDED";
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }

    // If attendee is part of a team, update team roster
    const teams = getAllTeams();
    let teamsChanged = false;
    for (const team of teams) {
      if (team.event_id === attendee.eventId) {
        const mIdx = team.members.findIndex((m) => m.email.toLowerCase() === attendee.email.toLowerCase());
        if (mIdx >= 0) {
          team.members.splice(mIdx, 1);
          team.status = "OPEN";
          teamsChanged = true;
        }
      }
    }
    if (teamsChanged) {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
      window.dispatchEvent(new CustomEvent("hackways_teams_updated", { detail: { cancelledAttendeeId: attendeeId } }));
    }

    window.dispatchEvent(new CustomEvent("hackways_tickets_updated", { detail: { cancelled: true, attendeeId } }));
    window.dispatchEvent(new CustomEvent("hackways_attendees_updated", { detail: { cancelled: true, attendeeId } }));

    return {
      success: true,
      message: `Registration for ${attendee.name} has been cancelled and their spot has been restored.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to cancel registration." };
  }
}

export async function cancelRSVP(rsvpIdOrTicketCode: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/rsvps/${rsvpIdOrTicketCode}/cancel`, {
      method: "POST",
    });
    if (res.ok) return await res.json();
  } catch {
    // local fallback
  }

  if (typeof window !== "undefined") {
    try {
      const tickets = getUserTickets();
      const tIdx = tickets.findIndex((t) => t.id === rsvpIdOrTicketCode || t.ticket_code === rsvpIdOrTicketCode);
      if (tIdx >= 0) {
        const ticket = tickets[tIdx];
        ticket.status = "CANCELLED";
        localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));

        const events = getStoredEvents();
        const ev = events.find((e) => e.id === ticket.event_id);
        if (ev) {
          const tier = ev.tiers.find((t) => t.id === ticket.tier_id);
          if (tier) {
            tier.remaining_capacity = Math.min(tier.total_capacity, tier.remaining_capacity + 1);
            ev.attendee_count = Math.max(0, (ev.attendee_count || 1) - 1);
            saveEvent(ev);
          }
        }

        const attendees = getAllAttendees();
        const aIdx = attendees.findIndex((a) => a.ticketCode === ticket.ticket_code);
        if (aIdx >= 0) {
          attendees[aIdx].status = "REFUNDED";
          localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(attendees));
        }

        const orders = getAllOrders();
        const oIdx = orders.findIndex((o) => o.ticketCode === ticket.ticket_code);
        if (oIdx >= 0) {
          orders[oIdx].status = "REFUNDED";
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
        }

        window.dispatchEvent(new CustomEvent("hackways_tickets_updated", { detail: { cancelled: true } }));
      }
    } catch {
      // ignore
    }
  }
  return { success: true, message: "RSVP cancelled successfully" };
}

// ---------------------------------------------------------------------------
// User Tickets & Attendees & Orders Accessors
// ---------------------------------------------------------------------------
export function getUserTickets(userId?: string, options: { strict?: boolean } = {}): UserTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (!raw) return [];
    const all: UserTicket[] = JSON.parse(raw);
    if (options.strict && (!Array.isArray(all) || !all.every((ticket) =>
      ticket !== null && typeof ticket === "object" &&
      typeof ticket.id === "string" && ticket.id.length > 0 &&
      typeof ticket.event_id === "string" && ticket.event_id.length > 0 &&
      typeof ticket.event_title === "string" &&
      typeof ticket.user_id === "string" &&
      typeof ticket.user_email === "string" &&
      typeof ticket.created_at === "string" &&
      ["CONFIRMED", "CHECKED_IN", "WAITLIST", "PENDING_APPROVAL", "CANCELLED"].includes(ticket.status)
    ))) {
      throw new Error("Stored registrations have an invalid format");
    }
    if (!userId) return all;
    return all.filter((t) => t.user_id === userId || t.user_email.toLowerCase() === userId.toLowerCase());
  } catch (error) {
    if (options.strict) throw error;
    return [];
  }
}

export function getAllAttendees(): StoredAttendee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ATTENDEES_STORAGE_KEY);
    if (!raw) return [];
    const list: StoredAttendee[] = JSON.parse(raw);
    // Strict deduplication: keep only 1 entry per eventId + email
    const seen = new Set<string>();
    const unique: StoredAttendee[] = [];
    for (const a of list) {
      if (!a.eventId || !a.email) continue;
      const key = `${a.eventId}_${a.email.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(a);
      }
    }
    // Automatically purge duplicates from storage
    if (unique.length !== list.length) {
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(unique));
    }
    return unique;
  } catch {
    return [];
  }
}

export function getEventAttendees(eventId: string): StoredAttendee[] {
  return getAllAttendees().filter((a) => a.eventId === eventId);
}

export function getAllOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function checkInAttendee(ticketCodeOrId: string, eventId?: string): { success: boolean; attendee?: StoredAttendee; message: string } {
  if (typeof window === "undefined") return { success: false, message: "Storage unavailable" };
  try {
    const attendees = getAllAttendees();
    const query = ticketCodeOrId.trim().toLowerCase();
    const targetIdx = attendees.findIndex(
      (a) =>
        (a.ticketCode.toLowerCase() === query || a.id.toLowerCase() === query) &&
        (!eventId || a.eventId === eventId)
    );

    if (targetIdx === -1) {
      return { success: false, message: "Ticket code not found in guest roster." };
    }

    const attendee = attendees[targetIdx];
    if (attendee.status === "CHECKED_IN") {
      return {
        success: false,
        attendee,
        message: `Already checked in at ${attendee.checkedInAt || "earlier"}.`,
      };
    }

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    attendee.status = "CHECKED_IN";
    attendee.checkedInAt = timeString;
    attendee.checkedInBy = "Door Scanner #01";
    attendees[targetIdx] = attendee;

    localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(attendees));

    const tickets = getUserTickets();
    const ticketIdx = tickets.findIndex((t) => t.ticket_code.toLowerCase() === attendee.ticketCode.toLowerCase());
    if (ticketIdx >= 0) {
      tickets[ticketIdx].status = "CHECKED_IN";
      tickets[ticketIdx].checked_in_at = timeString;
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    }

    try {
      fetch("/api/v1/attendees/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCode: attendee.ticketCode, eventId: attendee.eventId }),
      }).catch(() => {});
    } catch {}

    window.dispatchEvent(new CustomEvent("hackways_checkin_updated", { detail: attendee }));
    return { success: true, attendee, message: `Access granted: ${attendee.name} (${attendee.tierName})` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Check-in failed" };
  }
}

export function getPlatformMetrics() {
  const orders = getAllOrders().filter((o) => o.status === "CONFIRMED");
  const totalGmv = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const events = getStoredEvents();
  const attendees = getAllAttendees().filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN");
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;

  return {
    totalGmv,
    totalOrders: orders.length,
    totalEvents: events.length,
    totalAttendees: attendees.length,
    checkedInCount,
    netRevenue: totalGmv * 0.965, // after gateway
    platformFee: totalGmv * 0.03, // 3% fee
  };
}

// ---------------------------------------------------------------------------
// Teams API & Persistent Storage
// ---------------------------------------------------------------------------
const TEAMS_STORAGE_KEY = "hackways_teams_v5";

export function getAllTeams(): EventTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getEventTeams(eventId: string): EventTeam[] {
  return getAllTeams().filter((t) => t.event_id === eventId);
}

export function getTeamByCode(eventId: string, code: string): EventTeam | null {
  const clean = code.trim().toUpperCase();
  return getAllTeams().find((t) => t.event_id === eventId && t.code.toUpperCase() === clean) || null;
}

export async function fetchTeamByCodeAsync(eventId: string, code: string): Promise<EventTeam | null> {
  const clean = code.trim().toUpperCase();
  const local = getAllTeams().find((t) => t.event_id === eventId && t.code.toUpperCase() === clean);
  if (local) return local;

  try {
    const res = await fetch(`${API_BASE}/api/v1/teams?event_id=${eventId}&code=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.team) {
        if (typeof window !== "undefined") {
          const all = getAllTeams();
          if (!all.some((t) => t.id === data.team.id)) {
            all.push(data.team);
            localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(all));
          }
        }
        return data.team;
      }
    }
  } catch {}
  return null;
}

export function createEventTeam(
  eventId: string,
  params: {
    name: string;
    leader_name: string;
    leader_email: string;
    min_size: number;
    max_size: number;
    tier_id?: string;
  }
): EventTeam {
  const leaderEmail = params.leader_email.trim().toLowerCase();
  const existingAttendees = getAllAttendees();
  const duplicate = existingAttendees.find(
    (a) =>
      a.eventId === eventId &&
      a.email.trim().toLowerCase() === leaderEmail &&
      a.status !== "REFUNDED" &&
      a.status !== "REJECTED" &&
      a.status !== "CANCELLED"
  );
  if (duplicate) {
    throw new Error(
      `Duplicate entries will not be entertained: ${params.leader_email} is already registered for this event (Ticket Code: ${duplicate.ticketCode}).`
    );
  }

  const teams = getAllTeams();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cleanName = params.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5) || "TEAM";
  const code = `${cleanName}-${randomSuffix}`;

  const leaderMember: TeamMember = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: params.leader_name.trim(),
    email: leaderEmail,
    role: "LEADER",
    joined_at: new Date().toISOString(),
    ticket_tier_id: params.tier_id,
  };

  const newTeam: EventTeam = {
    id: `team_${Date.now()}`,
    event_id: eventId,
    name: params.name.trim(),
    code,
    leader_name: params.leader_name.trim(),
    leader_email: leaderEmail,
    min_size: params.min_size || 2,
    max_size: params.max_size || 4,
    members: [leaderMember],
    created_at: new Date().toISOString(),
    status: (params.max_size || 4) <= 1 ? "FULL" : "OPEN",
  };

  teams.push(newTeam);
  if (typeof window !== "undefined") {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
    window.dispatchEvent(new CustomEvent("hackways_teams_updated", { detail: newTeam }));

    // Sync to server store for Incognito sessions and external devices
    fetch(`${API_BASE}/api/v1/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTeam),
    }).catch(() => {});
  }

  return newTeam;
}

export function joinEventTeam(
  eventId: string,
  teamCode: string,
  member: { name: string; email: string; tier_id?: string }
): { success: boolean; team?: EventTeam; error?: string } {
  const teams = getAllTeams();
  const clean = teamCode.trim().toUpperCase();
  const idx = teams.findIndex((t) => t.event_id === eventId && t.code.toUpperCase() === clean);
  if (idx === -1) {
    return { success: false, error: "Team invite code not found for this event." };
  }

  const team = teams[idx];
  if (team.members.length >= team.max_size) {
    return { success: false, error: `This team is already full (maximum ${team.max_size} members).` };
  }

  const emailClean = member.email.trim().toLowerCase();
  if (team.members.some((m) => m.email.toLowerCase() === emailClean)) {
    return { success: false, error: "Duplicate entries will not be entertained: You have already joined this team." };
  }

  const existingAttendees = getAllAttendees();
  const duplicate = existingAttendees.find(
    (a) =>
      a.eventId === eventId &&
      a.email.trim().toLowerCase() === emailClean &&
      a.status !== "REFUNDED" &&
      a.status !== "REJECTED" &&
      a.status !== "CANCELLED"
  );
  if (duplicate) {
    return {
      success: false,
      error: `Duplicate entries will not be entertained: ${member.email} is already registered for this event (Ticket Code: ${duplicate.ticketCode}).`,
    };
  }

  const newMember: TeamMember = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: member.name.trim(),
    email: emailClean,
    role: "MEMBER",
    joined_at: new Date().toISOString(),
    ticket_tier_id: member.tier_id,
  };

  team.members.push(newMember);
  if (team.members.length >= team.max_size) {
    team.status = "FULL";
  }

  teams[idx] = team;
  if (typeof window !== "undefined") {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
    window.dispatchEvent(new CustomEvent("hackways_teams_updated", { detail: team }));
  }

  // Also register member in attendee roster
  const attendees = getAllAttendees();
  const attendeeId = `att_${Date.now()}`;
  const ticketCode = `HKW-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  attendees.push({
    id: attendeeId,
    eventId,
    name: member.name.trim(),
    email: emailClean,
    ticketCode,
    tierName: "Team Pass",
    tierId: member.tier_id || "tier_team",
    priceFormatted: "₹0",
    status: "CONFIRMED",
    isVip: false,
    isSpeaker: false,
    registeredAt: new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(attendees));
  }

  return { success: true, team };
}

// ---------------------------------------------------------------------------
// Communities / Channels Storage & API
// ---------------------------------------------------------------------------
export function getStoredChannels(): Channel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHANNELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: Channel[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Invalid community data");
    const channels = cleanSeededChannels(parsed);
    if (JSON.stringify(channels) !== JSON.stringify(parsed)) localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
    return channels;
  } catch (error) {
    console.error("Unable to read communities", error);
    throw new Error("Communities couldn't be loaded. Check browser storage and try again.");
  }
}

function saveStoredChannels(channels: Channel[]) {
  if (typeof window === "undefined") throw new Error("Community storage is only available in your browser.");
  try {
    localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
  } catch (error) {
    console.error("Unable to save community changes", error);
    throw new Error("Your community couldn't be saved. Try a smaller logo or allow browser storage, then retry.");
  }
}

export async function getChannels(): Promise<Channel[]> {
  return getStoredChannels();
}

export async function getChannelBySlug(slug: string): Promise<Channel | null> {
  const list = getStoredChannels();
  const normalized = slug.toLowerCase();
  return (
    list.find(
      (c) =>
        c.slug.toLowerCase() === normalized ||
        c.id.toLowerCase() === normalized
    ) || null
  );
}

export async function getChannelById(id: string): Promise<Channel | null> {
  const list = getStoredChannels();
  return list.find((c) => c.id === id) || null;
}

export async function getChannelEvents(channelId: string): Promise<EventItem[]> {
  const allEvents = await getEvents();
  return allEvents.filter((e) => e.channel_id === channelId);
}

export async function createChannel(data: {
  name: string;
  slug?: string;
  description: string;
  owner_id?: string;
  owner_name?: string;
  avatar_url?: string;
  banner_url?: string;
  social_links?: { website?: string; twitter?: string; github?: string; linkedin?: string };
}): Promise<Channel> {
  const channels = getStoredChannels();
  const name = data.name.trim();
  if (!name) throw new Error("Enter a community name.");
  if (name.length > 80) throw new Error("Use 80 characters or fewer for the community name.");
  if (!data.owner_id) throw new Error("Sign in before creating a community.");
  const id = `ch_${crypto.randomUUID()}`;
  const slug = data.slug?.trim() || name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || id;
  if (channels.some((channel) => channel.slug.toLowerCase() === slug.toLowerCase())) {
    throw new Error("A community with this name already exists. Choose a different name.");
  }
  
  const newChannel: Channel = {
    id,
    name,
    slug,
    description: data.description || "",
    owner_id: data.owner_id || "",
    owner_name: data.owner_name || "",
    avatar_url: data.avatar_url || "",
    banner_url: data.banner_url || "",
    follower_count: 0,
    verified: false,
    created_at: new Date().toISOString(),
    members: [
      {
        user_id: data.owner_id || "",
        name: data.owner_name || "",
        email: "",
        role: "owner",
        added_at: new Date().toISOString(),
      },
    ],
    social_links: data.social_links,
  };

  const updated = [newChannel, ...channels];
  saveStoredChannels(updated);
  return newChannel;
}

export async function updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
  const channels = getStoredChannels();
  const index = channels.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Channel not found");

  channels[index] = { ...channels[index], ...data };
  saveStoredChannels(channels);
  return channels[index];
}

export async function deleteChannel(id: string): Promise<boolean> {
  const channels = getStoredChannels();
  const updated = channels.filter((c) => c.id !== id);
  if (updated.length === channels.length) return false;
  saveStoredChannels(updated);
  return true;
}

export async function addChannelMember(
  channelId: string,
  member: Omit<ChannelMember, "added_at">
): Promise<ChannelMember> {
  const channels = getStoredChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) throw new Error("Channel not found");

  const newMember: ChannelMember = {
    ...member,
    added_at: new Date().toISOString(),
  };

  const existingIdx = channel.members.findIndex((m) => m.email.toLowerCase() === member.email.toLowerCase());
  if (existingIdx >= 0) {
    channel.members[existingIdx] = newMember;
  } else {
    channel.members.push(newMember);
  }

  saveStoredChannels(channels);
  return newMember;
}

export async function removeChannelMember(channelId: string, userId: string): Promise<boolean> {
  const channels = getStoredChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) return false;

  channel.members = channel.members.filter((m) => m.user_id !== userId);
  saveStoredChannels(channels);
  return true;
}

export async function updateChannelMemberRole(
  channelId: string,
  userId: string,
  role: ChannelRole
): Promise<boolean> {
  const channels = getStoredChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) return false;

  const m = channel.members.find((mem) => mem.user_id === userId);
  if (!m) return false;

  m.role = role;
  saveStoredChannels(channels);
  return true;
}

export async function toggleChannelFollow(channelId: string): Promise<{ following: boolean; count: number }> {
  const channels = getStoredChannels();
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) return { following: false, count: 0 };

  const key = `hackways_following_${channelId}`;
  const isFollowing = typeof window !== "undefined" ? localStorage.getItem(key) === "true" : false;

  if (isFollowing) {
    channel.follower_count = Math.max(0, channel.follower_count - 1);
    if (typeof window !== "undefined") localStorage.removeItem(key);
  } else {
    channel.follower_count += 1;
    if (typeof window !== "undefined") localStorage.setItem(key, "true");
  }

  saveStoredChannels(channels);
  return { following: !isFollowing, count: channel.follower_count };
}

export function isChannelFollowed(channelId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`hackways_following_${channelId}`) === "true";
}

export interface ExistingRSVPInfo {
  status: RSVPStatus | "CHECKED_IN" | "REJECTED";
  ticket?: UserTicket;
  attendee?: StoredAttendee;
  sequenceNo?: number;
}

export function getExistingRSVP(eventId: string, userEmail?: string, userId?: string): ExistingRSVPInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const attendees = getAllAttendees().filter((a) => a.eventId === eventId);
    const tickets = getUserTickets().filter((t) => t.event_id === eventId);

    let foundAttendee: StoredAttendee | undefined;
    let foundTicket: UserTicket | undefined;

    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      foundAttendee = attendees.find((a) => a.email.toLowerCase() === cleanEmail);
      foundTicket = tickets.find((t) => t.user_email.toLowerCase() === cleanEmail);
    }

    if (!foundAttendee && userId) {
      foundTicket = tickets.find((t) => t.user_id === userId);
      if (foundTicket) {
        foundAttendee = attendees.find((a) => a.ticketCode === foundTicket?.ticket_code);
      }
    }

    // Fallback: If visitor is on this device and has a ticket for this event
    if (!foundAttendee && !foundTicket && tickets.length > 0) {
      foundTicket = tickets.find((t) => t.status !== "CANCELLED") || tickets[0];
      if (foundTicket) {
        foundAttendee = attendees.find((a) => a.ticketCode === foundTicket?.ticket_code);
      }
    }

    // Fallback: Check if there's any attendee stored for this event
    if (!foundAttendee && !foundTicket && attendees.length > 0 && userEmail) {
      foundAttendee = attendees.find((a) => a.email.toLowerCase() === userEmail.toLowerCase());
    }

    if (!foundAttendee && !foundTicket) return null;

    // Determine sequence number (position among attendees)
    const confirmedAttendees = attendees.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN");
    let sequenceNo = 1;
    if (foundAttendee) {
      const idx = confirmedAttendees.findIndex((a) => a.id === foundAttendee?.id);
      sequenceNo = idx >= 0 ? idx + 1 : attendees.findIndex((a) => a.id === foundAttendee?.id) + 1;
    }

    let rawStatus = foundAttendee?.status || foundTicket?.status || "CONFIRMED";
    if (rawStatus === "CANCELLED" || rawStatus === "REFUNDED") {
      return null;
    }

    // MANDATORY RULE: Paid events/tickets are ALWAYS CONFIRMED (auto-approved on transaction)
    const isPaidRegistration = Boolean(
      (foundAttendee?.priceFormatted && foundAttendee.priceFormatted !== "₹0") ||
      (foundTicket as any)?.is_paid ||
      (foundTicket?.price_cents ? foundTicket.price_cents > 0 : false) ||
      (foundAttendee?.answers as any)?.razorpay_payment_id ||
      (foundAttendee?.answers as any)?.payment_status === "PAID" ||
      (foundAttendee?.answers as any)?.platform_fee_cents
    );
    if (isPaidRegistration && rawStatus !== "CHECKED_IN") {
      rawStatus = "CONFIRMED";
      if (foundAttendee) foundAttendee.status = "CONFIRMED";
      if (foundTicket) foundTicket.status = "CONFIRMED";
    }
    return {
      status: rawStatus as any,
      ticket: foundTicket,
      attendee: foundAttendee,
      sequenceNo: Math.max(1, sequenceNo),
    };
  } catch {
    return null;
  }
}

export interface EventPageView {
  id: string;
  eventId: string;
  timestamp: string;
  device: "Mobile" | "Desktop" | "Tablet";
  source: string;
  city: string;
}

export function recordEventPageView(eventId: string, details?: Partial<EventPageView>): boolean {
  if (typeof window === "undefined" || !eventId) return false;
  try {
    const deviceViewKey = `hackways_unique_device_view_${eventId}`;
    // STRICT RULE: one device = 1 view strictly
    if (localStorage.getItem(deviceViewKey)) {
      return false; // Already counted on this device
    }

    // Mark this device as counted permanently
    localStorage.setItem(deviceViewKey, Date.now().toString());

    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const viewsKey = `hackways_views_${eventId}`;
    const raw = localStorage.getItem(viewsKey);
    const existingViews: EventPageView[] = raw ? JSON.parse(raw) : [];

    const newView: EventPageView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId,
      timestamp: new Date().toISOString(),
      device: details?.device || (isMobile ? "Mobile" : "Desktop"),
      source: details?.source || (typeof document !== "undefined" && document.referrer.includes("google") ? "Google Search" : typeof document !== "undefined" && document.referrer ? "Referral" : "Direct"),
      city: details?.city || "Hyderabad, Telangana",
    };

    localStorage.setItem(viewsKey, JSON.stringify([newView, ...existingViews]));
    window.dispatchEvent(new CustomEvent("hackways_views_updated", { detail: newView }));
    return true;
  } catch {
    return false;
  }
}

export function getEventPageViews(eventId: string): EventPageView[] {
  if (typeof window === "undefined" || !eventId) return [];
  try {
    const raw = localStorage.getItem(`hackways_views_${eventId}`);
    if (raw) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Featured Event (Admin-promoted on Explore page)
// ---------------------------------------------------------------------------
export function getFeaturedEventId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(FEATURED_EVENT_KEY);
  } catch {
    return null;
  }
}

export function setFeaturedEvent(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FEATURED_EVENT_KEY, eventId);
    window.dispatchEvent(new CustomEvent("hackways_featured_updated", { detail: { eventId } }));
  } catch {}
}

export function clearFeaturedEvent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FEATURED_EVENT_KEY);
    window.dispatchEvent(new CustomEvent("hackways_featured_updated", { detail: { eventId: null } }));
  } catch {}
}
