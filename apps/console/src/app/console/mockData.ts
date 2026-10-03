import {
  ConsoleRole,
  RoleDefinition,
  AttendeeRecord,
  PromoCode,
  SessionScheduleItem,
  VenueRoom,
  PlatformEventApproval,
  OrganizerKYC,
  FinancialTransaction,
} from "./types";
import {
  getStoredEvents,
  getAllAttendees,
  getAllOrders,
  getUserTickets,
  getFeaturedEventId,
  StoredAttendee,
  StoredOrder,
  UserTicket,
} from "@/lib/api";

export const CONSOLE_ROLES: RoleDefinition[] = [
  {
    id: "organizer",
    title: "Organizer",
    badge: "Host",
    category: "organizer",
    description: "Full control over drops, pricing tiers, sales, sessions, and door lists across multiple events.",
    allowedPaths: ["/console/organizer", "/console/finance", "/console/checkin", "/console/venue"],
  },
  {
    id: "event_manager",
    title: "Event Manager",
    badge: "Team",
    category: "team",
    description: "Manage schedules, rooms, staff assignments, and attendee inquiries.",
    allowedPaths: ["/console/team", "/console/venue", "/console/checkin"],
  },
  {
    id: "marketing_manager",
    title: "Marketing Manager",
    badge: "Team",
    category: "team",
    description: "Manage promo campaigns, referral links, discount codes, and analytics.",
    allowedPaths: ["/console/team", "/console/organizer"],
  },
  {
    id: "finance_manager",
    title: "Finance Manager",
    badge: "Team",
    category: "team",
    description: "Audit payouts, refunds, gross revenue, tax reporting, and reconciliations.",
    allowedPaths: ["/console/finance", "/console/team"],
  },
  {
    id: "checkin_manager",
    title: "Check-in Manager",
    badge: "Operations",
    category: "team",
    description: "Operate fast door scanners, manage entrance gates, and audit attendance.",
    allowedPaths: ["/console/checkin"],
  },
  {
    id: "super_admin",
    title: "Super Admin",
    badge: "Platform Owner",
    category: "platform",
    description: "Global control center: GMV, KYC approvals, disputes, fraud flags, and platform fees.",
    allowedPaths: ["/console/super-admin"],
  },
  {
    id: "venue_host",
    title: "Venue & Host Lead",
    badge: "On-Site",
    category: "venue",
    description: "Live real-time hall capacities, door statuses, emergency broadcasts, and session pacing.",
    allowedPaths: ["/console/venue", "/console/checkin"],
  },
];

// ---------------------------------------------------------------------------
// Dynamic Admin Stores - Zero Fake Dummy Data
// ---------------------------------------------------------------------------

export function getDynamicAdminEvents() {
  const events = getStoredEvents();
  return events.map((ev) => {
    const totalCap = ev.tiers?.reduce((sum, t) => sum + (t.total_capacity || 0), 0) || ev.total_capacity || 0;
    const remainingCap = ev.tiers?.length ? ev.tiers.reduce((sum, tier) => sum + (tier.remaining_capacity ?? tier.total_capacity), 0) : totalCap;
    const sold = Math.max(0, totalCap - remainingCap);
    const avgPrice = ev.tiers?.[0]?.price_cents ? ev.tiers[0].price_cents / 100 : 0;
    return {
      id: ev.id,
      title: ev.title,
      organizer: ev.hosts?.[0] || ev.organizer_id || "Platform Host",
      date: ev.start_time || "Upcoming",
      status: ev.status === "SOLD_OUT" ? "LIVE_NOW" : ev.status || "PUBLISHED",
      totalCapacity: totalCap,
      ticketsSold: sold,
      grossGMV: sold * avgPrice,
      featured: ev.id === getFeaturedEventId(),
    };
  });
}

export function getDynamicAdminUsers() {
  const attendees = getAllAttendees();
  const orders = getAllOrders();
  const map = new Map<string, any>();

  attendees.forEach((a) => {
    const userOrders = orders.filter((o) => o.buyerEmail.toLowerCase() === a.email.toLowerCase());
    const spent = userOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
    map.set(a.email.toLowerCase(), {
      id: a.id,
      name: a.name,
      email: a.email,
      ordersCount: userOrders.length,
      totalSpent: spent,
      joinedDate: a.registeredAt ? new Date(a.registeredAt).toLocaleDateString() : "Unavailable",
      status: "ACTIVE",
    });
  });

  return Array.from(map.values());
}

export function getDynamicAdminOrders() {
  const orders = getAllOrders();
  return orders.map((o) => ({
    id: o.id,
    customer: o.buyerName,
    email: o.buyerEmail,
    event: o.eventName,
    tier: o.tierName,
    amount: o.amount,
    method: o.paymentMethod || "Unavailable",
    status: o.status,
    date: new Date(o.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
  }));
}

export function getDynamicAdminTickets() {
  const tickets = getUserTickets();
  return tickets.map((t) => ({
    id: t.id,
    ticketCode: t.ticket_code,
    event: t.event_title,
    owner: t.user_name,
    tier: t.tier_name,
    checkInStatus: t.status === "CHECKED_IN" ? "CHECKED_IN" : "ISSUED",
    gate: "Unavailable",
    scannedAt: t.checked_in_at || "—",
  }));
}

// ---------------------------------------------------------------------------
// Zero Dummy Data Arrays (Clean initial states that dynamically populate)
// ---------------------------------------------------------------------------
export const MOCK_ATTENDEES: AttendeeRecord[] = [];
export const MOCK_ADMIN_EVENTS: any[] = [];
export const MOCK_ADMIN_ORGANIZERS: any[] = [];
export const MOCK_ADMIN_USERS: any[] = [];
export const MOCK_ADMIN_ORDERS: any[] = [];
export const MOCK_ADMIN_TICKETS: any[] = [];
export const MOCK_TRANSACTIONS: FinancialTransaction[] = [];
export const MOCK_PROMO_CODES: PromoCode[] = [];
export const MOCK_VENUE_ROOMS: VenueRoom[] = [];
export const MOCK_SESSIONS: SessionScheduleItem[] = [];
export const MOCK_PLATFORM_APPROVALS: PlatformEventApproval[] = [];
export const MOCK_ORGANIZER_KYC: OrganizerKYC[] = [];
export const MOCK_ADMIN_REFUNDS: any[] = [];
export const MOCK_ADMIN_PAYOUTS: any[] = [];
export const MOCK_ADMIN_COMMISSIONS: any[] = [];
export const MOCK_ADMIN_FRAUD_FLAGS: any[] = [];
export const MOCK_ADMIN_DISPUTES: any[] = [];
export const MOCK_ADMIN_SUPPORT: any[] = [];
export const MOCK_ADMIN_NOTIFICATIONS: any[] = [];
export const MOCK_ADMIN_CMS: any[] = [];
export const MOCK_ADMIN_STAFF: any[] = [];
export const MOCK_ADMIN_AUDIT_LOGS: any[] = [];
export const MOCK_CO_ORGANIZER_EVENTS: any[] = [];
export const MOCK_CO_ORGANIZER_TASKS: any[] = [];
export const MOCK_GUEST_LIST: any[] = [];
export const MOCK_CHECKIN_STATIONS: any[] = [];
export const MOCK_MARKETING_CAMPAIGNS: any[] = [];
export const MOCK_COMMUNICATIONS: any[] = [];
export const MOCK_TEAM_ACTIVITY_LOGS: any[] = [];
export const MOCK_TEAM_NOTIFICATIONS: any[] = [];
