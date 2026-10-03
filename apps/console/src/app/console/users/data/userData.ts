import { getAllAttendees, getAllOrders, getStoredEvents } from "@/lib/api";
import { EventItem } from "@/lib/types";

export type UserAccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED" | "NEW" | "DELETED";
export type UserVerificationStatus = "VERIFIED" | "UNVERIFIED" | "PENDING" | "REJECTED";
export type UserAccountType = "ATTENDEE" | "ORGANIZER" | "VIP" | "ADMIN";

export interface UserEventRecord {
  eventId: string;
  eventTitle: string;
  banner_url?: string; // 16:9
  square_banner_url?: string; // 1:1
  city?: string;
  location?: string;
  date: string;
  ticketTier: string;
  ticketCode: string;
  orderId: string;
  amount: number;
  status: "REGISTERED" | "ATTENDED" | "UPCOMING" | "PAST" | "CANCELLED";
  checkInStatus: "CHECKED_IN" | "NOT_CHECKED_IN";
  checkInTime?: string;
}

export interface UserOrderRecord {
  id: string;
  eventId: string;
  eventName: string;
  tierName: string;
  amount: number;
  paymentMethod: string;
  status: "COMPLETED" | "FAILED" | "PENDING" | "REFUNDED" | "CANCELLED";
  transactionId: string;
  createdAt: string;
}

export interface UserActivityRecord {
  id: string;
  type:
    | "LOGIN"
    | "LOGOUT"
    | "EVENT_VIEW"
    | "EVENT_REGISTRATION"
    | "TICKET_PURCHASE"
    | "CHECK_IN"
    | "PROFILE_UPDATE"
    | "PASSWORD_CHANGE"
    | "TICKET_TRANSFER"
    | "REFUND_REQUEST"
    | "MESSAGE_SENT";
  title: string;
  detail: string;
  timestamp: string;
  ipAddress?: string;
}

export interface UserSessionRecord {
  id: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  status: "ACTIVE" | "REVOKED";
}

export interface UserNoteRecord {
  id: string;
  author: string;
  date: string;
  category: "INTERNAL" | "SUPPORT" | "ACCOUNT" | "MODERATION";
  content: string;
}

export interface UserReportRecord {
  id: string;
  reporter: string;
  reportedUser: string;
  category: string;
  reason: string;
  evidence?: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolution?: string;
}

export interface UserCommunicationRecord {
  id: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP";
  subject: string;
  content: string;
  status: "SENT" | "DELIVERED" | "OPENED" | "FAILED";
  timestamp: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  accountStatus: UserAccountStatus;
  verificationStatus: UserVerificationStatus;
  accountType: UserAccountType;
  joinedDate: string;
  lastActive: string;
  lastLogin: string;
  eventsAttendedCount: number;
  ticketsPurchasedCount: number;
  totalSpend: number;
  events: UserEventRecord[];
  orders: UserOrderRecord[];
  activities: UserActivityRecord[];
  sessions: UserSessionRecord[];
  notes: UserNoteRecord[];
  reports: UserReportRecord[];
  communications: UserCommunicationRecord[];
  suspensionReason?: string;
  banReason?: string;
}

export interface UserFilterState {
  status: string; // "all", "active", "inactive", "new", "verified", "unverified", "suspended", "banned", "deleted"
  verification: string; // "all", "verified", "unverified", "pending", "rejected"
  accountType: string; // "all", "attendee", "organizer", "vip", "admin"
  eventId: string; // "all" or specific event ID
  searchQuery: string;
  dateRange: "today" | "7d" | "30d" | "90d" | "1y" | "all";
}

const LOCAL_STORE_KEY = "hackways_managed_users_overrides_v1";

interface UserOverrides {
  [userId: string]: Partial<ManagedUser>;
}

function getStoredOverrides(): UserOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

if (typeof window !== "undefined") {
  fetch("/api/v1/users")
    .then((r) => r.json())
    .then((data) => {
      if (data.users && Array.isArray(data.users) && data.users.length > 0) {
        const current = getStoredOverrides();
        data.users.forEach((u: any) => {
          current[u.id] = {
            ...(current[u.id] || {}),
            accountStatus: u.accountStatus,
            verificationStatus: u.verificationStatus,
            accountType: u.accountType,
            notes: u.notes && u.notes.length > 0 ? u.notes : current[u.id]?.notes || [],
            communications: u.communications && u.communications.length > 0 ? u.communications : current[u.id]?.communications || [],
          };
        });
        localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(current));
      }
    })
    .catch(() => {});
}

export function saveUserOverride(userId: string, updates: Partial<ManagedUser>) {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredOverrides();
    current[userId] = { ...current[userId], ...updates };
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(current));

    // Sync to backend
    fetch(`/api/v1/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  } catch (err) {
    console.error("Failed to save user override", err);
  }
}

export function addUserNote(userId: string, note: Omit<UserNoteRecord, "id" | "date">) {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredOverrides();
    const existing = current[userId] || {};
    const existingNotes = existing.notes || [];
    const newNote: UserNoteRecord = {
      ...note,
      id: `note_${Date.now()}`,
      date: new Date().toISOString(),
    };
    current[userId] = {
      ...existing,
      notes: [newNote, ...existingNotes],
    };
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(current));

    // Sync to backend
    fetch(`/api/v1/users/${userId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNote),
    }).catch(() => {});
  } catch (err) {
    console.error("Failed to add note", err);
  }
}

export function addUserCommunication(userId: string, comm: Omit<UserCommunicationRecord, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredOverrides();
    const existing = current[userId] || {};
    const existingComms = existing.communications || [];
    const newComm: UserCommunicationRecord = {
      ...comm,
      id: `comm_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    current[userId] = {
      ...existing,
      communications: [newComm, ...existingComms],
    };
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(current));

    // Sync to backend
    fetch(`/api/v1/users/${userId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newComm),
    }).catch(() => {});
  } catch (err) {
    console.error("Failed to add communication", err);
  }
}

/**
 * Aggregates real platform data into ManagedUser entities
 */
export function getManagedUsers(filters?: Partial<UserFilterState>): {
  users: ManagedUser[];
  allUsers: ManagedUser[];
  totalCount: number;
  hasRealUsers: boolean;
  events: EventItem[];
} {
  const events = getStoredEvents(true);
  const attendees = getAllAttendees();
  const orders = getAllOrders();
  const overrides = getStoredOverrides();

  const userMap = new Map<string, ManagedUser>();

  // 1. Ingest attendees into unique user profiles
  attendees.forEach((att) => {
    const emailKey = att.email.toLowerCase().trim();
    if (!emailKey) return;

    const ev = events.find((e) => e.id === att.eventId);
    const evTitle = ev?.title || "Ticket Drop";

    const eventRecord: UserEventRecord = {
      eventId: att.eventId,
      eventTitle: evTitle,
      banner_url: ev?.banner_url,
      square_banner_url: ev?.square_banner_url,
      city: ev?.city,
      location: ev?.location,
      date: att.registeredAt || new Date().toISOString(),
      ticketTier: att.tierName || "General Admission",
      ticketCode: att.ticketCode,
      orderId: orders.find((order) => order.ticketCode === att.ticketCode)?.id || "",
      amount: 0,
      status: att.status === "CHECKED_IN" ? "ATTENDED" : "REGISTERED",
      checkInStatus: att.status === "CHECKED_IN" ? "CHECKED_IN" : "NOT_CHECKED_IN",
      checkInTime: att.checkedInAt,
    };

    if (userMap.has(emailKey)) {
      const existing = userMap.get(emailKey)!;
      existing.events.push(eventRecord);
      existing.eventsAttendedCount = existing.events.filter((e) => e.checkInStatus === "CHECKED_IN").length;
      existing.ticketsPurchasedCount = existing.events.length;
    } else {
      userMap.set(emailKey, {
        id: att.id || `usr_${Math.random().toString(36).slice(2, 9)}`,
        name: att.name || emailKey.split("@")[0],
        email: emailKey,
        phone: (att as any).phone || "—",
        avatar: "",
        accountStatus: "ACTIVE",
        verificationStatus: "UNVERIFIED",
        accountType: "ATTENDEE",
        joinedDate: att.registeredAt || new Date().toISOString(),
        lastActive: att.checkedInAt || att.registeredAt || new Date().toISOString(),
        lastLogin: att.registeredAt || new Date().toISOString(),
        eventsAttendedCount: att.status === "CHECKED_IN" ? 1 : 0,
        ticketsPurchasedCount: 1,
        totalSpend: 0,
        events: [eventRecord],
        orders: [],
        activities: [
          {
            id: `act_${att.id}`,
            type: "EVENT_REGISTRATION",
            title: "Registered for Event",
            detail: `${evTitle} · Pass ${att.ticketCode}`,
            timestamp: att.registeredAt || new Date().toISOString(),
          },
        ],
        sessions: [],
        notes: [],
        reports: [],
        communications: [],
      });
    }
  });

  // 2. Correlate real orders
  orders.forEach((ord) => {
    const buyerEmail = (ord.buyerEmail || "").toLowerCase().trim();
    if (!buyerEmail) return;

    const amount = ord.amount || (ord as any).totalAmount || 0;
    const orderRecord: UserOrderRecord = {
      id: ord.id,
      eventId: ord.eventId,
      eventName: ord.eventName || "Event Ticket",
      tierName: ord.tierName || "Admission",
      amount,
      paymentMethod: ord.paymentMethod || "Unavailable",
      status: ord.status === "REFUNDED" ? "REFUNDED" : ord.status === "CONFIRMED" ? "COMPLETED" : "PENDING",
      transactionId: (ord as any).transactionId || "",
      createdAt: ord.createdAt || new Date().toISOString(),
    };

    if (userMap.has(buyerEmail)) {
      const u = userMap.get(buyerEmail)!;
      u.orders.push(orderRecord);
      u.totalSpend += amount;
      u.activities.push({
        id: `act_${ord.id}`,
        type: "TICKET_PURCHASE",
        title: `Purchased Ticket — ₹${amount}`,
        detail: `${orderRecord.eventName} (${orderRecord.tierName})`,
        timestamp: orderRecord.createdAt,
      });
    } else {
      userMap.set(buyerEmail, {
        id: `usr_${ord.id.slice(0, 8)}`,
        name: ord.buyerName || buyerEmail.split("@")[0],
        email: buyerEmail,
        phone: (ord as any).buyerPhone || "—",
        avatar: "",
        accountStatus: "ACTIVE",
        verificationStatus: "UNVERIFIED",
        accountType: "ATTENDEE",
        joinedDate: ord.createdAt || new Date().toISOString(),
        lastActive: ord.createdAt || new Date().toISOString(),
        lastLogin: ord.createdAt || new Date().toISOString(),
        eventsAttendedCount: 0,
        ticketsPurchasedCount: 1,
        totalSpend: amount,
        events: [],
        orders: [orderRecord],
        activities: [
          {
            id: `act_${ord.id}`,
            type: "TICKET_PURCHASE",
            title: `Order confirmed — ₹${amount}`,
            detail: `${orderRecord.eventName}`,
            timestamp: orderRecord.createdAt,
          },
        ],
        sessions: [],
        notes: [],
        reports: [],
        communications: [],
      });
    }
  });

  // 3. Ingest hosts as organizer accounts
  events.forEach((ev) => {
    if (ev.host_users && ev.host_users.length > 0) {
      ev.host_users.forEach((hu) => {
        const email = hu.email.toLowerCase().trim();
        if (!email) return;
        if (!userMap.has(email)) {
          userMap.set(email, {
            id: hu.user_id || `host_${Math.random().toString(36).slice(2, 8)}`,
            name: hu.name || "Event Organizer",
            email,
            phone: "—",
            avatar: hu.avatar_url || "",
            accountStatus: "ACTIVE",
            verificationStatus: "UNVERIFIED",
            accountType: "ORGANIZER",
            joinedDate: ev.created_at || new Date().toISOString(),
            lastActive: ev.created_at || new Date().toISOString(),
            lastLogin: ev.created_at || new Date().toISOString(),
            eventsAttendedCount: 0,
            ticketsPurchasedCount: 0,
            totalSpend: 0,
            events: [],
            orders: [],
            activities: [
              {
                id: `act_${ev.id}`,
                type: "PROFILE_UPDATE",
                title: "Created Event Drop",
                detail: ev.title,
                timestamp: ev.created_at || new Date().toISOString(),
              },
            ],
            sessions: [],
            notes: [],
            reports: [],
            communications: [],
          });
        }
      });
    }
  });

  // 4. Apply stored overrides
  const allUsersList = Array.from(userMap.values()).map((user) => {
    const override = overrides[user.id] || overrides[user.email];
    if (override) {
      return {
        ...user,
        ...override,
        notes: [...(override.notes || []), ...user.notes],
        communications: [...(override.communications || []), ...user.communications],
      };
    }
    return user;
  });

  // 5. Apply filters
  let filtered = allUsersList;

  if (filters) {
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          u.events.some((e) => e.eventTitle.toLowerCase().includes(q) || e.ticketCode.toLowerCase().includes(q))
      );
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((u) => u.accountStatus.toLowerCase() === filters.status!.toLowerCase());
    }

    if (filters.verification && filters.verification !== "all") {
      filtered = filtered.filter((u) => u.verificationStatus.toLowerCase() === filters.verification!.toLowerCase());
    }

    if (filters.accountType && filters.accountType !== "all") {
      filtered = filtered.filter((u) => u.accountType.toLowerCase() === filters.accountType!.toLowerCase());
    }

    if (filters.eventId && filters.eventId !== "all") {
      filtered = filtered.filter((u) => u.events.some((e) => e.eventId === filters.eventId));
    }
  }

  return {
    users: filtered,
    allUsers: allUsersList,
    totalCount: filtered.length,
    hasRealUsers: allUsersList.length > 0,
    events,
  };
}

export function getManagedUserById(id: string): ManagedUser | null {
  const { allUsers } = getManagedUsers();
  const cleanId = decodeURIComponent(id).toLowerCase();
  return allUsers.find((u) => u.id.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) || null;
}

export interface UserTabKpi {
  label: string;
  value: string | number;
  subtext: string;
  delta?: string;
  isPositive?: boolean;
}

/**
 * Returns dedicated, authentic 4 KPIs for each user management tab
 */
export function getUserTabKpis(tabId: string, users: ManagedUser[], allUsers: ManagedUser[]): UserTabKpi[] {
  const total = allUsers.length;
  const active = allUsers.filter((u) => u.accountStatus === "ACTIVE").length;
  const verified = allUsers.filter((u) => u.verificationStatus === "VERIFIED").length;
  const verifiedRate = total > 0 ? `${Math.round((verified / total) * 100)}%` : "0%";
  const totalSpend = allUsers.reduce((sum, u) => sum + u.totalSpend, 0);
  const avgSpend = total > 0 ? `₹${Math.round(totalSpend / total).toLocaleString()}` : "₹0";

  switch (tabId) {
    case "all-users":
      return [
        { label: "Total Users", value: total, subtext: total > 0 ? "Registered in database" : "No users found" },
        { label: "Active Accounts", value: active, subtext: "Logged in recently" },
        { label: "Verification Rate", value: verifiedRate, subtext: "Email & identity verified" },
        { label: "Average Spend", value: avgSpend, subtext: "Per customer lifetime" },
      ];

    case "segments": {
      const highValue = allUsers.filter((u) => u.totalSpend > 1000).length;
      const frequent = allUsers.filter((u) => u.eventsAttendedCount >= 2).length;
      const inactive = allUsers.filter((u) => u.accountStatus === "INACTIVE").length;
      return [
        { label: "High-Value Users", value: highValue, subtext: "Spend > ₹1,000" },
        { label: "Frequent Attendees", value: frequent, subtext: "Attended 2+ events" },
        { label: "Inactive Accounts", value: inactive, subtext: "No recent activity" },
        { label: "Total Segments", value: "Unavailable", subtext: "Segment configuration is not connected" },
      ];
    }

    case "activity": {
      const totalActivities = allUsers.reduce((sum, u) => sum + u.activities.length, 0);
      const logins = allUsers.reduce(
        (sum, u) => sum + u.activities.filter((a) => a.type === "LOGIN").length,
        0
      );
      const purchases = allUsers.reduce(
        (sum, u) => sum + u.activities.filter((a) => a.type === "TICKET_PURCHASE").length,
        0
      );
      return [
        { label: "Logged Actions", value: totalActivities, subtext: "User telemetry traces" },
        { label: "Login Events", value: logins, subtext: "Authenticated sessions" },
        { label: "Purchase Actions", value: purchases, subtext: "Completed checkouts" },
        { label: "Telemetry Health", value: "Unavailable", subtext: "Stream health is not connected" },
      ];
    }

    case "verification": {
      const unverified = allUsers.filter((u) => u.verificationStatus === "UNVERIFIED").length;
      const pending = allUsers.filter((u) => u.verificationStatus === "PENDING").length;
      return [
        { label: "Verified Users", value: verified, subtext: "Trusted identity" },
        { label: "Pending Reviews", value: pending, subtext: "Awaiting ID check" },
        { label: "Unverified Users", value: unverified, subtext: "Action required" },
        { label: "Verification SLA", value: "Unavailable", subtext: "Verification timing is not recorded" },
      ];
    }

    case "events-tickets": {
      const totalTickets = allUsers.reduce((sum, u) => sum + u.ticketsPurchasedCount, 0);
      const totalAttended = allUsers.reduce((sum, u) => sum + u.eventsAttendedCount, 0);
      return [
        { label: "Issued Passes", value: totalTickets, subtext: "Across all ticket holders" },
        { label: "Attended Passes", value: totalAttended, subtext: "Checked in at door" },
        {
          label: "Attendance Ratio",
          value: totalTickets > 0 ? `${Math.round((totalAttended / totalTickets) * 100)}%` : "0%",
          subtext: "Show-up percentage",
        },
        { label: "Active Ticket Holders", value: allUsers.filter((u) => u.ticketsPurchasedCount > 0).length, subtext: "With valid credentials" },
      ];
    }

    case "orders-payments": {
      const totalOrders = allUsers.reduce((sum, u) => sum + u.orders.length, 0);
      return [
        { label: "Captured Orders", value: totalOrders, subtext: "Paid transactions" },
        { label: "Customer GMV", value: `₹${totalSpend.toLocaleString()}`, subtext: "Total transaction volume" },
        { label: "Avg Transaction", value: totalOrders > 0 ? `₹${Math.round(totalSpend / totalOrders).toLocaleString()}` : "₹0", subtext: "Ticket basket size" },
        { label: "Refund Rate", value: totalOrders ? `${Math.round(allUsers.reduce((sum, user) => sum + user.orders.filter((order) => order.status === "REFUNDED").length, 0) / totalOrders * 100)}%` : "Unavailable", subtext: "Recorded refunded orders" },
      ];
    }

    case "communication": {
      const totalComms = allUsers.reduce((sum, u) => sum + u.communications.length, 0);
      return [
        { label: "Messages Dispatched", value: totalComms, subtext: "Emails & push alerts" },
        { label: "Delivery Rate", value: "Unavailable", subtext: "Delivery receipts are not connected" },
        { label: "Active Channels", value: "Unavailable", subtext: "Provider status is not connected" },
        { label: "Opt-out Ratio", value: "Unavailable", subtext: "Opt-out tracking is not connected" },
      ];
    }

    case "reports":
    case "restrictions": {
      const suspended = allUsers.filter((u) => u.accountStatus === "SUSPENDED").length;
      const banned = allUsers.filter((u) => u.accountStatus === "BANNED").length;
      const totalReports = allUsers.reduce((sum, u) => sum + u.reports.length, 0);
      return [
        { label: "Open Reports", value: totalReports, subtext: "Safety & trust tickets" },
        { label: "Suspended Accounts", value: suspended, subtext: "Temporarily held" },
        { label: "Banned Users", value: banned, subtext: "Blacklisted credentials" },
        { label: "Safety Index", value: "Unavailable", subtext: "Risk assessment is not connected" },
      ];
    }

    case "search":
      return [
        { label: "Matched Accounts", value: users.length, subtext: "Matching search query" },
        { label: "Total Database", value: total, subtext: "Global platform pool" },
        { label: "Match Index", value: total > 0 ? `${Math.round((users.length / total) * 100)}%` : "0%", subtext: "Filter accuracy" },
        { label: "Indexing Latency", value: "Unavailable", subtext: "Search timing is not recorded" },
      ];

    default:
      return [
        { label: "Total Users", value: total, subtext: "Registered users" },
        { label: "Active Accounts", value: active, subtext: "Active in period" },
        { label: "Verified Ratio", value: verifiedRate, subtext: "Identity verified" },
        { label: "Total GMV", value: `₹${totalSpend.toLocaleString()}`, subtext: "Customer spend" },
      ];
  }
}
