import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { EventItem, EventTeam, Channel, ShortLinkTracker, DeviceTelemetryEvent } from "./types";

// A UUID's hex groups are cryptographically random, so two 4-char slices of
// one are collision-safe for a ticket reference — unlike the Math.random()
// this replaces, which was duplicated slightly differently across
// orders/route.ts and rsvps/route.ts.
export function generateTicketCode(): string {
  const [group1, group2] = randomUUID().split("-");
  return `HKW-${group1.slice(0, 4).toUpperCase()}-${group2.toUpperCase()}`;
}
import type { StoredAttendee, StoredOrder } from "./api";
import { cleanEventArtwork, cleanSeededChannels } from "./demoCleanup";
import { defaultPlatformSettings, type PlatformSettings } from "./platformSettings";
import { generateAutoUsername } from "./userFormat";

export interface ServerUserRecord {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatar?: string;
  accountStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED" | "NEW" | "DELETED";
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "PENDING" | "REJECTED";
  verificationToken?: string;
  verificationRequestedAt?: string;
  accountType: "ATTENDEE" | "ORGANIZER" | "VIP" | "ADMIN";
  joinedDate: string;
  lastActive: string;
  notes?: Array<{
    id: string;
    author: string;
    date: string;
    category: "INTERNAL" | "SUPPORT" | "ACCOUNT" | "MODERATION";
    content: string;
  }>;
  communications?: Array<{
    id: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP";
    subject: string;
    content: string;
    status: "SENT" | "DELIVERED" | "OPENED" | "FAILED";
    timestamp: string;
  }>;
}

export const SEED_REGISTERED_USERS: ServerUserRecord[] = [
  {
    id: "539500bd-eb7d-48ec-a48a-2e4ca8dbd06c",
    name: "meridbase",
    email: "meridbase@gmail.com",
    accountStatus: "ACTIVE",
    verificationStatus: "VERIFIED",
    accountType: "ADMIN",
    joinedDate: "2026-10-01T21:44:52.474Z",
    lastActive: "2026-10-02T17:40:00.000Z",
  },
  {
    id: "a5b2be2f-1f58-44da-81d7-daa3e7274ed4",
    name: "Varshith",
    email: "varshith.code@gmail.com",
    accountStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    accountType: "ADMIN",
    joinedDate: "2026-10-01T21:20:35.052Z",
    lastActive: "2026-10-02T17:40:00.000Z",
  },
  {
    id: "66ed994d-197f-4f0a-a1c6-8b77b4e3df25",
    name: "HITESH",
    email: "nellurihitesh@gmail.com",
    accountStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    accountType: "ATTENDEE",
    joinedDate: "2026-10-02T05:25:42.766Z",
    lastActive: "2026-10-02T05:25:42.766Z",
  },
  {
    id: "760e94f4-d236-4836-8997-76c701bf92fb",
    name: "2511CS030548- PALADUGU VARSHITH CHOWDARY",
    email: "2511cs030548@mallareddyuniversity.ac.in",
    accountStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    accountType: "ATTENDEE",
    joinedDate: "2026-10-02T08:28:00.477Z",
    lastActive: "2026-10-02T08:28:00.477Z",
  },
  {
    id: "dbba3fa4-e901-429b-a6bc-6d7e16e9e441",
    name: "jayanth karnati -12-",
    email: "karnatijayanth2005@gmail.com",
    accountStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    accountType: "ORGANIZER",
    joinedDate: "2026-10-02T10:08:09.746Z",
    lastActive: "2026-10-02T10:08:09.746Z",
  },
  {
    id: "61123430-242b-4243-9f28-be4594ddb7dd",
    name: "Govada Harshith",
    email: "harshithgovada34@gmail.com",
    accountStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    accountType: "ORGANIZER",
    joinedDate: "2026-10-02T06:49:20.929Z",
    lastActive: "2026-10-02T06:49:20.929Z",
  },
  {
    id: "654d9c9d-b20c-43a1-b408-8b331cd13c7b",
    name: "jayanth karnati",
    email: "jayanthkarnati31@gmail.com",
    accountStatus: "ACTIVE",
    verificationStatus: "UNVERIFIED",
    accountType: "ATTENDEE",
    joinedDate: "2026-10-02T13:00:04.547Z",
    lastActive: "2026-10-02T13:00:04.547Z",
  },
];

interface ServerState {
  events: EventItem[];
  teams: EventTeam[];
  attendees: StoredAttendee[];
  orders: StoredOrder[];
  channels: Channel[];
  users: ServerUserRecord[];
  short_links: ShortLinkTracker[];
  telemetry_events: DeviceTelemetryEvent[];
  settings?: PlatformSettings;
}

// Shared across apps/web and apps/console (both run with cwd = their own app
// dir, so a bare process.cwd() path puts each app's writes in a different,
// invisible-to-the-other file). Resolve to the repo root they're siblings
// under instead, overridable for deployments where that layout doesn't hold.
export const DATA_DIR = process.env.HACKWAYS_DATA_DIR || process.env.DATA_DIR || path.resolve(process.cwd(), "..", "..", ".server_data");
const STORE_FILE = path.join(DATA_DIR, "platform_store.json");

function ensureDirExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error("Failed to create data directory", e);
  }
}

let memoryState: ServerState = {
  events: [],
  teams: [],
  attendees: [],
  orders: [],
  channels: [],
  users: [],
  short_links: [],
  telemetry_events: [],
};

let isLoaded = false;

function loadFromDisk(): ServerState {
  ensureDirExists();
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const loadedUsers: ServerUserRecord[] = parsed.users || [];
      SEED_REGISTERED_USERS.forEach((su) => {
        if (!loadedUsers.some((u) => u.email.toLowerCase() === su.email.toLowerCase())) {
          loadedUsers.push(su);
        }
      });

      memoryState = {
        events: (parsed.events || []).map(cleanEventArtwork),
        teams: parsed.teams || [],
        attendees: parsed.attendees || [],
        orders: parsed.orders || [],
        channels: cleanSeededChannels(parsed.channels || []),
        users: loadedUsers,
        short_links: parsed.short_links || [],
        telemetry_events: parsed.telemetry_events || [],
        settings: parsed.settings
          ? { ...defaultPlatformSettings(), ...parsed.settings, moduleAccess: { ...defaultPlatformSettings().moduleAccess, ...(parsed.settings.moduleAccess || {}) } }
          : defaultPlatformSettings(),
      };
      if (JSON.stringify(memoryState.events) !== JSON.stringify(parsed.events || []) ||
          JSON.stringify(memoryState.channels) !== JSON.stringify(parsed.channels || []) ||
          (parsed.users || []).length !== loadedUsers.length) {
        saveToDisk();
      }
    }
  } catch (e) {
    console.error("Failed to read server store from disk", e);
  }
  isLoaded = true;
  return memoryState;
}

function saveToDisk() {
  ensureDirExists();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(memoryState, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write server store to disk", e);
  }
}

function getState(): ServerState {
  return loadFromDisk();
}

export const serverStore = {
  // ==========================================
  // EVENTS
  // ==========================================
  getEvents(): EventItem[] {
    return getState().events;
  },

  getEventById(id: string): EventItem | null {
    const normalized = (id || "").toLowerCase();
    return (
      getState().events.find(
        (e) => e.id === id || (e.slug && e.slug.toLowerCase() === normalized)
      ) || null
    );
  },

  saveEvent(event: EventItem): EventItem {
    // Client-side readImageFile() caps uploads before encoding, but that's a UI
    // guard only — nothing enforced it here, so oversized/bypassed banners landed
    // directly in this JSON store (one event alone reached ~3MB across both
    // fields) and are the known cause of the SSR payload crash on /home.
    const MAX_BANNER_DATA_URI_BYTES = 300 * 1024;
    for (const field of ["banner_url", "square_banner_url"] as const) {
      const value = event[field];
      if (typeof value === "string" && value.startsWith("data:") && value.length > MAX_BANNER_DATA_URI_BYTES) {
        throw new Error(`${field === "banner_url" ? "16:9 banner" : "1:1 banner"} image is too large. Choose one smaller than 220 KB.`);
      }
    }

    if (typeof event.banner_url === "string" && event.banner_url.startsWith("blob:")) {
      delete event.banner_url;
    }
    if (typeof event.square_banner_url === "string" && event.square_banner_url.startsWith("blob:")) {
      delete event.square_banner_url;
    }

    const state = getState();
    const normalizedSlug = event.slug?.trim().toLowerCase();
    const idx = state.events.findIndex(
      (e) => e.id === event.id || (normalizedSlug && e.slug && e.slug.toLowerCase() === normalizedSlug)
    );

    // Normalize or auto-generate slug
    if (event.slug?.trim()) {
      event.slug = event.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    } else if (event.title?.trim()) {
      event.slug = event.title.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    }

    // Default General Admission (Free) tier for every event if none provided
    if (idx === -1 && (!event.tiers || event.tiers.length === 0)) {
      const capacity = event.total_capacity || 0;
      event.tiers = [
        {
          id: `tkt_${Date.now()}`,
          event_id: event.id,
          name: "General Admission",
          price_cents: 0,
          total_capacity: capacity,
          remaining_capacity: capacity,
          approval_mode: "AUTO_APPROVE",
        },
      ];
      event.total_capacity = capacity;
    }

    if (idx >= 0) {
      state.events[idx] = { ...state.events[idx], ...event };
      event = state.events[idx];
    } else {
      state.events.unshift(event);
    }
    saveToDisk();
    return event;
  },

  deleteEvent(id: string, reason?: string): boolean {
    const state = getState();
    const idx = state.events.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    state.events[idx] = {
      ...state.events[idx],
      status: "DELETED",
      deleted_by_organizer: true,
      deleted_at: new Date().toISOString(),
      deletion_reason: reason,
    };
    saveToDisk();
    return true;
  },

  // ==========================================
  // TEAMS
  // ==========================================
  getTeams(eventId?: string): EventTeam[] {
    const teams = getState().teams;
    if (eventId) {
      return teams.filter((t) => t.event_id === eventId);
    }
    return teams;
  },

  getTeamByCode(eventId: string, code: string): EventTeam | null {
    const clean = code.trim().toUpperCase();
    return getState().teams.find((t) => t.event_id === eventId && t.code.toUpperCase() === clean) || null;
  },

  getTeamById(id: string): EventTeam | null {
    return getState().teams.find((t) => t.id === id) || null;
  },

  saveTeam(team: EventTeam): EventTeam {
    const state = getState();
    const idx = state.teams.findIndex((t) => t.id === team.id || (t.event_id === team.event_id && t.code.toUpperCase() === team.code.toUpperCase()));
    if (idx >= 0) {
      state.teams[idx] = team;
    } else {
      state.teams.unshift(team);
    }
    saveToDisk();
    return team;
  },

  // ==========================================
  // ATTENDEES & CHECK-IN
  // ==========================================
  getAttendees(eventId?: string): StoredAttendee[] {
    const attendees = getState().attendees;
    if (eventId) {
      return attendees.filter((a) => a.eventId === eventId);
    }
    return attendees;
  },

  getAttendeeById(id: string): StoredAttendee | null {
    return getState().attendees.find((a) => a.id === id) || null;
  },

  getAttendeeByTicketCode(code: string, eventId?: string): StoredAttendee | null {
    const clean = code.trim().toUpperCase();
    return (
      getState().attendees.find((a) => {
        const matchesCode = (a.ticketCode || "").toUpperCase() === clean;
        return eventId ? matchesCode && a.eventId === eventId : matchesCode;
      }) || null
    );
  },

  saveAttendee(attendee: StoredAttendee): StoredAttendee {
    const state = getState();
    const idx = state.attendees.findIndex((a) => a.id === attendee.id);
    if (idx >= 0) {
      state.attendees[idx] = attendee;
    } else {
      state.attendees.unshift(attendee);

      // Decrement remaining capacity on corresponding event tier
      const ev = state.events.find((e) => e.id === attendee.eventId);
      if (ev && ev.tiers) {
        const tier = ev.tiers.find((t) => t.id === attendee.tierId || t.name === attendee.tierName);
        if (tier && (tier.remaining_capacity ?? 0) > 0) {
          tier.remaining_capacity = Math.max(0, (tier.remaining_capacity ?? tier.total_capacity) - 1);
        }
        ev.attendee_count = (ev.attendee_count || 0) + 1;
      }
    }
    saveToDisk();
    return attendee;
  },

  checkInAttendee(ticketCode: string, eventId?: string): { success: boolean; attendee?: StoredAttendee; message: string } {
    const state = getState();
    const clean = ticketCode.trim().toUpperCase();
    const attendee = state.attendees.find((a) => {
      const match = (a.ticketCode || "").toUpperCase() === clean;
      return eventId ? match && a.eventId === eventId : match;
    });

    if (!attendee) {
      return { success: false, message: "Invalid ticket code. No matching registration found." };
    }

    if (attendee.status === "CHECKED_IN") {
      return {
        success: false,
        attendee,
        message: `Already checked in at ${new Date(attendee.checkedInAt || "").toLocaleTimeString()}`,
      };
    }

    if (attendee.status === "CANCELLED") {
      return { success: false, attendee, message: "Ticket has been cancelled." };
    }

    attendee.status = "CHECKED_IN";
    attendee.checkedInAt = new Date().toISOString();
    saveToDisk();
    return { success: true, attendee, message: "Check-in verified successfully." };
  },

  cancelAttendee(attendeeId: string, reason?: string, cancelledByAttendee: boolean = false): boolean {
    const state = getState();
    const attendee = state.attendees.find((a) => a.id === attendeeId);
    if (attendee) {
      attendee.status = "CANCELLED";
      attendee.cancelledAt = new Date().toISOString();
      attendee.cancelReason = reason || (cancelledByAttendee ? "Cancelled by attendee" : "Cancelled by event host");
      attendee.cancellationRequested = false;
      const ev = state.events.find((e) => e.id === attendee.eventId);
      if (ev) {
        const tier = ev.tiers.find((t) => t.id === attendee.tierId || t.name === attendee.tierName);
        if (tier) {
          tier.remaining_capacity = Math.min(tier.total_capacity, (tier.remaining_capacity ?? 0) + 1);
        }
        ev.attendee_count = Math.max(0, (ev.attendee_count || 1) - 1);
      }
      saveToDisk();
      return true;
    }
    return false;
  },

  requestAttendeeCancellation(attendeeId: string, reason?: string): boolean {
    const state = getState();
    const attendee = state.attendees.find((a) => a.id === attendeeId);
    if (attendee) {
      attendee.status = "BLOCKED";
      attendee.cancellationRequested = true;
      attendee.cancellationRequestedAt = new Date().toISOString();
      attendee.cancelReason = reason || "Cancellation requested by attendee";
      // Spot remains blocked and held until host makes a decision
      saveToDisk();
      return true;
    }
    return false;
  },

  approveAttendeeCancellation(attendeeId: string): boolean {
    const state = getState();
    const attendee = state.attendees.find((a) => a.id === attendeeId);
    if (attendee) {
      attendee.status = "CANCELLED";
      attendee.cancellationRequested = false;
      attendee.cancelledAt = new Date().toISOString();
      const ev = state.events.find((e) => e.id === attendee.eventId);
      if (ev) {
        const tier = ev.tiers.find((t) => t.id === attendee.tierId || t.name === attendee.tierName);
        if (tier) {
          tier.remaining_capacity = Math.min(tier.total_capacity, (tier.remaining_capacity ?? 0) + 1);
        }
        ev.attendee_count = Math.max(0, (ev.attendee_count || 1) - 1);
      }
      saveToDisk();
      return true;
    }
    return false;
  },

  declineAttendeeCancellation(attendeeId: string): boolean {
    const state = getState();
    const attendee = state.attendees.find((a) => a.id === attendeeId);
    if (attendee) {
      attendee.status = "CONFIRMED";
      attendee.cancellationRequested = false;
      attendee.cancelReason = undefined;
      saveToDisk();
      return true;
    }
    return false;
  },

  // ==========================================
  // ORDERS & PAYMENTS
  // ==========================================
  getOrders(eventId?: string): StoredOrder[] {
    const orders = getState().orders;
    if (eventId) {
      return orders.filter((o) => o.eventId === eventId);
    }
    return orders;
  },

  getOrderById(id: string): StoredOrder | null {
    return getState().orders.find((o) => o.id === id) || null;
  },

  saveOrder(order: StoredOrder): StoredOrder {
    const state = getState();
    const idx = state.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      state.orders[idx] = order;
    } else {
      state.orders.unshift(order);
    }
    saveToDisk();
    return order;
  },

  refundOrder(orderId: string, reason?: string): { success: boolean; order?: StoredOrder; message: string } {
    const state = getState();
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: "Order not found." };
    }

    (order as any).status = "REFUNDED";
    (order as any).refundedAt = new Date().toISOString();
    (order as any).refundReason = reason || "Customer requested reversal";
    saveToDisk();
    return { success: true, order, message: "Order successfully refunded." };
  },

  // ==========================================
  // CHANNELS / COMMUNITIES
  // ==========================================
  getChannels(): Channel[] {
    return getState().channels;
  },

  getChannelById(id: string): Channel | null {
    return getState().channels.find((c) => c.id === id || c.slug === id) || null;
  },

  saveChannel(channel: Channel): Channel {
    const state = getState();
    const idx = state.channels.findIndex((c) => c.id === channel.id || c.slug === channel.slug);
    if (idx >= 0) {
      state.channels[idx] = channel;
    } else {
      state.channels.unshift(channel);
    }
    saveToDisk();
    return channel;
  },

  deleteChannel(id: string): boolean {
    const state = getState();
    const initialLen = state.channels.length;
    state.channels = state.channels.filter((c) => c.id !== id && c.slug !== id);
    if (state.channels.length !== initialLen) {
      saveToDisk();
      return true;
    }
    return false;
  },

  // ==========================================
  // USERS & PROFILE MANAGEMENT
  // ==========================================
  getUsers(): ServerUserRecord[] {
    return getState().users;
  },

  getUserById(id: string): ServerUserRecord | null {
    const user = getState().users.find((u) => u.id === id || u.email.toLowerCase() === id.toLowerCase()) || null;
    if (user && !user.username) {
      user.username = generateAutoUsername(user.name, user.email, user.id);
      saveToDisk();
    }
    return user;
  },

  getUserByUsername(username: string): ServerUserRecord | null {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    return getState().users.find((u) => {
      const uName = (u.username || generateAutoUsername(u.name, u.email, u.id)).toLowerCase();
      return uName === clean;
    }) || null;
  },

  saveUser(user: ServerUserRecord): ServerUserRecord {
    const state = getState();
    if (!user.username) {
      user.username = generateAutoUsername(user.name, user.email, user.id);
    }
    const idx = state.users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      state.users[idx] = { ...state.users[idx], ...user };
    } else {
      state.users.unshift(user);
    }
    saveToDisk();
    return user;
  },

  updateUserStatus(userId: string, status: ServerUserRecord["accountStatus"]): boolean {
    const state = getState();
    const user = state.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (user) {
      user.accountStatus = status;
      saveToDisk();
      return true;
    }
    return false;
  },

  updateUserVerification(userId: string, verification: ServerUserRecord["verificationStatus"], token?: string): boolean {
    const state = getState();
    const user = state.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (user) {
      user.verificationStatus = verification;
      if (token) {
        user.verificationToken = token;
        user.verificationRequestedAt = new Date().toISOString();
      }
      if (verification === "VERIFIED") {
        user.verificationToken = undefined;
      }
      saveToDisk();
      return true;
    }
    return false;
  },

  getUserByVerificationToken(token: string): ServerUserRecord | null {
    const state = getState();
    return state.users.find((u) => u.verificationToken === token) || null;
  },

  addUserNote(userId: string, note: { author: string; category: any; content: string }): boolean {
    const state = getState();
    const user = state.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (user) {
      if (!user.notes) user.notes = [];
      user.notes.unshift({
        id: `note_${Date.now()}`,
        author: note.author,
        date: new Date().toISOString(),
        category: note.category,
        content: note.content,
      });
      saveToDisk();
      return true;
    }
    return false;
  },

  addUserCommunication(userId: string, comm: { channel: any; subject: string; content: string }): boolean {
    const state = getState();
    const user = state.users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (user) {
      if (!user.communications) user.communications = [];
      user.communications.unshift({
        id: `comm_${Date.now()}`,
        channel: comm.channel,
        subject: comm.subject,
        content: comm.content,
        status: "SENT",
        timestamp: new Date().toISOString(),
      });
      saveToDisk();
      return true;
    }
    return false;
  },

  // ==========================================
  // SHORT LINKS & TRACKERS
  // ==========================================
  getShortLinks(): ShortLinkTracker[] {
    const state = getState();
    return state.short_links || [];
  },

  getShortLinkByCode(code: string): ShortLinkTracker | undefined {
    const state = getState();
    const cleanCode = code.trim().toLowerCase();
    return (state.short_links || []).find(
      (l) => l.code.toLowerCase() === cleanCode || l.id === code
    );
  },

  saveShortLink(link: ShortLinkTracker): ShortLinkTracker {
    const state = getState();
    if (!state.short_links) state.short_links = [];
    const cleanCode = link.code.trim().toLowerCase();
    const existingIdx = state.short_links.findIndex(
      (l) => l.id === link.id || l.code.toLowerCase() === cleanCode
    );

    const updatedLink: ShortLinkTracker = {
      ...link,
      code: cleanCode,
      clicks: link.clicks || 0,
      unique_visitors: link.unique_visitors || 0,
      created_at: link.created_at || new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      state.short_links[existingIdx] = updatedLink;
    } else {
      state.short_links.unshift(updatedLink);
    }
    saveToDisk();
    return updatedLink;
  },

  deleteShortLink(idOrCode: string): boolean {
    const state = getState();
    if (!state.short_links) return false;
    const initialLen = state.short_links.length;
    state.short_links = state.short_links.filter(
      (l) => l.id !== idOrCode && l.code.toLowerCase() !== idOrCode.toLowerCase()
    );
    if (state.short_links.length !== initialLen) {
      saveToDisk();
      return true;
    }
    return false;
  },

  recordShortLinkClick(code: string, meta?: Partial<DeviceTelemetryEvent>): ShortLinkTracker | null {
    const state = getState();
    if (!state.short_links) return null;
    const cleanCode = code.trim().toLowerCase();
    const target = state.short_links.find((l) => l.code.toLowerCase() === cleanCode);
    if (!target) return null;

    target.clicks = (target.clicks || 0) + 1;
    if (meta?.visitor_id) {
      target.unique_visitors = (target.unique_visitors || 0) + 1;
    }
    saveToDisk();
    return target;
  },

  // ==========================================
  // DEVICE TELEMETRY & MASS ANALYTICS
  // ==========================================
  recordTelemetry(event: DeviceTelemetryEvent): boolean {
    const state = getState();
    if (!state.telemetry_events) state.telemetry_events = [];

    // Store event (cap at last 50,000 events to prevent unbounded disk growth)
    state.telemetry_events.unshift(event);
    if (state.telemetry_events.length > 50000) {
      state.telemetry_events = state.telemetry_events.slice(0, 50000);
    }
    saveToDisk();
    return true;
  },

  getTelemetryEvents(limit: number = 100): DeviceTelemetryEvent[] {
    const state = getState();
    return (state.telemetry_events || []).slice(0, limit);
  },

  getTelemetryStats() {
    const state = getState();
    const events = state.telemetry_events || [];
    const totalViews = events.length;

    const uniqueVisitorSet = new Set<string>();
    const devices: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browsers: Record<string, number> = {};
    const os: Record<string, number> = {};
    const pathCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};

    events.forEach((ev) => {
      if (ev.visitor_id) uniqueVisitorSet.add(ev.visitor_id);
      if (ev.device && devices[ev.device] !== undefined) {
        devices[ev.device] = (devices[ev.device] || 0) + 1;
      }
      if (ev.browser) {
        browsers[ev.browser] = (browsers[ev.browser] || 0) + 1;
      }
      if (ev.os) {
        os[ev.os] = (os[ev.os] || 0) + 1;
      }
      if (ev.pathname) {
        pathCounts[ev.pathname] = (pathCounts[ev.pathname] || 0) + 1;
      }
      const sourceKey = ev.utm_source || (ev.referrer && !ev.referrer.includes("localhost") ? "Referral" : "Direct");
      sourceCounts[sourceKey] = (sourceCounts[sourceKey] || 0) + 1;
    });

    const topPaths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_pageviews: totalViews,
      unique_visitors: uniqueVisitorSet.size,
      devices,
      browsers,
      os,
      top_paths: topPaths,
      top_sources: topSources,
      recent: events.slice(0, 25),
    };
  },

  // ==========================================
  // SYSTEM & MAINTENANCE
  // ==========================================
  clearAll(): void {
    memoryState = {
      events: [],
      teams: [],
      attendees: [],
      orders: [],
      channels: [],
      users: [],
      short_links: [],
      telemetry_events: [],
    };
    saveToDisk();
  },

  reloadFromDisk(): ServerState {
    isLoaded = false;
    return loadFromDisk();
  },

  // ==========================================
  // PLATFORM SETTINGS (module access + fees)
  // ==========================================
  getSettings(): PlatformSettings {
    return getState().settings || defaultPlatformSettings();
  },

  saveSettings(patch: Partial<Pick<PlatformSettings, "moduleAccess" | "platformFeePercent" | "paymentGateways">>, updatedBy: string): PlatformSettings {
    const state = getState();
    const current = state.settings || defaultPlatformSettings();
    state.settings = {
      ...current,
      ...(patch.moduleAccess
        ? { moduleAccess: { ...current.moduleAccess, ...patch.moduleAccess } }
        : {}),
      ...(patch.platformFeePercent !== undefined ? { platformFeePercent: patch.platformFeePercent } : {}),
      ...(patch.paymentGateways !== undefined
        ? {
            paymentGateways: {
              ...(current.paymentGateways || {}),
              ...patch.paymentGateways,
            },
          }
        : {}),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    saveToDisk();
    return state.settings;
  },
};
