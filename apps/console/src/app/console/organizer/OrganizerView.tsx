"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BarChartIcon,
  TicketIcon,
  UsersGroupIcon,
  FilterIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  QrCodeIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  PresentationIcon,
  LockIcon,
  UserIcon,
  AlertCircleIcon,
  SearchIcon,
  MoreHorizontalIcon,
  ZapIcon,
} from "@/components/icons/hugeicons";
import { SlideOverDrawer } from "@/components/ui/SlideOverDrawer";
import { useToast } from "@/components/ui/Toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import DashboardArtwork from "@/components/ui/DashboardArtwork";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getStoredEvents,
  saveEvent,
  getAllOrders,
  getAllAttendees,
  getStoredChannels,
  deleteEvent,
  setFeaturedEvent,
  clearFeaturedEvent,
  getFeaturedEventId,
  StoredAttendee,
} from "@/lib/api";
import { EventItem, Channel } from "@/lib/types";
import {
  MOCK_ADMIN_EVENTS,
  MOCK_ADMIN_ORDERS,
  MOCK_ATTENDEES,
  MOCK_TEAM_ACTIVITY_LOGS,
  MOCK_TRANSACTIONS,
  MOCK_MARKETING_CAMPAIGNS,
  MOCK_PROMO_CODES,
  MOCK_COMMUNICATIONS,
} from "../mockData";

export interface OrganizerStaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  twoFactorActive: boolean;
  lastActive: string;
}

const INITIAL_ORGANIZER_STAFF: OrganizerStaffMember[] = [];

export const ORGANIZER_ROLES = [
  {
    role: "Event Manager",
    shortDesc: "Draft & publish drops",
    desc: "Draft, edit & publish event drops, ticketing tiers, and schedules.",
    badge: "Host",
  },
  {
    role: "Organizer Admin",
    shortDesc: "Full access & payouts",
    desc: "Full administrative control, team invites, bank accounts and revenue payouts.",
    badge: "Admin",
  },
  {
    role: "Finance Lead",
    shortDesc: "Invoices & tax reconciliation",
    desc: "Access to revenue waterfall, transactions, GST invoices, and settlement statements.",
    badge: "Finance",
  },
  {
    role: "Check-in Operations",
    shortDesc: "Door scanner access",
    desc: "Mobile door scanner, gate manifest, and guest admittance validation.",
    badge: "On-Site",
  },
];

export interface OrganizerEventRecord {
  id: string;
  slug?: string;
  title: string;
  category: string;
  status: "LIVE" | "UPCOMING" | "DRAFT" | "COMPLETED" | "ARCHIVED";
  date: string;
  venue: string;
  ticketsSold: number;
  capacity: number;
  grossGMV: number;
  conversionRate: string;
  createdBy: string;
  lastUpdated: string;
}

const INITIAL_ORGANIZER_EVENTS: OrganizerEventRecord[] = [];

function mapEventToOrganizerRecord(e: EventItem): OrganizerEventRecord {
  const cap = e.tiers?.reduce((sum: number, t: any) => sum + (t.total_capacity || 0), 0) || e.total_capacity || 0;
  const rem = e.tiers?.length ? e.tiers.reduce((sum, tier) => sum + (tier.remaining_capacity ?? tier.total_capacity), 0) : cap;
  const sold = Math.max(0, cap - rem);
  const price = e.tiers?.[0]?.price_cents ? e.tiers[0].price_cents / 100 : 0;
  return {
    id: e.id,
    slug: e.slug || e.id,
    title: e.title,
    category: e.category || "Conference",
    status: (e.status === "SOLD_OUT" ? "LIVE" : e.status || "UPCOMING") as any,
    date: e.start_time || "Upcoming",
    venue: e.location || "Venue TBA",
    ticketsSold: sold,
    capacity: cap,
    grossGMV: sold * price,
    conversionRate: "Unavailable",
    createdBy: e.hosts?.[0] || "Host not provided",
    lastUpdated: "Recently",
  };
}

export interface OrganizerViewProps {
  activeTab: string;
  initialEvents?: EventItem[];
  initialOrders?: any[];
  initialAttendees?: StoredAttendee[];
}

export default function OrganizerView({
  activeTab,
  initialEvents,
  initialOrders,
  initialAttendees,
}: OrganizerViewProps) {
  const { user } = useAuth();
  // Category sub-tabs for each organization module
  const [overviewSubtab, setOverviewSubtab] = useState<"summary" | "performance" | "activity">("summary");
  const [eventsSubtab, setEventsSubtab] = useState<"all" | "drafts" | "upcoming" | "live" | "completed" | "archived">("all");
  const [analyticsSubtab, setAnalyticsSubtab] = useState<"sales" | "revenue" | "audience" | "events" | "marketing">("sales");
  const [customersSubtab, setCustomersSubtab] = useState<"orders" | "attendees" | "customers" | "refunds">("orders");
  const [marketingSubtab, setMarketingSubtab] = useState<"campaigns" | "promotions" | "coupons" | "email_sms" | "tracking">("campaigns");
  const [financeSubtab, setFinanceSubtab] = useState<"revenue" | "payouts" | "transactions" | "invoices" | "tax">("revenue");
  const [teamSubtab, setTeamSubtab] = useState<"members" | "roles" | "permissions" | "activity">("members");
  const [venuesSubtab, setVenuesSubtab] = useState<"all" | "maps" | "details">("all");
  const [integrationsSubtab, setIntegrationsSubtab] = useState<"payments" | "crm" | "email_sms" | "analytics" | "apis">("payments");
  const [settingsSubtab, setSettingsSubtab] = useState<"organization" | "features" | "branding" | "notifications" | "billing" | "security">("organization");
  const [conditionalQuestionsFeature, setConditionalQuestionsFeature] = useState(false);

  // Toast feedback
  const { showToast } = useToast();
  const { settings: platformSettings } = usePlatformSettings();
  const platformFeePct = platformSettings?.platformFeePercent ?? 3;

  // State collections initialized synchronously from server props or local store
  const [eventsList, setEventsList] = useState<OrganizerEventRecord[]>(() => {
    const source = initialEvents || (typeof window !== "undefined" ? getStoredEvents() : []);
    return source.map(mapEventToOrganizerRecord);
  });
  const [orders, setOrders] = useState<any[]>(() => initialOrders || (typeof window !== "undefined" ? getAllOrders() : []));
  const [attendees, setAttendees] = useState<any[]>(() => initialAttendees || (typeof window !== "undefined" ? getAllAttendees() : []));
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<OrganizerStaffMember[]>(INITIAL_ORGANIZER_STAFF);

  useEffect(() => {
    const refreshOrganizerData = () => {
      const stored = getStoredEvents();
      setEventsList(stored.map(mapEventToOrganizerRecord));
      setOrders(getAllOrders() as any);
      setAttendees(getAllAttendees() as any);
      if (typeof window !== "undefined") {
        setConditionalQuestionsFeature(localStorage.getItem("hackways_feature_conditional_questions") === "true");
        const storedTeam = localStorage.getItem("hackways_organizer_team");
        if (storedTeam) {
          try {
            setTeamMembers(JSON.parse(storedTeam));
          } catch (e) {}
        }
        const chans = getStoredChannels();
        setDrawerChannels(chans);
        if (chans.length > 0) {
          setDrawerSelectedChannelId(chans[0].id);
        }
      }
    };

    refreshOrganizerData();
    window.addEventListener("hackways_events_updated", refreshOrganizerData);
    window.addEventListener("hackways_tickets_updated", refreshOrganizerData);
    return () => {
      window.removeEventListener("hackways_events_updated", refreshOrganizerData);
      window.removeEventListener("hackways_tickets_updated", refreshOrganizerData);
    };
  }, []);

  const handleToggleConditionalQuestionsFeature = (enabled: boolean) => {
    setConditionalQuestionsFeature(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("hackways_feature_conditional_questions", enabled ? "true" : "false");
      window.dispatchEvent(new Event("storage"));
    }
    showToast(enabled ? "Conditional questions feature activated." : "Conditional questions feature deactivated.");
  };

  // Search & Filter states
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  // 3-dot dropdown menu state
  const [activeMenuEventId, setActiveMenuEventId] = useState<string | null>(null);

  // Delete event with title confirmation modal
  const [eventToDelete, setEventToDelete] = useState<OrganizerEventRecord | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Featured event on Explore page
  const [featuredEventId, setFeaturedEventIdState] = useState<string | null>(() =>
    typeof window !== "undefined" ? getFeaturedEventId() : null
  );

  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuEventId(null);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Right Slide-Over Drawer States (Kaggle & Linear style)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventSubtitle, setNewEventSubtitle] = useState("");
  const [newEventSlug, setNewEventSlug] = useState("");
  const [newEventCategory, setNewEventCategory] = useState("Developer Conference");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventVenue, setNewEventVenue] = useState("");
  const [newEventCapacity, setNewEventCapacity] = useState("500");
  const [newEventPrice, setNewEventPrice] = useState("1499");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [drawerHostType, setDrawerHostType] = useState<"USER" | "COMMUNITY">("USER");
  const [drawerSelectedChannelId, setDrawerSelectedChannelId] = useState("");
  const [drawerChannels, setDrawerChannels] = useState<Channel[]>([]);

  // Quick Details / Edit Event Drawer
  const [drawerEvent, setDrawerEvent] = useState<OrganizerEventRecord | null>(null);

  // Team Invite Modal state (Multiple emails & custom popover)
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [pendingEmailInput, setPendingEmailInput] = useState("");
  const [inviteRole, setInviteRole] = useState("Event Manager");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    if (isRoleDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoleDropdownOpen]);

  const addEmailsFromText = (rawText: string) => {
    const rawTokens = rawText
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const added: string[] = [];

    for (const token of rawTokens) {
      if (emailRegex.test(token) && !inviteEmails.includes(token) && !added.includes(token)) {
        added.push(token);
      }
    }

    if (added.length > 0) {
      setInviteEmails((prev) => [...prev, ...added]);
      setPendingEmailInput("");
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (pendingEmailInput.trim()) {
        addEmailsFromText(pendingEmailInput);
      }
    } else if (e.key === "Backspace" && !pendingEmailInput && inviteEmails.length > 0) {
      setInviteEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && (pasted.includes("@") || pasted.includes(",") || pasted.includes(" ") || pasted.includes("\n"))) {
      e.preventDefault();
      addEmailsFromText(pasted);
    }
  };

  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState("15");

  // Handlers
  const handleTogglePublish = (id: string) => {
    let nextStatus = "";
    setEventsList(
      eventsList.map((e) => {
        if (e.id === id) {
          nextStatus = e.status === "LIVE" ? "DRAFT" : "LIVE";
          return { ...e, status: nextStatus as any, lastUpdated: "Just now" };
        }
        return e;
      })
    );
    showToast(nextStatus === "LIVE" ? "Event published Live to directory." : "Event moved to Draft.");
  };

  const handleDuplicateEvent = (id: string) => {
    const src = eventsList.find((e) => e.id === id);
    if (!src) return;
    const copy: OrganizerEventRecord = {
      ...src,
      id: `ev_${Date.now()}`,
      title: `${src.title} (Clone)`,
      status: "DRAFT",
      ticketsSold: 0,
      grossGMV: 0,
      conversionRate: "0.0%",
      lastUpdated: "Just now",
    };
    setEventsList([copy, ...eventsList]);
    showToast(`Event "${src.title}" duplicated as draft clone.`);
  };

  const handleArchiveEvent = (id: string) => {
    setEventsList(
      eventsList.map((e) =>
        e.id === id ? { ...e, status: "ARCHIVED", lastUpdated: "Just now" } : e
      )
    );
    showToast("Event archived.");
  };

  const handleConfirmDeleteEvent = () => {
    if (!eventToDelete) return;
    if (deleteConfirmName.trim() !== eventToDelete.title.trim()) {
      showToast("Event name does not match. Please enter exact event title.");
      return;
    }

    setIsDeleting(true);
    deleteEvent(eventToDelete.id, "Deleted by host via console confirmation");
    setEventsList((prev) => prev.filter((e) => e.id !== eventToDelete.id));
    showToast(`Event "${eventToDelete.title}" deleted. Historical logs & transactions archived for Super Admin.`);
    setEventToDelete(null);
    setDeleteConfirmName("");
    setIsDeleting(false);
  };

  const handleRefundOrder = (id: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: "REFUNDED" } : o))
    );
    if (selectedOrderDetails?.id === id) {
      setSelectedOrderDetails({ ...selectedOrderDetails, status: "REFUNDED" });
    }
    showToast("Order refunded.");
  };

  const handleInviteTeam = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let finalEmails = [...inviteEmails];
    if (pendingEmailInput.trim()) {
      const parts = pendingEmailInput
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
      for (const p of parts) {
        if (!finalEmails.includes(p)) {
          finalEmails.push(p);
        }
      }
    }

    if (finalEmails.length === 0) return;

    const newStaffMembers: OrganizerStaffMember[] = finalEmails.map((em, idx) => ({
      id: `stf_${Date.now()}_${idx}`,
      name: em.split("@")[0],
      email: em,
      role: inviteRole,
      status: "ACTIVE",
      twoFactorActive: false,
      lastActive: "Invited just now",
    }));

    const nextList = [...teamMembers, ...newStaffMembers];
    setTeamMembers(nextList);
    if (typeof window !== "undefined") {
      localStorage.setItem("hackways_organizer_team", JSON.stringify(nextList));
    }

    showToast(
      finalEmails.length === 1
        ? `Invitation sent to ${finalEmails[0]}`
        : `Sent ${finalEmails.length} invitations successfully`
    );

    setInviteEmails([]);
    setPendingEmailInput("");
    setIsInviteDrawerOpen(false);
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    const code = newPromoCode.trim().toUpperCase();
    setPromos([
      ...promos,
      {
        id: `pr_${Date.now()}`,
        code,
        discountType: "PERCENT",
        discountValue: Number(newPromoDiscount) || 15,
        usageCount: 0,
        usageLimit: 200,
        status: "ACTIVE",
        campaignName: "Organization Wide",
      },
    ]);
    setNewPromoCode("");
    showToast(`Promo code ${code} activated across organization events.`);
  };

  const exportCSV = (filename: string, rows: string[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Events
  const filteredEvents = eventsList.filter((evt) => {
    if (eventsSubtab === "drafts" && evt.status !== "DRAFT") return false;
    if (eventsSubtab === "upcoming" && evt.status !== "UPCOMING") return false;
    if (eventsSubtab === "live" && evt.status !== "LIVE") return false;
    if (eventsSubtab === "completed" && evt.status !== "COMPLETED") return false;
    if (eventsSubtab === "archived" && evt.status !== "ARCHIVED") return false;
    if (
      eventSearchQuery.trim() &&
      !evt.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) &&
      !evt.venue.toLowerCase().includes(eventSearchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ------------------------------------------------------------------ */}
      {/* 1. OVERVIEW: "How is my entire event business performing?"         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Subtabs & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "summary", label: "Summary" },
                { id: "performance", label: "Performance" },
                { id: "activity", label: "Activity & Alerts" },
              ].map((sub) => {
                const isActive = overviewSubtab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setOverviewSubtab(sub.id as any)}
                    className={`relative pb-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{sub.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/create"
                className="px-3.5 py-1.5 bg-zinc-950 text-white rounded-md text-xs font-medium hover:bg-zinc-800 transition shadow-2xs"
              >
                Create Event
              </Link>
              <button
                onClick={() =>
                  exportCSV("organizer_portfolio_summary", [
                    ["Metric", "Value"],
                    ["Total Events", String(eventsList.length)],
                    ["Active Drops", String(eventsList.filter((e) => e.status === "UPCOMING" || e.status === "LIVE").length)],
                    ["Tickets Sold", String(orders.length)],
                    ["Gross Revenue", `INR ${orders.reduce((sum, o: any) => sum + (o.amount || 0), 0)}`],
                    ["Total Attendees", String(attendees.length)],
                    ["Checked In", String(attendees.filter((a) => a.status === "CHECKED_IN").length)],
                  ])
                }
                className="px-3 py-1.5 border border-zinc-200 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition shadow-2xs"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Core Dynamic KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Total Events</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">{eventsList.length}</div>
              <div className="text-[11px] text-zinc-400">Published in portfolio</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Active Drops</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                {eventsList.filter((e) => e.status === "UPCOMING" || e.status === "LIVE").length}
              </div>
              <div className="text-[11px] text-zinc-400">Open for registrations</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Tickets Sold</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">{orders.length}</div>
              <div className="text-[11px] text-zinc-400">Real verified orders</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Gross Revenue</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                ₹{orders.reduce((sum, o: any) => sum + (o.amount || 0), 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400">Settled ticket sales</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Net Revenue</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * (1 - platformFeePct / 100)).toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400">After platform fee</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Total Attendees</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">{attendees.length}</div>
              <div className="text-[11px] text-zinc-400">Registered across drops</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Checked In</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                {attendees.filter((a) => a.status === "CHECKED_IN").length}
              </div>
              <div className="text-[11px] text-zinc-400">Verified at entrance</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Refunds</div>
              <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
                {orders.filter((o: any) => o.status === "REFUNDED").length}
              </div>
              <div className="text-[11px] text-zinc-400">Cancelled passes</div>
            </div>
          </div>

          {/* Section: Event Performance Table */}
          {(overviewSubtab === "summary" || overviewSubtab === "performance") && (
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Event Performance</h3>
                  <p className="text-xs text-zinc-500">
                    Real-time sales velocity and conversion metrics across active events.
                  </p>
                </div>
                <Link
                  href="/console/organizer/events"
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1"
                >
                  <span>View All Events</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Event</th>
                      <th className="py-2.5 px-3">Tickets Sold</th>
                      <th className="py-2.5 px-3">Revenue</th>
                      <th className="py-2.5 px-3">Capacity</th>
                      <th className="py-2.5 px-3">Conversion</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {eventsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 px-4 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="mb-3"><DashboardArtwork kind="events" /></div>
                            <h4 className="text-sm font-bold text-zinc-950 font-heading">No Events Created Yet</h4>
                            <p className="text-xs text-zinc-500 mt-1 font-body">
                              Create your first event drop to start tracking real-time sales and attendance metrics.
                            </p>
                            <Link href="/create" className="btn-primary mt-4 text-xs">
                              Create Event Drop
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      eventsList.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-zinc-950">{evt.title}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{evt.category}</div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 tabular-nums">
                          {evt.ticketsSold.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-zinc-950 tabular-nums">
                          ₹{evt.grossGMV.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 tabular-nums">
                          {Math.round((evt.ticketsSold / (evt.capacity || 1)) * 100)}% ({evt.capacity})
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700 font-mono">{evt.conversionRate}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              evt.status === "LIVE"
                                ? "bg-zinc-900 text-white"
                                : evt.status === "UPCOMING"
                                ? "bg-zinc-100 text-zinc-800"
                                : "bg-zinc-50 text-zinc-500 border border-zinc-200"
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/console/events/${encodeURIComponent(evt.slug || evt.id)}/overview`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-md transition shadow-2xs group"
                          >
                            <span>Manage</span>
                            <ArrowRightIcon
                              size={12}
                              className="text-zinc-400 group-hover:translate-x-0.5 group-hover:text-zinc-700 transition-transform"
                            />
                          </Link>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Upcoming Events & Operational Alerts */}
          {(overviewSubtab === "summary" || overviewSubtab === "activity") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Events Box */}
              <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-950">Upcoming Events</h3>
                  <span className="text-xs font-mono text-zinc-400">Next Scheduled</span>
                </div>
                <div className="space-y-3">
                  {eventsList
                    .filter((e) => e.status === "UPCOMING" || e.status === "LIVE")
                    .map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-lg border border-zinc-100 bg-zinc-50/50 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-zinc-900">{evt.title}</div>
                          <div className="text-[11px] text-zinc-500">
                            {evt.date} • {evt.venue.split(",")[0]}
                          </div>
                          <div className="text-[11px] text-zinc-600 font-medium">
                            {evt.ticketsSold} sold of {evt.capacity} • ₹{evt.grossGMV.toLocaleString()}
                          </div>
                        </div>
                        <Link
                          href={`/console/events/${encodeURIComponent(evt.slug || evt.id)}/overview`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-md transition shadow-2xs group shrink-0"
                        >
                          <span>Manage</span>
                          <ArrowRightIcon
                            size={12}
                            className="text-zinc-400 group-hover:translate-x-0.5 group-hover:text-zinc-700 transition-transform"
                          />
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. EVENTS: Directory across all hosted events                      */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {/* Subtabs Underline Bar & Search + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "all", label: "All Events" },
                { id: "live", label: "Live" },
                { id: "upcoming", label: "Upcoming" },
                { id: "drafts", label: "Drafts" },
                { id: "completed", label: "Completed" },
                { id: "archived", label: "Archived" },
              ].map((tab) => {
                const isActive = eventsSubtab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEventsSubtab(tab.id as any)}
                    className={`relative pb-1 text-xs font-medium font-heading transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <SearchIcon size={14} className="absolute left-3 top-2 sm:top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search events or venues..."
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500 font-body shadow-2xs"
                />
              </div>
              <Link
                href="/create"
                className="btn-primary"
              >
                <ZapIcon size={12} className="text-zinc-400" />
                <span>Create Event</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  exportCSV(
                    "events_directory",
                    [
                      ["Event ID", "Title", "Category", "Status", "Date", "Venue", "Sold", "Capacity", "GMV"],
                      ...eventsList.map((e) => [
                        e.id,
                        e.title,
                        e.category,
                        e.status,
                        e.date,
                        e.venue,
                        String(e.ticketsSold),
                        String(e.capacity),
                        String(e.grossGMV),
                      ]),
                    ]
                  );
                  showToast("Events directory exported as CSV.");
                }}
                className="btn-secondary"
              >
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Event Table with Prominent "Open Event Dashboard →" */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold font-heading">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Date & Venue</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tickets Sold</th>
                    <th className="py-3 px-4">Revenue</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/console/events/${encodeURIComponent(evt.slug || evt.id)}/overview`}
                            className="font-bold text-zinc-950 text-sm font-heading hover:text-zinc-700 transition hover:underline"
                          >
                            {evt.title}
                          </Link>
                          <div className="text-[11px] text-zinc-400 font-body mt-0.5">{evt.category}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-zinc-900 font-body">{evt.date}</div>
                          <div className="text-[11px] text-zinc-500 max-w-[200px] truncate font-body">
                            {evt.venue}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold font-heading px-2.5 py-0.5 rounded-full ${
                              evt.status === "LIVE"
                                ? "bg-zinc-900 text-white"
                                : evt.status === "UPCOMING"
                                ? "bg-zinc-100 text-zinc-800"
                                : "bg-zinc-50 text-zinc-500 border border-zinc-200"
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 tabular-nums font-heading">
                            {evt.ticketsSold.toLocaleString()} / {evt.capacity.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-body">
                            {Math.round((evt.ticketsSold / (evt.capacity || 1)) * 100)}% sold
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-zinc-950 tabular-nums font-heading">
                          ₹{evt.grossGMV.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-zinc-700 font-body">{evt.createdBy}</div>
                          <div className="text-[10px] text-zinc-400 font-body">
                            Updated {evt.lastUpdated}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 text-xs">
                            <Link
                              href={`/console/events/${encodeURIComponent(evt.slug || evt.id)}/overview`}
                              className="h-7 px-2.5 inline-flex items-center gap-1.5 text-xs font-heading font-medium text-zinc-800 bg-zinc-100/80 hover:bg-zinc-200/90 border border-zinc-200/60 rounded-md transition active:scale-[0.98]"
                            >
                              <span>Manage</span>
                              <ArrowRightIcon size={11} className="text-zinc-500" />
                            </Link>

                            {/* 3-Dot Actions Menu */}
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuEventId(activeMenuEventId === evt.id ? null : evt.id);
                                }}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-950 shadow-2xs transition active:scale-[0.96]"
                                aria-label="Event options"
                              >
                                <MoreHorizontalIcon size={14} />
                              </button>

                              {activeMenuEventId === evt.id && (
                                <div
                                  className="absolute right-0 mt-1 w-44 rounded-lg bg-white border border-zinc-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDrawerEvent(evt);
                                      setActiveMenuEventId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-heading font-medium transition flex items-center justify-between"
                                  >
                                    <span>Quick Details</span>
                                    <ArrowRightIcon size={11} className="text-zinc-400" />
                                  </button>
                                  <Link
                                    href={`/events/${encodeURIComponent(evt.slug || evt.id)}`}
                                    target="_blank"
                                    onClick={() => setActiveMenuEventId(null)}
                                    className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-heading font-medium transition"
                                  >
                                    <span>Preview Pass</span>
                                    <ArrowRightIcon size={11} className="-rotate-45 text-zinc-400" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (featuredEventId === evt.id) {
                                        clearFeaturedEvent();
                                        setFeaturedEventIdState(null);
                                        showToast("Removed from Explore featured spot.");
                                      } else {
                                        setFeaturedEvent(evt.id);
                                        setFeaturedEventIdState(evt.id);
                                        showToast(`"${evt.title}" is now featured on Explore.`);
                                      }
                                      setActiveMenuEventId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-heading font-medium transition flex items-center justify-between gap-2"
                                  >
                                    <span>{featuredEventId === evt.id ? "Remove from Featured" : "Feature on Explore"}</span>
                                    {featuredEventId === evt.id && (
                                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Live</span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDuplicateEvent(evt.id);
                                      setActiveMenuEventId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-heading font-medium transition"
                                  >
                                    Clone Event
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleTogglePublish(evt.id);
                                      setActiveMenuEventId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-heading font-medium transition"
                                  >
                                    {evt.status === "LIVE" ? "Unpublish to Draft" : "Publish Live"}
                                  </button>
                                  <div className="border-t border-zinc-100 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleArchiveEvent(evt.id);
                                      setActiveMenuEventId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 font-heading font-medium transition"
                                  >
                                    Archive Event
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEventToDelete(evt);
                                      setDeleteConfirmName("");
                                      setActiveMenuEventId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 font-heading font-medium transition flex items-center justify-between"
                                  >
                                    <span>Delete Event</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="mb-3"><DashboardArtwork kind="events" /></div>
                          <h4 className="text-sm font-bold text-zinc-950 font-heading">
                            No Hosted Events in Portfolio
                          </h4>
                          <p className="text-xs text-zinc-500 mt-1 font-body">
                            Launch a public or private event drop to sell tickets and admit guests.
                          </p>
                          <Link href="/create" className="btn-primary mt-4 text-xs">
                            Host First Event Drop
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. ANALYTICS: Organization-wide Multi-Event Analytics               */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Subtabs & Export Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "sales", label: "Sales Velocity" },
                { id: "revenue", label: "Revenue Waterfall" },
                { id: "audience", label: "Audience Demographics" },
                { id: "events", label: "Event Comparison" },
              ].map((tab) => {
                const isActive = analyticsSubtab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAnalyticsSubtab(tab.id as any)}
                    className={`relative pb-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                exportCSV("portfolio_analytics", [
                  ["Event", "Tickets Sold", "Gross GMV", "Capacity"],
                  ...eventsList.map((e) => [e.title, String(e.ticketsSold), String(e.grossGMV), String(e.capacity)]),
                ]);
                showToast("Analytics export downloaded.");
              }}
              className="btn-secondary"
            >
              <span>Export CSV</span>
            </button>
          </div>

          {/* Functional Subtab Content */}
          {analyticsSubtab === "sales" && (
            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-950">Sales Velocity by Event</h3>
              {eventsList.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
                  <div className="mb-3"><DashboardArtwork kind="analytics" /></div>
                  <h4 className="text-sm font-bold text-zinc-950 font-heading">No Analytics Telemetry Yet</h4>
                  <p className="text-xs text-zinc-500 mt-1 font-body">
                    Sales velocity curves, turnout pacing, and conversion benchmarks will appear here once ticket sales begin.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {eventsList.map((evt) => {
                    const pct = evt.capacity > 0 ? Math.min(100, Math.round((evt.ticketsSold / evt.capacity) * 100)) : 0;
                    return (
                      <div key={evt.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-900">{evt.title}</span>
                          <span className="font-bold text-zinc-950 tabular-nums">
                            {evt.ticketsSold} of {evt.capacity} sold ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-900 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {analyticsSubtab === "revenue" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                <div className="text-xs text-zinc-500 font-medium">Gross Collections</div>
                <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                  ₹{orders.reduce((sum, o: any) => sum + (o.amount || 0), 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-zinc-400">Total settled sales</div>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                <div className="text-xs text-zinc-500 font-medium">Platform Fee (3%)</div>
                <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                  ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.03).toLocaleString()}
                </div>
                <div className="text-[11px] text-zinc-400">Fixed rate</div>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                <div className="text-xs text-zinc-500 font-medium">Payment Gateway (2%)</div>
                <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                  ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.02).toLocaleString()}
                </div>
                <div className="text-[11px] text-zinc-400">Acquiring cost</div>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                <div className="text-xs text-zinc-500 font-medium">Net Settlement</div>
                <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                  ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.95).toLocaleString()}
                </div>
                <div className="text-[11px] text-zinc-400">Ready for payout</div>
              </div>
            </div>
          )}

          {analyticsSubtab === "audience" && (
            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-950">Pass Tier Breakdown</h3>
              {attendees.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No attendees registered yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 text-xs">
                  {Object.entries(
                    attendees.reduce((acc, a) => {
                      acc[a.tierName] = (acc[a.tierName] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([tier, count]) => (
                    <div key={tier} className="py-3 flex justify-between items-center">
                      <span className="font-semibold text-zinc-900">{tier}</span>
                      <span className="font-bold text-zinc-950 tabular-nums">
                        {(count as number)} pass{(count as number) === 1 ? "" : "es"} ({Math.round(((count as number) / attendees.length) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {analyticsSubtab === "events" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Tickets Sold</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">Gross Revenue</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {eventsList.map((evt) => (
                    <tr key={evt.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-bold text-zinc-950">{evt.title}</td>
                      <td className="py-3 px-4 text-zinc-500">{evt.category}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 tabular-nums">{evt.ticketsSold}</td>
                      <td className="py-3 px-4 text-zinc-500 tabular-nums">{evt.capacity}</td>
                      <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">₹{evt.grossGMV.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800">
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. ORDERS & CUSTOMERS                                              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          {/* Subtabs & Actions Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "orders", label: "Orders" },
                { id: "attendees", label: "Attendees" },
                { id: "customers", label: "Customer Profiles" },
                { id: "refunds", label: "Refunds" },
              ].map((tab) => {
                const isActive = customersSubtab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCustomersSubtab(tab.id as any)}
                    className={`relative pb-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                exportCSV(
                  "customers_export",
                  [
                    ["Order ID", "Customer", "Email", "Tier", "Amount", "Status", "Date"],
                    ...orders.map((o) => [
                      o.id,
                      o.customer,
                      o.email,
                      o.tier,
                      String(o.amount),
                      o.status,
                      o.date,
                    ]),
                  ]
                );
                showToast("Customers CSV downloaded.");
              }}
              className="btn-secondary"
            >
              Export CSV
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <SearchIcon size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by buyer, order ID, or email..."
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* View 1: Orders */}
          {customersSubtab === "orders" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Pass Tier</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders
                      .filter(
                        (o) =>
                          (o.customer ?? "").toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          (o.id ?? "").toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          (o.email ?? "").toLowerCase().includes(orderSearchQuery.toLowerCase())
                      )
                      .map((ord) => (
                        <tr key={ord.id} className="hover:bg-zinc-50/50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">{ord.id}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-950">{ord.customer}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">{ord.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 font-mono text-[11px] text-zinc-800">
                              {ord.tier}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">
                            ₹{ord.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                ord.status === "SETTLED" || ord.status === "CONFIRMED"
                                  ? "bg-zinc-900 text-white"
                                  : ord.status === "REFUNDED"
                                  ? "bg-red-50 text-red-600 border border-red-200"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">{ord.date}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedOrderDetails(ord)}
                                className="px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-md transition shadow-2xs"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => showToast(`Confirmation re-sent to ${ord.email}`)}
                                className="px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-md transition shadow-2xs"
                              >
                                Resend
                              </button>
                              {ord.status !== "REFUNDED" && (
                                <button
                                  onClick={() => handleRefundOrder(ord.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-zinc-200 hover:border-red-200 rounded-md transition shadow-2xs"
                                >
                                  Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                          No customer orders placed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 2: Attendees */}
          {customersSubtab === "attendees" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Attendee</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Pass Tier</th>
                      <th className="py-3 px-4">Ticket Code</th>
                      <th className="py-3 px-4">Door Status</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {attendees
                      .filter(
                        (a) =>
                          a.name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          a.email.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          a.ticketCode.toLowerCase().includes(orderSearchQuery.toLowerCase())
                      )
                      .map((att) => (
                        <tr key={att.id} className="hover:bg-zinc-50/50 transition">
                          <td className="py-3 px-4 font-bold text-zinc-950">{att.name}</td>
                          <td className="py-3 px-4 text-zinc-500 font-mono">{att.email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[11px] font-medium">
                              {att.tierName}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">{att.ticketCode}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                att.status === "CHECKED_IN"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {att.status === "CHECKED_IN" ? "Checked In" : "Confirmed"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => showToast(`Ticket pass viewed for ${att.name}`)}
                              className="px-2 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white border border-zinc-200 rounded transition"
                            >
                              View Pass
                            </button>
                          </td>
                        </tr>
                      ))}
                    {attendees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                          No registered attendees on roster yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 3: Customer Profiles */}
          {customersSubtab === "customers" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Passes Claimed</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {Array.from(
                      orders.reduce((acc, ord) => {
                        const existing = acc.get(ord.email) || {
                          name: ord.customer,
                          email: ord.email,
                          passesCount: 0,
                          totalSpent: 0,
                        };
                        existing.passesCount += 1;
                        existing.totalSpent += ord.amount || 0;
                        acc.set(ord.email, existing);
                        return acc;
                      }, new Map<string, any>()).values()
                    ).map((cust: any) => (
                      <tr key={cust.email} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-950">{cust.name}</td>
                        <td className="py-3 px-4 text-zinc-500 font-mono">{cust.email}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 tabular-nums">{cust.passesCount}</td>
                        <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">₹{cust.totalSpent.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => showToast(`Audit profile opened for ${cust.name}`)}
                            className="px-2 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white border border-zinc-200 rounded transition"
                          >
                            Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                          No customer profiles recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 4: Refunds */}
          {customersSubtab === "refunds" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Pass Tier</th>
                      <th className="py-3 px-4">Refund Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders
                      .filter((o: any) => o.status === "REFUNDED")
                      .map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-zinc-50/50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-900">{ord.id}</td>
                          <td className="py-3 px-4 font-bold text-zinc-950">{ord.customer}</td>
                          <td className="py-3 px-4 text-zinc-600">{ord.tier}</td>
                          <td className="py-3 px-4 font-bold text-red-600 tabular-nums">₹{ord.amount.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              Refunded
                            </span>
                          </td>
                        </tr>
                      ))}
                    {orders.filter((o: any) => o.status === "REFUNDED").length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                          No refunded orders on file.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. MARKETING: Organization Campaigns & Tracking                    */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          {/* Subtabs Underline Bar */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 overflow-x-auto pb-3">
            {[
              { id: "campaigns", label: "Campaigns" },
              { id: "promotions", label: "Promotions" },
              { id: "coupons", label: "Coupons" },
              { id: "email_sms", label: "Email / SMS" },
              { id: "tracking", label: "Tracking Links" },
            ].map((tab) => {
              const isActive = marketingSubtab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMarketingSubtab(tab.id as any)}
                  className={`relative pb-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                    isActive
                      ? "text-zinc-950 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtab 1 & 2: Campaigns & Promotions */}
          {(marketingSubtab === "campaigns" || marketingSubtab === "promotions") && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Promo Code</th>
                      <th className="py-3 px-4">Clicks</th>
                      <th className="py-3 px-4">Orders</th>
                      <th className="py-3 px-4">Conversion</th>
                      <th className="py-3 px-4">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {campaigns.map((cmp) => (
                      <tr key={cmp.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-950">{cmp.campaignName}</td>
                        <td className="py-3 px-4 font-mono text-zinc-700">{cmp.channel}</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">{cmp.promoCode}</td>
                        <td className="py-3 px-4 tabular-nums">{cmp.clicks.toLocaleString()}</td>
                        <td className="py-3 px-4 tabular-nums font-semibold">{cmp.orders}</td>
                        <td className="py-3 px-4 font-mono text-zinc-800">{cmp.conversionRate}</td>
                        <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">{cmp.grossSales}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 3: Coupons */}
          {marketingSubtab === "coupons" && (
            <div className="space-y-4">
              <form
                onSubmit={handleCreatePromo}
                className="flex flex-wrap items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  placeholder="Coupon code (e.g. EARLY20)"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  className="w-52 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
                />
                <input
                  type="number"
                  placeholder="Discount %"
                  value={newPromoDiscount}
                  onChange={(e) => setNewPromoDiscount(e.target.value)}
                  className="w-28 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
                />
                <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-medium">
                  <span className="px-2.5 py-1 rounded bg-white text-zinc-950 shadow-2xs font-semibold">
                    All Drops
                  </span>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Create Coupon
                </button>
              </form>

              <div className="border border-zinc-200/80 rounded-md overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Coupon Code</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-950">{c.promoCode}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">20% OFF</td>
                        <td className="py-3 px-4 text-zinc-600">All Hosted Drops</td>
                        <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-semibold text-[11px]">ACTIVE</span></td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(c.promoCode);
                              showToast(`Coupon code ${c.promoCode} copied.`);
                            }}
                            className="text-xs text-zinc-600 hover:text-zinc-950 font-medium"
                          >
                            Copy Code
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 4: Email / SMS Broadcast */}
          {marketingSubtab === "email_sms" && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-sm font-bold text-zinc-950">Audience Broadcast & Messaging</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Subject Line (e.g., Exclusive 48-Hour Early Access)"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
                />
                <textarea
                  rows={4}
                  placeholder="Write your email/SMS announcement copy here..."
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 font-mono"
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-zinc-500">Recipients: All past event ticket holders</span>
                  <button
                    type="button"
                    onClick={() => showToast("Broadcast campaign queued for delivery.")}
                    className="btn-primary"
                  >
                    Send Broadcast
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 5: Tracking Links */}
          {marketingSubtab === "tracking" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Generate UTM Link (e.g. ?utm_source=twitter&utm_medium=bio)"
                  className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => showToast("Tracking link created & copied to clipboard.")}
                  className="btn-primary shrink-0"
                >
                  Generate Link
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Tracking Channel</th>
                      <th className="py-3 px-4">UTM Parameter</th>
                      <th className="py-3 px-4">Clicks</th>
                      <th className="py-3 px-4">Conversions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-950">{c.channel}</td>
                        <td className="py-3 px-4 font-mono text-zinc-600">?ref={c.channel.toLowerCase()}</td>
                        <td className="py-3 px-4 tabular-nums">{c.clicks}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">{c.orders} passes</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. FINANCE: Settlements, Ledger & Tax                             */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          {/* Subtabs & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "revenue", label: "Revenue Waterfall" },
                { id: "payouts", label: "Payouts" },
                { id: "transactions", label: "Transactions" },
                { id: "invoices", label: "Invoices" },
                { id: "tax", label: "Tax & GST" },
              ].map((tab) => {
                const isActive = financeSubtab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFinanceSubtab(tab.id as any)}
                    className={`relative pb-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const gmv = orders.reduce((sum, o: any) => sum + (o.amount || 0), 0);
                  const net = Math.round(gmv * 0.95);
                  if (net <= 0) {
                    showToast("No settled balance available for payout transfer.");
                  } else {
                    showToast(`Payout request for ₹${net.toLocaleString()} submitted to automated transfer.`);
                  }
                }}
                className="btn-primary"
              >
                <span>Request Payout</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportCSV("settlement_statement", [
                    ["Order ID", "Customer", "Amount", "Status", "Date"],
                    ...orders.map((o) => [o.id, o.customer, String(o.amount), o.status, o.date]),
                  ]);
                  showToast("Statement downloaded.");
                }}
                className="btn-secondary"
              >
                <span>Download Statement</span>
              </button>
            </div>
          </div>

          {/* View 1: Revenue Waterfall */}
          {financeSubtab === "revenue" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                  <div className="text-xs text-zinc-500 font-medium">Gross Collections</div>
                  <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{orders.reduce((sum, o: any) => sum + (o.amount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-400">Total settled sales</div>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                  <div className="text-xs text-zinc-500 font-medium">Platform Fee (3%)</div>
                  <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.03).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-400">Fixed rate</div>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                  <div className="text-xs text-zinc-500 font-medium">Payment Gateway (2%)</div>
                  <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.02).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-400">Acquiring cost</div>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                  <div className="text-xs text-zinc-500 font-medium">Net Payout Accrued</div>
                  <div className="text-2xl font-bold text-zinc-950 tabular-nums">
                    ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.95).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-zinc-400">Ready for automated transfer</div>
                </div>
              </div>
            </div>
          )}

          {/* View 2: Payouts */}
          {financeSubtab === "payouts" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-zinc-950">Payout Ledger & Settlements</h3>
              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No payout transfers initiated yet.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-zinc-900">Current Available Balance</div>
                      <div className="text-zinc-500 mt-0.5">Eligible for instant automated bank transfer</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-zinc-950 tabular-nums">
                        ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.95).toLocaleString()}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Available
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View 3: Transactions */}
          {financeSubtab === "transactions" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Pass Tier</th>
                    <th className="py-3 px-4">Gross</th>
                    <th className="py-3 px-4">Fee</th>
                    <th className="py-3 px-4">Net</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((ord: any) => {
                    const gross = ord.amount || 0;
                    const fee = Math.round(gross * (platformFeePct / 100));
                    const net = gross - fee;
                    return (
                      <tr key={ord.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">{ord.id}</td>
                        <td className="py-3 px-4 font-medium text-zinc-900">{ord.customer}</td>
                        <td className="py-3 px-4 font-mono text-zinc-600">{ord.tier}</td>
                        <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">₹{gross.toLocaleString()}</td>
                        <td className="py-3 px-4 text-zinc-500 tabular-nums">₹{fee.toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">₹{net.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800">
                            {ord.status || "CONFIRMED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="mb-3"><DashboardArtwork kind="revenue" /></div>
                          <h4 className="text-xs font-bold text-zinc-950 font-heading">No Transactions Recorded</h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-body">
                            Settlement breakdowns and payout schedules will appear here as soon as attendees purchase passes.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* View 4: Invoices */}
          {financeSubtab === "invoices" && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Taxable Amount</th>
                    <th className="py-3 px-4">GST (18%)</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((ord: any) => {
                    const total = ord.amount || 0;
                    const gst = Math.round(total * 0.18 / 1.18);
                    const base = total - gst;
                    return (
                      <tr key={ord.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900">INV-{ord.id}</td>
                        <td className="py-3 px-4 font-medium text-zinc-900">{ord.customer}</td>
                        <td className="py-3 px-4 tabular-nums">₹{base.toLocaleString()}</td>
                        <td className="py-3 px-4 text-zinc-500 tabular-nums">₹{gst.toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">₹{total.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => showToast(`Invoice INV-${ord.id} downloaded.`)}
                            className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white border border-zinc-200 rounded transition"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                        No invoices generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* View 5: Tax & GST */}
          {financeSubtab === "tax" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 shadow-2xs text-xs">
              <h3 className="text-sm font-bold text-zinc-950">GST Compliance & Tax Summary</h3>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between py-2.5 border-b border-zinc-100">
                  <span className="text-zinc-600">Total Taxable Value</span>
                  <span className="font-bold text-zinc-950 tabular-nums">
                    ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.82).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-zinc-100">
                  <span className="text-zinc-600">Integrated GST (IGST 18%)</span>
                  <span className="font-bold text-zinc-950 tabular-nums">
                    ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.18).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-bold text-sm">
                  <span>Total Tax Assessed</span>
                  <span className="tabular-nums">
                    ₹{Math.round(orders.reduce((sum, o: any) => sum + (o.amount || 0), 0) * 0.18).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. TEAM: Organization Roles & Permissions                          */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Subtabs & Invite Member Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "members", label: "Members" },
                { id: "roles", label: "Roles" },
                { id: "permissions", label: "Permissions Matrix" },
                { id: "activity", label: "Activity Log" },
              ].map((tab) => {
                const isActive = teamSubtab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTeamSubtab(tab.id as any)}
                    className={`relative pb-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setInviteEmails([]);
                setPendingEmailInput("");
                setIsRoleDropdownOpen(false);
                setIsInviteDrawerOpen(true);
              }}
              className="btn-primary"
            >
              <UsersGroupIcon size={13} className="text-zinc-400" />
              <span>Invite Members</span>
            </button>
          </div>

          {/* Subtab 1: Members Table */}
          {teamSubtab === "members" && (
            <div className="space-y-3">
              <div className="border border-zinc-200/80 rounded-md bg-white overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {teamMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-950">{m.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-600">{m.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-semibold text-[11px]">
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white">
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => showToast(`Permissions updated for ${m.name}`)}
                            className="px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-md transition shadow-2xs font-heading"
                          >
                            Edit Access
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {teamMembers.length <= 1 && (
                <p className="text-[11px] text-zinc-400 pl-1">
                  Only the workspace owner is currently active. Use "Invite Member" to grant co-host or check-in access.
                </p>
              )}
            </div>
          )}

          {/* Subtab 2: Roles */}
          {teamSubtab === "roles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { role: "Owner / Host Lead", desc: "Full administrative control, billing, payout management, and event creation.", badge: "Highest Level" },
                { role: "Event Co-Lead", desc: "Can draft, edit, publish events, configure ticket tiers, and view sales metrics.", badge: "Organizer" },
                { role: "Finance Specialist", desc: "Access to revenue waterfall, payout requests, GST invoices, and order refunds.", badge: "Financial" },
                { role: "Check-in Operations", desc: "Access to the mobile door scanner, gate manifest, and guest admittance validation.", badge: "On-Site" },
              ].map((r, i) => (
                <div key={i} className="p-4 rounded-md border border-zinc-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-950">{r.role}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 font-semibold text-zinc-700">{r.badge}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{r.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Subtab 3: Permissions Matrix */}
          {teamSubtab === "permissions" && (
            <div className="border border-zinc-200/80 rounded-md bg-white overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Permission Scope</th>
                    <th className="py-3 px-4 text-center">Owner</th>
                    <th className="py-3 px-4 text-center">Co-Lead</th>
                    <th className="py-3 px-4 text-center">Finance</th>
                    <th className="py-3 px-4 text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[
                    { scope: "Publish / Edit Events", owner: "✓", colead: "✓", fin: "—", ops: "—" },
                    { scope: "Door Check-in Scanner", owner: "✓", colead: "✓", fin: "—", ops: "✓" },
                    { scope: "Payout Clearing & Banking", owner: "✓", colead: "—", fin: "✓", ops: "—" },
                    { scope: "Customer Data & Orders", owner: "✓", colead: "✓", fin: "✓", ops: "—" },
                    { scope: "Team Invitations & Roles", owner: "✓", colead: "—", fin: "—", ops: "—" },
                  ].map((p, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4 font-medium text-zinc-900">{p.scope}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{p.owner}</td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-800">{p.colead}</td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-800">{p.fin}</td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-800">{p.ops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab 4: Activity Log */}
          {teamSubtab === "activity" && (
            <div className="border border-zinc-200/80 rounded-md bg-white p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 text-xs">
                <span className="font-semibold text-zinc-900">Workspace owner session verified</span>
                <span className="text-[11px] text-zinc-400">Active session</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 text-xs">
                <span className="font-semibold text-zinc-900">Security authentication policy enforced</span>
                <span className="text-[11px] text-zinc-400">System</span>
              </div>
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="font-semibold text-zinc-900">Role permissions initialized</span>
                <span className="text-[11px] text-zinc-400">System</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. VENUES: All Venues & Seating Layouts                            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "venues" && (
        <div className="space-y-6">
          {/* Subtabs & Add Venue Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-6 overflow-x-auto">
              {[
                { id: "all", label: "All Venues" },
                { id: "maps", label: "Seating Maps" },
                { id: "details", label: "Venue Specifications" },
              ].map((tab) => {
                const isActive = venuesSubtab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVenuesSubtab(tab.id as any)}
                    className={`relative pb-1 text-xs font-medium font-heading transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => showToast("New venue creation modal opened.")}
              className="btn-primary"
            >
              <span>+ Add Venue</span>
            </button>
          </div>

          {/* Venues Grid */}
          {eventsList.filter((e) => e.venue && e.venue !== "Venue TBA").length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(
                new Set(
                  eventsList
                    .map((e) => e.venue)
                    .filter((v) => v && v !== "Venue TBA")
                )
              ).map((vName, idx) => {
                const evForVenue = eventsList.filter((e) => e.venue === vName);
                const totalCap = evForVenue.reduce((s, e) => s + e.capacity, 0);
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800">
                        ACTIVE VENUE
                      </span>
                      <span className="text-xs text-zinc-500">
                        Capacity: {totalCap > 0 ? totalCap.toLocaleString() : "TBA"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">{vName}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Configured for {evForVenue.length} event drop{evForVenue.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">Layout Verified</span>
                      <button
                        type="button"
                        onClick={() => showToast(`Floor layout editor opened for ${vName}`)}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-800 hover:text-zinc-950 bg-white border border-zinc-200 rounded hover:bg-zinc-50 transition"
                      >
                        Edit Seating Layout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                <div className="mb-3"><DashboardArtwork kind="venue" /></div>
                <h4 className="text-sm font-bold text-zinc-950 font-heading">No Venue Blueprints Configured</h4>
                <p className="text-xs text-zinc-500 mt-1 font-body">
                  Venues will populate automatically as you set locations on your created event drops, or click "+ Add Venue" above to configure a layout.
                </p>
                <button
                  type="button"
                  onClick={() => showToast("New venue blueprint editor opened.")}
                  className="btn-primary mt-4 text-xs"
                >
                  <span>+ Add Venue Blueprint</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 9. INTEGRATIONS: Payments, CRM, Email, Webhooks                   */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          {/* Subtabs Underline Bar */}
          <div className="flex items-center gap-6 border-b border-zinc-200/80 overflow-x-auto pb-3">
            {[
              { id: "payments", label: "Payment Rails" },
              { id: "crm", label: "CRM & Contacts" },
              { id: "email_sms", label: "Email / WhatsApp" },
              { id: "analytics", label: "Analytics Pixels" },
              { id: "apis", label: "Developer APIs" },
            ].map((tab) => {
              const isActive = integrationsSubtab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIntegrationsSubtab(tab.id as any)}
                  className={`relative pb-1 text-xs font-medium font-heading transition-colors whitespace-nowrap focus:outline-none ${
                    isActive
                      ? "text-zinc-950 font-semibold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-950 font-heading">Payment Gateway Extensions</h4>
                <span className="text-[10px] text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded font-heading font-medium">
                  Super Admin Managed
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-body">
                Payment rails (Razorpay UPI, Cards, NetBanking) are configured, reconciled, and maintained centrally by the Platform Super Admin.
              </p>
              <div className="text-[11px] text-zinc-400 font-body">Zero organizer API key maintenance required</div>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-950 font-heading">WhatsApp Cloud API</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white font-heading">
                  CONNECTED
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-body">
                Instant delivery of digital ticket passes and dynamic QR codes to buyer phones.
              </p>
              <div className="text-[11px] text-zinc-500 font-body">Delivery: Platform Managed Messaging Rail</div>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-950 font-heading">HubSpot Marketing CRM</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-heading">
                  AVAILABLE
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-body">
                Synchronize attendee ticket buyers into customer lifecycle lists and email workflows.
              </p>
              <button
                type="button"
                onClick={() => showToast("Connecting to HubSpot OAuth...")}
                className="btn-secondary"
              >
                <span>Connect CRM</span>
              </button>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-950 font-heading">Developer Webhooks</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-heading">
                  IDLE
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-body">
                Real-time HTTP push events on <code>ticket.purchased</code> and <code>attendee.admitted</code>.
              </p>
              <div className="text-[11px] font-mono text-zinc-400">Endpoint: Not configured</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. SETTINGS: Organization Configuration                           */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Subtabs & Save Changes Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200/80 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: "organization", label: "Organization Info" },
                { id: "features", label: "Registration & Logic" },
                { id: "branding", label: "Branding Kit" },
                { id: "notifications", label: "Notifications" },
                { id: "billing", label: "Billing & Plans" },
                { id: "security", label: "Security & 2FA" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsSubtab(tab.id as any)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                    settingsSubtab === tab.id
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => showToast("Organization settings saved.")}
              className="btn-primary"
            >
              <span>Save Changes</span>
            </button>
          </div>

          {/* 1. Organization Information Form */}
          {settingsSubtab === "organization" && (
            <div className="p-6 rounded-xl border border-zinc-200/80 bg-white space-y-6 shadow-2xs max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
                  Legal Business Entity
                </h3>
                <p className="text-xs text-zinc-500 font-body mt-0.5">
                  Official entity details registered for payout clearing and GST invoice generation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Organization legal name
                  </label>
                  <input
                    type="text"
                    defaultValue=""
                    placeholder="Enter organization legal entity name"
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    GSTIN / Tax identification
                  </label>
                  <input
                    type="text"
                    defaultValue=""
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Primary contact email
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || ""}
                    placeholder="billing@yourorganization.com"
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Support phone number
                  </label>
                  <input
                    type="text"
                    defaultValue=""
                    placeholder="+91..."
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Registered Business Address
                </label>
                <input
                  type="text"
                  defaultValue=""
                  placeholder="Street address, City, State, PIN"
                  className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Default Timezone
                  </label>
                  <select className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Settlement Currency
                  </label>
                  <select className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition">
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Features & Registration Logic Form */}
          {settingsSubtab === "features" && (
            <div className="p-6 rounded-xl border border-zinc-200/80 bg-white space-y-6 shadow-2xs max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
                  Registration Features & Question Logic
                </h3>
                <p className="text-xs text-zinc-500 font-body mt-0.5">
                  Activate advanced attendee workflows, conditional question branching, and dynamic display rules.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-zinc-200 text-zinc-700 flex items-center justify-center">
                        <FilterIcon size={12} />
                      </div>
                      <span className="text-xs font-bold text-zinc-950 font-heading">
                        Conditional Registration Questions (If / Else Logic)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
                      When activated, organizers can configure if/else branching rules in the dedicated Conditional Questions tab. Questions can be conditionally revealed based on the selected ticket tier or previous answers.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={conditionalQuestionsFeature}
                      onChange={(e) => handleToggleConditionalQuestionsFeature(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-950"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-zinc-200/70 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    Status:{" "}
                    <strong className={conditionalQuestionsFeature ? "text-emerald-600 font-semibold" : "text-zinc-500 font-medium"}>
                      {conditionalQuestionsFeature ? "Activated (Conditional tab unlocked)" : "Disabled (Standard questions only)"}
                    </strong>
                  </span>
                  <span>Feature applies to all events</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Branding Kit Form */}
          {settingsSubtab === "branding" && (
            <div className="p-6 rounded-xl border border-zinc-200/80 bg-white space-y-6 shadow-2xs max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
                  Brand Identity & Customization
                </h3>
                <p className="text-xs text-zinc-500 font-body mt-0.5">
                  Assets and appearance displayed across your hosted event registration pages, digital passes, and PDF tickets.
                </p>
              </div>

              {/* Logo & Banner previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Organization Logo (Square 1:1)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-zinc-950 text-white font-heading font-black text-xl flex items-center justify-center shrink-0 border border-zinc-200 shadow-2xs">
                      TIV
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => showToast("Upload dialog opened.")}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Change Logo
                      </button>
                      <p className="text-[10px] text-zinc-400">PNG, SVG or WEBP · 512x512 recommended</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Brand Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-300 shadow-2xs shrink-0" />
                    <input
                      type="text"
                      defaultValue="#09090b"
                      className="w-28 bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 font-mono"
                    />
                    <div className="flex items-center gap-1.5">
                      {["#09090b", "#2563eb", "#10b981", "#8b5cf6", "#f59e0b"].map((color) => (
                        <div
                          key={color}
                          style={{ backgroundColor: color }}
                          className="w-5 h-5 rounded-full cursor-pointer border border-black/10 hover:scale-110 transition"
                          onClick={() => showToast(`Selected accent: ${color}`)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Public Details */}
              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Public Organization Name
                  </label>
                  <input
                    type="text"
                    defaultValue=""
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Public Headline / Tagline
                  </label>
                  <input
                    type="text"
                    defaultValue=""
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Organizer Bio
                  </label>
                  <textarea
                    rows={3}
                    defaultValue=""
                    className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">Website URL</label>
                    <input
                      type="url"
                      defaultValue=""
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">X / Twitter Handle</label>
                    <input
                      type="text"
                      defaultValue=""
                      className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 font-body"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Notifications Form */}
          {settingsSubtab === "notifications" && (
            <div className="p-6 rounded-xl border border-zinc-200/80 bg-white space-y-6 shadow-2xs max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
                  Notification & Dispatch Center
                </h3>
                <p className="text-xs text-zinc-500 font-body mt-0.5">
                  Manage email alerts, real-time ticket sales dispatch notifications, and turnstile reports.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-zinc-100 text-xs">
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900">Instant RSVP & Ticket Sale Alerts</div>
                    <div className="text-zinc-500">Receive an email notification every time an attendee secures a pass.</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-zinc-900 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900">Daily Performance Digest</div>
                    <div className="text-zinc-500">Receive an automated 09:00 AM summary of registrations, GMV, and attendance.</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-zinc-900 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900">Waitlist Overflow Notifications</div>
                    <div className="text-zinc-500">Alerts when an event tier hits 100% capacity and priority waitlist opens.</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-zinc-900 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900">Direct Attendee WhatsApp Pass Dispatch</div>
                    <div className="text-zinc-500">Automatically deliver encrypted QR passes and gate instructions via WhatsApp.</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-zinc-900 cursor-pointer" />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900">Turnstile Scanner Gate Alerts</div>
                    <div className="text-zinc-500">Instant notification when door arrival capacity exceeds 90% in any venue room.</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-zinc-900 cursor-pointer" />
                </div>
              </div>
            </div>
          )}

          {/* 4. Billing & Plans Form */}
          {settingsSubtab === "billing" && (
            <div className="p-6 rounded-xl border border-zinc-200/80 bg-white space-y-6 shadow-2xs max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
                  Billing, Payouts & Platform Plan
                </h3>
                <p className="text-xs text-zinc-500 font-body mt-0.5">
                  Manage payout settlement rails, GST invoices, and platform tier subscription.
                </p>
              </div>

              {/* Active Plan Card */}
              <div className="p-5 rounded-xl bg-zinc-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                    Active Plan · Beta Partner
                  </span>
                  <div className="text-lg font-extrabold font-heading">Hackways Organizer Pro</div>
                  <div className="text-xs text-zinc-400">
                    Unlimited ticket tiers, instant RSVP drops, QR check-in gates, and 0% platform fee during early access.
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold font-mono">₹0 / mo</div>
                  <div className="text-[11px] text-zinc-400">Early Access Tier</div>
                </div>
              </div>

              {/* Bank Settlement Account */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Verified Settlement Bank Account
                </h4>
                <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                      <span>HDFC Bank · Corporate Checking</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                        Verified
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Manage saved payout details in Finance. Settlement status is unavailable.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast("Settlement account edit opened.")}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Edit Account
                  </button>
                </div>
              </div>

              {/* UPI Instant Settlement */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  UPI Instant Settlement VPA
                </h4>
                <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-zinc-950">Direct UPI Rail</div>
                    <div className="text-[11px] text-zinc-500 font-mono">hackways.organizer@okaxis</div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Security & 2FA Form */}
          {settingsSubtab === "security" && (
            <div className="p-6 rounded-xl border border-zinc-200/80 bg-white space-y-6 shadow-2xs max-w-3xl">
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
                  Security, 2FA & Scanner API Keys
                </h3>
                <p className="text-xs text-zinc-500 font-body mt-0.5">
                  Protect organizer console access, manage turnstile credentials, and configure session policies.
                </p>
              </div>

              {/* Two-Factor Authentication — not offered by the platform yet; say so honestly */}
              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                    <span>Two-Factor Authentication</span>
                    <span className="text-[10px] bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded font-semibold">
                      Not available
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Hackways doesn&apos;t offer 2FA enrollment yet. Your account is protected by your password and signed session.
                  </div>
                </div>
              </div>

              {/* Door scanner keys — per-event, issued from that event's settings */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Door Scanner Access
                </h4>
                <p className="text-xs text-zinc-500">
                  Scanner access is managed per event. Open an event&apos;s console to admit guests with the camera scanner or manual codes.
                </p>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-rose-100 space-y-3">
                <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  Danger Zone
                </h4>
                <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-rose-950">Delete Organization Account</div>
                    <div className="text-[11px] text-rose-600">
                      Permanently delete this organization, active channels, and all unassociated past event logs.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast("Organization deletion requires super-admin authorization.")}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 transition"
                  >
                    Delete Organization
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ------------------------------------------------------------------ */}
      {/* 1. RIGHT SIDE BAR DRAWER: CREATE NEW EVENT (Kaggle & Linear Style) */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="New Event"
        width="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateDrawerOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition font-heading"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newEventTitle.trim()}
              onClick={() => {
                if (!newEventTitle.trim()) return;
                if (!user) {
                  showToast("Sign in to create an event.");
                  return;
                }
                const newId = `ev_${Date.now().toString().slice(-4)}`;
                const finalSlug =
                  newEventSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "") ||
                  newEventTitle.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "");

                const newEvt: OrganizerEventRecord = {
                  id: newId,
                  title: newEventTitle.trim(),
                  category: newEventCategory,
                  status: "DRAFT",
                  date: newEventDate || "Date not set",
                  venue: newEventVenue || "",
                  ticketsSold: 0,
                  capacity: parseInt(newEventCapacity) || 500,
                  grossGMV: 0,
                  conversionRate: "0.0%",
                  createdBy: user.name || user.email,
                  lastUpdated: "Just now",
                };

                const selectedChan = drawerHostType === "COMMUNITY" ? drawerChannels.find((c) => c.id === drawerSelectedChannelId) : null;

                // Persist full EventItem with slug & default free ticket tier
                saveEvent({
                  id: newId,
                  slug: finalSlug,
                  title: newEventTitle.trim(),
                  description: newEventSubtitle.trim() || "",
                  organizer_id: selectedChan ? selectedChan.id : user.userId,
                  organizer_type: drawerHostType,
                  channel_id: selectedChan?.id,
                  channel_name: selectedChan?.name,
                  channel_slug: selectedChan?.slug,
                  channel_avatar: selectedChan?.avatar_url,
                  status: "DRAFT",
                  location: newEvt.venue,
                  total_capacity: newEvt.capacity,
                  created_at: new Date().toISOString(),
                  category: newEventCategory,
                  banner_url: "",
                  square_banner_url: "",
                  hosts: selectedChan ? [selectedChan.name] : [user.name || user.email],
                  host_users: [{ user_id: user.userId, name: user.name || user.email, email: user.email, role: "Primary Host" }],
                  tiers: [
                    {
                      id: `tkt_${Date.now()}`,
                      event_id: newId,
                      name: "General Admission",
                      price_cents: 0,
                      total_capacity: 100,
                      remaining_capacity: 100,
                      approval_mode: "AUTO_APPROVE",
                    },
                  ],
                });

                setEventsList([newEvt, ...eventsList]);
                showToast(`Event "${newEvt.title}" created with slug /events/${finalSlug}`);
                setIsCreateDrawerOpen(false);
                setNewEventTitle("");
                setNewEventSubtitle("");
                setNewEventSlug("");
                setNewEventDate("");
                setNewEventVenue("");
              }}
              className={`btn-primary ${!newEventTitle.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Create Event
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-950 font-heading tracking-tight">
              Enter Event Details
            </h3>
            <p className="text-xs text-zinc-500 font-body mt-0.5">
              Configure admissions, hosting details, and reserve capacity.
            </p>
          </div>

          {/* Event Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Event title
            </label>
            <input
              type="text"
              maxLength={60}
              placeholder="Event name"
              value={newEventTitle}
              onChange={(e) => {
                const val = e.target.value;
                setNewEventTitle(val);
                if (!isEditingSlug) {
                  setNewEventSlug(
                    val
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }
              }}
              className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 transition"
            />
          </div>

          {/* Event URL Slug */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-700">
                Event URL slug
              </label>
              <button
                type="button"
                onClick={() => setIsEditingSlug(!isEditingSlug)}
                className="text-[11px] font-medium text-zinc-600 hover:text-zinc-950 underline"
              >
                {isEditingSlug ? "Done" : "Edit"}
              </button>
            </div>
            <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs text-zinc-500 font-mono shadow-2xs">
              <span className="text-zinc-400 select-none">hackways.com/events/</span>
              {isEditingSlug ? (
                <input
                  type="text"
                  value={newEventSlug}
                  onChange={(e) => setNewEventSlug(e.target.value)}
                  className="bg-transparent text-zinc-900 font-mono outline-none flex-1 ml-0.5"
                />
              ) : (
                <span className="text-zinc-900 font-medium ml-0.5">
                  {newEventSlug || "your-event-slug"}
                </span>
              )}
            </div>
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
                Subtitle *
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {newEventSubtitle.length} / 140
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={140}
              placeholder="Enter a subtitle explaining what attendees will experience."
              value={newEventSubtitle}
              onChange={(e) => setNewEventSubtitle(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3.5 py-2 text-xs text-zinc-950 font-body placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition resize-none shadow-2xs"
            />
          </div>

          {/* Creating As - Interactive Host Entity Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading block">
              Host Entity
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDrawerHostType("USER")}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  drawerHostType === "USER"
                    ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[9px] font-bold flex items-center justify-center font-heading">
                    {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-zinc-900 font-heading">Personal Host</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-body">{user?.name || user?.email || "Sign in to host"}</p>
              </button>

              <button
                type="button"
                onClick={() => setDrawerHostType("COMMUNITY")}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  drawerHostType === "COMMUNITY"
                    ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center font-heading">
                    C
                  </div>
                  <span className="text-xs font-bold text-zinc-900 font-heading">Community</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-body">Channel / Brand</p>
              </button>
            </div>

            {drawerHostType === "COMMUNITY" && (
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-700 block">
                  Select Channel / Community
                </label>
                {drawerChannels.length > 0 ? (
                  <select
                    value={drawerSelectedChannelId}
                    onChange={(e) => setDrawerSelectedChannelId(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                  >
                    {drawerChannels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (@{c.slug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    No community channels found. Event will be categorized under default organization.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
                Category *
              </label>
              <select
                value={newEventCategory}
                onChange={(e) => setNewEventCategory(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
              >
                <option value="Developer Conference">Developer Conference</option>
                <option value="Executive Keynote">Executive Keynote</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Cloud Summit">Cloud Summit</option>
                <option value="Engineering Workshop">Engineering Workshop</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
                Event Date *
              </label>
              <input
                type="text"
                placeholder="e.g. Nov 14-16, 2026"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
              />
            </div>
          </div>

          {/* Venue & Location */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
              Venue Location *
            </label>
            <input
              type="text"
              placeholder="e.g. BIEC Bengaluru, Hall 3"
              value={newEventVenue}
              onChange={(e) => setNewEventVenue(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
            />
          </div>

          {/* Capacity & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
                Total Capacity *
              </label>
              <input
                type="number"
                min={10}
                placeholder="500"
                value={newEventCapacity}
                onChange={(e) => setNewEventCapacity(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider uppercase text-zinc-600 font-heading">
                Base Pass Price (₹) *
              </label>
              <input
                type="number"
                min={0}
                placeholder="1499"
                value={newEventPrice}
                onChange={(e) => setNewEventPrice(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-900 font-body focus:outline-none focus:border-zinc-900 shadow-2xs"
              />
            </div>
          </div>
        </div>
      </SlideOverDrawer>

      {/* ------------------------------------------------------------------ */}
      {/* 2. RIGHT SIDE BAR DRAWER: EVENT QUICK DETAILS / ACTIONS            */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={!!drawerEvent}
        onClose={() => setDrawerEvent(null)}
        title={drawerEvent ? drawerEvent.title : "Event Details"}
        subtitle="Quick configuration and real-time status"
        width="lg"
        footer={
          drawerEvent && (
            <>
              <button
                type="button"
                onClick={() => setDrawerEvent(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition font-heading"
              >
                Close
              </button>
              <Link
                href={`/console/events/${encodeURIComponent(drawerEvent.slug || drawerEvent.id)}/overview`}
                className="btn-primary"
              >
                <span>Open Full Command Center</span>
                <ArrowRightIcon size={12} className="text-zinc-400" />
              </Link>
            </>
          )
        }
      >
        {drawerEvent && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold font-heading px-2.5 py-0.5 rounded-full ${
                    drawerEvent.status === "LIVE"
                      ? "bg-zinc-900 text-white"
                      : drawerEvent.status === "UPCOMING"
                      ? "bg-zinc-100 text-zinc-800"
                      : "bg-zinc-50 text-zinc-500 border border-zinc-200"
                  }`}
                >
                  {drawerEvent.status}
                </span>
                <span className="text-xs text-zinc-400 font-body">{drawerEvent.category}</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 font-heading mt-2">
                {drawerEvent.title}
              </h3>
              <p className="text-xs text-zinc-500 font-body mt-1">
                Hosted by {drawerEvent.createdBy} • Updated {drawerEvent.lastUpdated}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50">
                <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide font-heading">
                  Tickets Sold
                </div>
                <div className="text-base font-bold text-zinc-950 font-heading mt-1">
                  {drawerEvent.ticketsSold.toLocaleString()} / {drawerEvent.capacity.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-400 font-body mt-0.5">
                  {Math.round((drawerEvent.ticketsSold / (drawerEvent.capacity || 1)) * 100)}% capacity
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50">
                <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide font-heading">
                  Gross GMV
                </div>
                <div className="text-base font-bold text-zinc-950 font-heading mt-1">
                  ₹{drawerEvent.grossGMV.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-400 font-body mt-0.5">
                  {drawerEvent.conversionRate} checkout rate
                </div>
              </div>
            </div>

            {/* Event Info fields */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg border border-zinc-100 bg-white space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-400 font-heading">Date & Time</div>
                <div className="font-semibold text-zinc-900 font-body">{drawerEvent.date}</div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-100 bg-white space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-400 font-heading">Venue Location</div>
                <div className="font-semibold text-zinc-900 font-body">{drawerEvent.venue}</div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-100 bg-white space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-400 font-heading">Public Registration Link</div>
                <div className="font-mono text-[11px] text-zinc-700">
                  hackways.com/events/{drawerEvent.slug || drawerEvent.id}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <div className="text-[11px] font-bold uppercase text-zinc-500 font-heading">Fast Status Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePublish(drawerEvent.id);
                    setDrawerEvent(null);
                  }}
                  className="btn-secondary justify-center text-center"
                >
                  {drawerEvent.status === "LIVE" ? "Unpublish Event" : "Publish Live"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDuplicateEvent(drawerEvent.id);
                    setDrawerEvent(null);
                  }}
                  className="btn-secondary justify-center text-center"
                >
                  Duplicate Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* ------------------------------------------------------------------ */}
      {/* 3. INVITE TEAM MEMBERS MODAL (Multi-Email & Custom Popover)        */}
      {/* ------------------------------------------------------------------ */}
      {isInviteDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setIsInviteDrawerOpen(false);
            setIsRoleDropdownOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Invite Team Members</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Add multiple teammates to collaborate with shared permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInviteDrawerOpen(false);
                  setIsRoleDropdownOpen(false);
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteTeam} className="space-y-4">
              {/* Multi-Email Box with Visual Chips Layout */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-900">Email addresses</label>
                  {inviteEmails.length > 0 && (
                    <span className="text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                      {inviteEmails.length} {inviteEmails.length === 1 ? "email" : "emails"}
                    </span>
                  )}
                </div>

                <div
                  onClick={() => emailInputRef.current?.focus()}
                  className="min-h-[96px] max-h-[170px] overflow-y-auto w-full p-2.5 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900/10 transition flex flex-wrap gap-1.5 items-start content-start cursor-text shadow-2xs"
                >
                  {inviteEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200/70 text-zinc-900 text-xs font-medium border border-zinc-200/80 shadow-2xs group transition select-none"
                    >
                      <span className="w-4 h-4 rounded-full bg-zinc-300 text-zinc-800 text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
                        {email.charAt(0)}
                      </span>
                      <span className="max-w-[190px] truncate text-[11px] font-mono">{email}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInviteEmails((prev) => prev.filter((item) => item !== email));
                        }}
                        className="w-3.5 h-3.5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-950 hover:bg-zinc-300/60 transition"
                        aria-label={`Remove ${email}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  <input
                    ref={emailInputRef}
                    type="text"
                    placeholder={
                      inviteEmails.length === 0
                        ? "Enter emails (paste multiple or press Enter / comma)..."
                        : "Add another email..."
                    }
                    value={pendingEmailInput}
                    onChange={(e) => setPendingEmailInput(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    onPaste={handleEmailPaste}
                    onBlur={() => {
                      if (pendingEmailInput.trim()) {
                        addEmailsFromText(pendingEmailInput);
                      }
                    }}
                    className="flex-1 min-w-[180px] h-6 px-1 text-xs bg-transparent border-none outline-none text-zinc-900 placeholder:text-zinc-400"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                  <span>Paste comma or space separated emails, or press Enter</span>
                  {inviteEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setInviteEmails([])}
                      className="text-zinc-500 hover:text-zinc-800 underline transition cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Role Dropdown (Zero Default Browser Select) */}
              <div className="relative space-y-1.5" ref={roleDropdownRef}>
                <label className="text-xs font-semibold text-zinc-900">Role</label>
                
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="w-full h-9 px-3 text-xs bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 text-zinc-900 flex items-center justify-between focus:outline-none focus:border-zinc-900 transition shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-950">{inviteRole}</span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      ({ORGANIZER_ROLES.find((r) => r.role === inviteRole)?.shortDesc})
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
                      isRoleDropdownOpen ? "rotate-180 text-zinc-900" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-zinc-200 rounded-lg shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100">
                    {ORGANIZER_ROLES.map((r) => {
                      const isSelected = inviteRole === r.role;
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => {
                            setInviteRole(r.role);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-3 transition cursor-pointer ${
                            isSelected ? "bg-zinc-100 text-zinc-950" : "hover:bg-zinc-50 text-zinc-800"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-950 flex items-center gap-2">
                              <span>{r.role}</span>
                              <span className="text-[11px] text-zinc-400 font-normal">({r.shortDesc})</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 leading-snug">{r.desc}</div>
                          </div>
                          {isSelected && (
                            <span className="text-xs font-bold text-zinc-950 shrink-0">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsInviteDrawerOpen(false);
                    setIsRoleDropdownOpen(false);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteEmails.length === 0 && !pendingEmailInput.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-950 transition shadow-2xs cursor-pointer"
                >
                  {inviteEmails.length > 1
                    ? `Send ${inviteEmails.length} Invites`
                    : inviteEmails.length === 1 || pendingEmailInput.trim()
                    ? "Send Invite"
                    : "Send Invites"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. RIGHT SIDE BAR DRAWER: ORDER INSPECTION DETAILS                 */}
      {/* ------------------------------------------------------------------ */}
      <SlideOverDrawer
        isOpen={!!selectedOrderDetails}
        onClose={() => setSelectedOrderDetails(null)}
        title={selectedOrderDetails ? `Order #${selectedOrderDetails.id}` : "Order Details"}
        subtitle="Cross-event transaction and settlement audit"
        width="md"
        footer={
          selectedOrderDetails && (
            <>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition font-heading"
              >
                Close
              </button>
              {selectedOrderDetails.status !== "REFUNDED" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRefundOrder(selectedOrderDetails.id);
                  }}
                  className="btn-secondary text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Issue Refund
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  showToast(`Invoice receipt downloaded for Order #${selectedOrderDetails.id}.`);
                }}
                className="btn-primary"
              >
                Download Receipt
              </button>
            </>
          )
        }
      >
        {selectedOrderDetails && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span
                className={`text-[10px] font-bold font-heading px-2.5 py-0.5 rounded-full ${
                  selectedOrderDetails.status === "CONFIRMED"
                    ? "bg-zinc-900 text-white"
                    : selectedOrderDetails.status === "REFUNDED"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                {selectedOrderDetails.status}
              </span>
              <span className="text-xs text-zinc-400 font-mono">{selectedOrderDetails.date}</span>
            </div>

            {/* Total Amount Box */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-heading">
                  Gross Amount
                </div>
                <div className="text-xl font-black text-zinc-950 font-heading mt-0.5">
                  ₹{Number(selectedOrderDetails.amount).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-zinc-400 font-heading uppercase">
                  Payment Method
                </div>
                <div className="text-xs font-bold text-zinc-800 font-heading mt-0.5">
                  {selectedOrderDetails.method}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 font-heading">
                Customer Information
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white space-y-2 text-xs shadow-2xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-body">Customer Name:</span>
                  <span className="font-semibold text-zinc-900 font-heading">{selectedOrderDetails.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-body">Email Address:</span>
                  <span className="font-mono text-zinc-700 text-[11px]">
                    {selectedOrderDetails.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-body">Transaction Ref:</span>
                  <span className="font-mono text-zinc-500 text-[11px]">
                    TXN_{selectedOrderDetails.id.replace("ord_", "")}_RZP
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement Status */}
            <div className="p-3.5 rounded-lg border border-zinc-100 bg-zinc-50/50 space-y-1 text-xs">
              <div className="text-[10px] font-bold uppercase text-zinc-400 font-heading">Settlement Rail</div>
              <div className="font-medium text-zinc-800">
                Routed to HDFC Bank (•••• 8841) via Razorpay Direct Gateway.
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-heading">
                Operational Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => showToast("Pass delivery isn't connected to an email service yet.")}
                  className="btn-secondary justify-center text-center text-xs"
                >
                  Resend Pass
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Receipt email isn't connected to an email service yet.")}
                  className="btn-secondary justify-center text-center text-xs"
                >
                  Email Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-bold font-heading text-zinc-950 tracking-tight">
                Delete Event
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-body">
                This will delete <span className="font-bold text-zinc-900 font-heading">"{eventToDelete.title}"</span> from your host dashboard. Active listings and attendee rosters will be removed from your view, but all payment records, ticket logs, and compliance manifests will be archived and retained by Super Admin.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-zinc-700 block font-heading">
                To confirm, type <span className="font-mono font-bold text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded select-all">{eventToDelete.title}</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={`Type "${eventToDelete.title}"`}
                className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setEventToDelete(null);
                  setDeleteConfirmName("");
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 rounded-full transition font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmName.trim() !== eventToDelete.title.trim() || isDeleting}
                onClick={handleConfirmDeleteEvent}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-full transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed font-heading"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
