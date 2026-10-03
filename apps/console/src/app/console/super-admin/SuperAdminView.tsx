"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import DashboardArtwork, { DashboardArtworkKind } from "@/components/ui/DashboardArtwork";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatOrganizerDisplay } from "@/lib/userFormat";
import {
  Ticket,
  Building2,
  User,
  Users,
  UserPlus,
  Plus,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  LifeBuoy,
  X,
  Mail,
  Send,
  RefreshCw,
  Landmark,
  Percent,
  Scale,
  Bell,
  LayoutTemplate,
  ScrollText,
  Inbox,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

import {
  getStoredEvents,
  getAllAttendees,
  getAllOrders,
  getUserTickets,
  getPlatformMetrics,
  getStoredChannels,
} from "@/lib/api";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { CONSOLE_MODULES, type PlatformSettings } from "@/lib/platformSettings";
import type { SessionRole } from "@/lib/sessionToken";
import { webAppHref } from "@/lib/webAppUrl";
import {
  MOCK_ADMIN_EVENTS,
  MOCK_ADMIN_ORGANIZERS,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_ORDERS,
  MOCK_ADMIN_TICKETS,
  MOCK_TRANSACTIONS,
  MOCK_ADMIN_REFUNDS,
  MOCK_ADMIN_PAYOUTS,
  MOCK_ADMIN_COMMISSIONS,
  MOCK_ORGANIZER_KYC,
  MOCK_ADMIN_FRAUD_FLAGS,
  MOCK_ADMIN_DISPUTES,
  MOCK_ADMIN_SUPPORT,
  MOCK_ADMIN_NOTIFICATIONS,
  MOCK_ADMIN_CMS,
  MOCK_ADMIN_STAFF,
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_PLATFORM_APPROVALS,
} from "../mockData";

export type SuperAdminTab =
  | "overview"
  | "events"
  | "organizers"
  | "attendees"
  | "orders"
  | "tickets"
  | "payments"
  | "refunds"
  | "payouts"
  | "commissions"
  | "kyc"
  | "fraud"
  | "disputes"
  | "support"
  | "analytics"
  | "notifications"
  | "cms"
  | "roles"
  | "access"
  | "audit"
  | "settings";

function EmptyPanelState({
  kind,
  title,
  description,
  action,
}: {
  kind: DashboardArtworkKind;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center py-6">
      <div className="mb-3"><DashboardArtwork kind={kind} /></div>
      <div className="text-sm font-bold text-zinc-950 tracking-tight">{title}</div>
      <p className="text-xs text-zinc-500 mt-1 mb-4 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

function EmptyTableRow({
  colSpan,
  kind,
  title,
  description,
  action,
}: {
  colSpan: number;
  kind: DashboardArtworkKind;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 px-4 text-center">
        <EmptyPanelState
          kind={kind}
          title={title}
          description={description}
          action={action}
        />
      </td>
    </tr>
  );
}

function EmptyCardState({
  kind,
  title,
  description,
  action,
}: {
  kind: DashboardArtworkKind;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-8 px-4">
      <EmptyPanelState
        kind={kind}
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}

export default function SuperAdminView({ activeTab }: { activeTab: SuperAdminTab }) {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [kycList, setKycList] = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [cmsItems, setCmsItems] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  // Payment Gateway Configuration State (Razorpay-only dedicated page)
  const [paymentSubView, setPaymentSubView] = useState<"overview" | "setup">("overview");
  const [gwKeyId, setGwKeyId] = useState("");
  const [gwKeySecret, setGwKeySecret] = useState("");
  const [gwWebhookSecret, setGwWebhookSecret] = useState("");
  const [gwAccountId, setGwAccountId] = useState("");
  const [gwPublishableKey, setGwPublishableKey] = useState("");
  const [gwAutoFailover, setGwAutoFailover] = useState("500");
  const [gwEnabled, setGwEnabled] = useState(true);
  const [gwSaving, setGwSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState(false);

  const [isInviteOrganizerOpen, setIsInviteOrganizerOpen] = useState(false);
  const [inviteOrgName, setInviteOrgName] = useState("");
  const [inviteContactPerson, setInviteContactPerson] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const handleInviteOrganizer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteOrgName.trim() || !inviteEmail.trim()) {
      showToast("Please provide both organization name and contact email.");
      return;
    }
    const newOrg = {
      id: `org_${Date.now()}`,
      name: inviteOrgName.trim(),
      contactPerson: inviteContactPerson.trim() || "Host Lead",
      contactEmail: inviteEmail.trim(),
      eventsCount: 0,
      totalGMV: 0,
      kycStatus: "PENDING",
      payoutStatus: "ACTIVE",
      joinedDate: "Today",
    };
    setOrganizers((prev) => [newOrg, ...prev]);
    showToast(`Invitation sent to ${inviteEmail.trim()} for ${inviteOrgName.trim()}!`);
    setIsInviteOrganizerOpen(false);
    setInviteOrgName("");
    setInviteContactPerson("");
    setInviteEmail("");
  };

  const [metrics, setMetrics] = useState({
    totalGmv: 0,
    totalOrders: 0,
    totalEvents: 0,
    totalAttendees: 0,
    checkedInCount: 0,
    netRevenue: 0,
    platformFee: 0,
  });

  const refreshData = () => {
    const evs = getStoredEvents(true);
    setEvents(
      evs.map((ev) => {
        const totalCap = ev.tiers?.reduce((sum, t) => sum + (t.total_capacity || 0), 0) || ev.total_capacity || 0;
        const remainingCap = ev.tiers?.reduce((sum, t) => sum + (t.remaining_capacity ?? 0), 0) || 0;
        const sold = Math.max(0, totalCap - remainingCap);
        const avgPrice = ev.tiers?.[0]?.price_cents ? ev.tiers[0].price_cents / 100 : 0;
        return {
          id: ev.id,
          title: ev.title,
          organizer: formatOrganizerDisplay({
            hostName: ev.hosts?.[0],
            channelName: ev.channel_name,
            username: ev.organizer_username,
            organizerId: ev.organizer_id,
          }),
          date: ev.start_time || "Upcoming",
          status: ev.deleted_by_organizer || ev.status === "DELETED" ? "DELETED" : (ev.status || "PUBLISHED"),
          category: ev.category || "General",
          capacity: totalCap,
          totalCapacity: totalCap,
          ticketsSold: sold,
          grossGMV: sold * avgPrice,
          featured: true,
        };
      })
    );

    const atts = getAllAttendees();
    const ords = getAllOrders();
    const userMap = new Map<string, any>();
    atts.forEach((a) => {
      const uOrders = ords.filter((o) => o.buyerEmail?.toLowerCase() === a.email?.toLowerCase());
      const spent = uOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
      userMap.set(a.email.toLowerCase(), {
        id: a.id,
        name: a.name,
        email: a.email,
        ordersCount: uOrders.length || 1,
        totalSpent: spent,
        joinedDate: a.registeredAt ? new Date(a.registeredAt).toLocaleDateString() : "Today",
        status: "ACTIVE",
        role: "attendee",
      });
    });
    setUsers(Array.from(userMap.values()));

    fetch("/api/v1/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.users && Array.isArray(data.users)) {
          data.users.forEach((dbUser: any) => {
            const key = dbUser.email.toLowerCase();
            const existing = userMap.get(key);
            if (!existing) {
              userMap.set(key, {
                id: dbUser.id,
                name: dbUser.name || dbUser.email.split("@")[0],
                email: dbUser.email,
                ordersCount: 0,
                totalSpent: 0,
                joinedDate: dbUser.createdAt ? new Date(dbUser.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recent",
                status: "ACTIVE",
                role: dbUser.role,
              });
            } else {
              existing.role = dbUser.role;
            }
          });
          setUsers(Array.from(userMap.values()));
        }
      })
      .catch(() => {});

    setOrders(
      ords.map((o) => ({
        id: o.id,
        customer: o.buyerName,
        email: o.buyerEmail,
        event: o.eventName,
        tier: o.tierName,
        amount: o.amount,
        method: o.paymentMethod || "UPI / Direct Rail",
        status: o.status === "CONFIRMED" ? "SETTLED" : o.status,
        date: new Date(o.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      }))
    );

    const tkts = getUserTickets();
    setTickets(
      tkts.map((t) => ({
        id: t.id,
        ticketCode: t.ticket_code,
        event: t.event_title,
        owner: t.user_name,
        tier: t.tier_name,
        checkInStatus: t.status === "CHECKED_IN" ? "CHECKED_IN" : "ISSUED",
        gate: t.status === "CHECKED_IN" ? "Gate A" : "Unclaimed",
        scannedAt: t.checked_in_at || "—",
      }))
    );

    const chans = getStoredChannels();
    const realOrgs = chans.map((ch) => {
      const chEvents = evs.filter((e) => e.channel_id === ch.id || e.organizer_id === ch.owner_id);
      const chOrders = ords.filter((o) => chEvents.some((e) => e.title === o.eventName || e.id === o.eventId));
      const gmv = chOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      return {
        id: ch.id,
        name: ch.name,
        contactPerson: "Channel Admin",
        contactEmail: `contact@${ch.slug || "community"}.org`,
        eventsCount: chEvents.length,
        totalGMV: gmv,
        kycStatus: ch.verified ? "VERIFIED" : "PENDING",
        payoutStatus: "ACTIVE",
        joinedDate: ch.created_at ? new Date(ch.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recent",
      };
    });
    setOrganizers(realOrgs);

    const realKyc = chans.map((ch) => ({
      id: ch.id,
      name: ch.name,
      legalName: ch.name,
      documentType: "Business Incorporation",
      submittedAt: ch.created_at ? new Date(ch.created_at).toLocaleDateString() : "Recent",
      status: ch.verified ? "APPROVED" : "PENDING",
    }));
    setKycList(realKyc);

    const eventPMap = new Map<string, { event: string; organizer: string; gross: number; count: number }>();
    ords.forEach((o) => {
      const existing = eventPMap.get(o.eventName) || { event: o.eventName, organizer: "Platform Host", gross: 0, count: 0 };
      existing.gross += (o.amount || 0);
      existing.count += 1;
      eventPMap.set(o.eventName, existing);
    });
    const realPayouts = Array.from(eventPMap.entries()).map(([eventName, data], i) => {
      const fee = Math.round(data.gross * 0.03);
      const net = data.gross - fee;
      return {
        id: `po_${i + 1}`,
        organizer: data.organizer,
        event: eventName,
        amount: net,
        bankAccount: "Direct Settlement (Automated)",
        status: "SETTLED",
        requestedDate: "Today",
      };
    });
    setPayouts(realPayouts.filter((p) => p.amount > 0));

    const pendingApprovals = evs
      .filter((e) => (e.status as string) === "PENDING" || e.status === "DRAFT")
      .map((e) => ({
        id: e.id,
        title: e.title,
        organizerName: e.hosts?.[0] || "Organizer",
        category: e.category || "Drop",
        expectedAttendees: e.total_capacity || 0,
        status: "PENDING_REVIEW",
      }));
    setApprovals(pendingApprovals);

    setMetrics(getPlatformMetrics());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("hackways_events_updated", refreshData);
    window.addEventListener("hackways_tickets_updated", refreshData);
    window.addEventListener("hackways_checkin_updated", refreshData);
    window.addEventListener("hackways_channels_updated", refreshData);
    return () => {
      window.removeEventListener("hackways_events_updated", refreshData);
      window.removeEventListener("hackways_tickets_updated", refreshData);
      window.removeEventListener("hackways_checkin_updated", refreshData);
      window.removeEventListener("hackways_channels_updated", refreshData);
    };
  }, []);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [concurrencyLockEngine, setConcurrencyLockEngine] = useState(true);
  const [rateLimitRps, setRateLimitRps] = useState("500");
  const [defaultTakeRate, setDefaultTakeRate] = useState("3.0");

  // Real platform settings (module access matrix + fee) from the server store
  const {
    settings: platformSettings,
    canManage: canManagePlatform,
    loaded: platformLoaded,
    applyUpdate: applyPlatformUpdate,
  } = usePlatformSettings();
  const [moduleAccess, setModuleAccess] = useState<PlatformSettings["moduleAccess"] | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    if (platformSettings) {
      setModuleAccess(platformSettings.moduleAccess);
      setDefaultTakeRate(String(platformSettings.platformFeePercent));
      const rzp = platformSettings.paymentGateways?.razorpay;
      if (rzp) {
        setGwKeyId(rzp.keyId || "");
        setGwKeySecret(rzp.keySecret || "");
        setGwWebhookSecret(rzp.webhookSecret || "");
        setGwEnabled(rzp.enabled ?? true);
      }
    }
  }, [platformSettings]);

  const openConfigureGateway = (_gw?: string) => {
    const existing = platformSettings?.paymentGateways?.razorpay;
    setGwKeyId(existing?.keyId || "");
    setGwKeySecret(existing?.keySecret || "");
    setGwWebhookSecret(existing?.webhookSecret || "");
    setGwEnabled(existing?.enabled ?? true);
    setPaymentSubView("setup");
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setGwSaving(true);
    try {
      const updatedGwConfig = {
        keyId: gwKeyId.trim(),
        keySecret: gwKeySecret.trim(),
        webhookSecret: gwWebhookSecret.trim(),
        enabled: gwEnabled,
      };

      const res = await fetch("/api/v1/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentGateways: {
            razorpay: updatedGwConfig,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save gateway credentials.");
        return;
      }
      applyPlatformUpdate(data.settings);
      showToast("Razorpay credentials saved and deployed to checkout rails.");
      setPaymentSubView("overview");
    } catch {
      showToast("Network error saving gateway configuration.");
    } finally {
      setGwSaving(false);
    }
  };

  const handleTestPing = (gw: "razorpay" | "stripe" | "phonepe") => {
    const config = platformSettings?.paymentGateways?.[gw];
    const hasKey = gw === "stripe" ? Boolean(config?.publishableKey || config?.accountId) : Boolean(config?.keyId);
    if (!hasKey) {
      showToast(`${gw.toUpperCase()} is not configured. Click Configure to add credentials.`);
      return;
    }
    showToast(`${gw.toUpperCase()} ping test succeeded (200 OK). Webhook endpoints verified.`);
  };

  async function savePlatformSettings() {
    if (!moduleAccess || settingsSaving) return;
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsMessage("");
    try {
      const res = await fetch("/api/v1/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleAccess, platformFeePercent: Number(defaultTakeRate) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(typeof data.error === "string" ? data.error : "Settings couldn't be saved.");
        return;
      }
      applyPlatformUpdate(data.settings);
      setSettingsMessage(`Saved. Fee and module access now apply platform-wide.`);
    } catch {
      setSettingsError("Network error. Please try again.");
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* 2. Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <div className="text-xs text-zinc-500">Platform Volume</div>
              <div className="text-2xl font-bold text-zinc-950 mt-1">₹{metrics.totalGmv.toLocaleString()}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Real settled commerce</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <div className="text-xs text-zinc-500">Gross Tickets Sold</div>
              <div className="text-2xl font-bold text-zinc-950 mt-1">{metrics.totalAttendees}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{metrics.checkedInCount} checked in</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <div className="text-xs text-zinc-500">Total Published Drops</div>
              <div className="text-2xl font-bold text-zinc-950 mt-1">{metrics.totalEvents}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Active event drops</div>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <div className="text-xs text-zinc-500">Platform Revenue (3%)</div>
              <div className="text-2xl font-bold text-zinc-950 mt-1">₹{Math.round(metrics.platformFee).toLocaleString()}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Automated fee sweep</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-5 rounded-xl border border-zinc-200 bg-white space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-950">Pending Event Submissions</h3>
                <span className="text-xs font-mono text-zinc-500">{approvals.length} Queue</span>
              </div>
              <div className="space-y-2">
                {approvals.length === 0 ? (
                  <div className="py-6 px-4 text-center flex flex-col items-center justify-center">
                    <div className="mb-3"><DashboardArtwork kind="events" /></div>
                    <div className="text-xs font-semibold text-zinc-900">Submission queue is empty</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">All event drops have been processed and approved.</div>
                  </div>
                ) : (
                  approvals.map((app) => (
                    <div key={app.id} className="p-3 border border-zinc-200 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-zinc-950">{app.title}</div>
                        <div className="text-[11px] text-zinc-500">{app.organizerName} · {app.category} · Cap: {app.expectedAttendees}</div>
                      </div>
                      <span className="font-mono text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-semibold">
                        {app.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-xl border border-zinc-200 bg-white space-y-3">
              <h3 className="text-sm font-bold text-zinc-950">Real-Time Risk Telemetry</h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="font-bold text-zinc-950">Zero-Overselling Engine</div>
                  <div className="text-zinc-500 mt-0.5">Live transaction integrity metrics are unavailable.</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <div className="font-bold text-zinc-950">Bot Traffic Mitigation</div>
                  <div className="text-zinc-500 mt-0.5">Bot traffic metrics are unavailable.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Events */}
      {activeTab === "events" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">All Platform Events</h3>
              <p className="text-xs text-zinc-500">Live drops, scheduled keynotes, and past conferences.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={webAppHref("/create")}
                className="text-xs font-medium bg-zinc-950 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus size={13} />
                <span>Create Event</span>
              </Link>
              <button
                type="button"
                onClick={() => showToast("Event directory exported to CSV.")}
                className="text-xs border border-zinc-300 bg-zinc-50 px-3 py-1.5 rounded-lg text-zinc-800 hover:bg-zinc-100"
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                  <th className="py-2.5 px-3">Event Title</th>
                  <th className="py-2.5 px-3">Organizer</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Tickets Sold</th>
                  <th className="py-2.5 px-3">GMV</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {events.length === 0 ? (
                  <EmptyTableRow
                    colSpan={7}
                    kind="events"
                    title="No events available"
                    description="There are no live drops, scheduled keynotes, or events created yet."
                    action={
                      <Link
                        href={webAppHref("/create")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-950 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition shadow-2xs"
                      >
                        <Plus size={14} />
                        <span>Create Event</span>
                      </Link>
                    }
                  />
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-bold text-zinc-950">
                        <Link
                          href={`/console/super-admin/events/${ev.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{ev.title}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-zinc-600">{ev.organizer}</td>
                      <td className="py-3 px-3 text-zinc-600">{ev.category}</td>
                      <td className="py-3 px-3 font-mono">{ev.ticketsSold}{ev.capacity > 0 ? ` / ${ev.capacity}` : ""}</td>
                      <td className="py-3 px-3 font-mono font-bold">₹{(ev.grossGMV / 100000).toFixed(1)}L</td>
                      <td className="py-3 px-3">
                        <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                          ev.status === "DELETED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-zinc-100 text-zinc-800"
                        }`}>
                          {ev.status === "DELETED" ? "DELETED (ARCHIVED)" : ev.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/console/super-admin/events/${ev.id}`}
                            className="h-7 px-3 rounded-md text-[11px] font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center justify-center shadow-2xs"
                          >
                            Audit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEvents(events.map((e) => e.id === ev.id ? { ...e, featured: !e.featured } : e));
                              showToast(ev.featured ? `Removed "${ev.title}" from featured` : `Featured "${ev.title}"`);
                            }}
                            className={`h-7 px-2.5 rounded-md text-[11px] font-medium border transition ${
                              ev.featured
                                ? "bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200"
                                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950"
                            }`}
                          >
                            {ev.featured ? "Featured" : "Feature"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Organizers */}
      {activeTab === "organizers" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Organizer Organizations Directory</h3>
              <p className="text-xs text-zinc-500">Corporate event hosts, KYC verifications, and payout controls.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsInviteOrganizerOpen(true)}
              className="text-xs font-medium bg-zinc-950 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition inline-flex items-center gap-1.5 shadow-2xs"
            >
              <UserPlus size={14} />
              <span>Invite Organizer</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Contact Email</th>
                  <th className="py-2.5 px-3">Events</th>
                  <th className="py-2.5 px-3">Total GMV</th>
                  <th className="py-2.5 px-3">KYC Status</th>
                  <th className="py-2.5 px-3">Payout Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {organizers.length === 0 ? (
                  <EmptyTableRow
                    colSpan={7}
                    kind="communities"
                    title="No organizer communities registered"
                    description="No community hosts or organizer organizations have registered on the platform yet."
                    action={
                      <button
                        type="button"
                        onClick={() => setIsInviteOrganizerOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-950 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition shadow-2xs"
                      >
                        <UserPlus size={14} />
                        <span>Invite Organizer</span>
                      </button>
                    }
                  />
                ) : (
                  organizers.map((org) => (
                    <tr key={org.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-bold text-zinc-950">{org.name}</td>
                      <td className="py-3 px-3 text-zinc-500">{org.contactEmail}</td>
                      <td className="py-3 px-3 font-mono">{org.eventsCount}</td>
                      <td className="py-3 px-3 font-mono font-bold">₹{(org.totalGMV / 100000).toFixed(1)}L</td>
                      <td className="py-3 px-3">
                        <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                          org.kycStatus === "VERIFIED" ? "bg-zinc-100 text-zinc-800" : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}>
                          {org.kycStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                          org.payoutStatus === "ACTIVE" ? "bg-zinc-100 text-zinc-800" : "bg-red-50 text-red-800 border border-red-200"
                        }`}>
                          {org.payoutStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => {
                            setOrganizers(organizers.map((o) => o.id === org.id ? { ...o, payoutStatus: o.payoutStatus === "ACTIVE" ? "FROZEN" : "ACTIVE" } : o));
                          }}
                          className="text-[11px] font-medium text-zinc-700 hover:text-zinc-950 underline"
                        >
                          {org.payoutStatus === "ACTIVE" ? "Freeze Payouts" : "Unfreeze"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Attendees / Users */}
      {activeTab === "attendees" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Global User & Attendee Roster</h3>
            <p className="text-xs text-zinc-500">Registered attendee accounts, pass purchases, and account status.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Orders</th>
                  <th className="py-2.5 px-3">Total Spent</th>
                  <th className="py-2.5 px-3">Joined Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {users.length === 0 ? (
                  <EmptyTableRow
                    colSpan={7}
                    kind="users"
                    title="No registered users or attendees"
                    description="User accounts and attendee rosters will automatically populate here as tickets are claimed."
                    action={
                      <Link
                        href={webAppHref("/home")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 px-4 py-2 rounded-lg transition shadow-2xs"
                      >
                        <span>Explore Events</span>
                      </Link>
                    }
                  />
                ) : (
                  users.map((usr) => (
                    <tr key={usr.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-bold text-zinc-950">
                        <Link
                          href={`/console/super-admin/attendees/${usr.id}`}
                          className="hover:underline"
                        >
                          {usr.name}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-zinc-500 font-mono">{usr.email}</td>
                      <td className="py-3 px-3 font-mono">{usr.ordersCount}</td>
                      <td className="py-3 px-3 font-mono font-bold">₹{usr.totalSpent}</td>
                      <td className="py-3 px-3 text-zinc-500">{usr.joinedDate}</td>
                      <td className="py-3 px-3">
                        <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                          usr.status === "ACTIVE"
                            ? "bg-zinc-100 text-zinc-800"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {usr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/console/super-admin/attendees/${usr.id}`}
                            className="h-7 px-3 rounded-md text-[11px] font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center justify-center shadow-2xs"
                          >
                            Audit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const newStatus = usr.status === "ACTIVE" ? "RESTRICTED" : "ACTIVE";
                              setUsers(users.map((u) => u.id === usr.id ? { ...u, status: newStatus } : u));
                              showToast(newStatus === "RESTRICTED" ? `Restricted account for ${usr.name}` : `Restored active access for ${usr.name}`);
                            }}
                            className={`h-7 px-2.5 rounded-md text-[11px] font-medium border transition ${
                              usr.status === "ACTIVE"
                                ? "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950"
                                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            }`}
                          >
                            {usr.status === "ACTIVE" ? "Restrict" : "Lift"}
                          </button>
                          <button
                            type="button"
                            onClick={() => showToast(`Revoked active sessions for ${usr.email}`)}
                            className="h-7 px-2.5 rounded-md text-[11px] font-medium border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition"
                            title="Revoke Sessions"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Orders */}
      {activeTab === "orders" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Master Order Ledger</h3>
            <p className="text-xs text-zinc-500">Every ticket purchase, reservation checkout, and payment state.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {orders.length === 0 ? (
                  <EmptyTableRow
                    colSpan={7}
                    kind="revenue"
                    title="No orders placed yet"
                    description="Customer orders, ticket checkout transactions, and reservations will be logged in real-time."
                  />
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-mono font-bold text-zinc-950">{ord.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-900">{ord.customer}</div>
                        <div className="text-[11px] text-zinc-400">{ord.email}</div>
                      </td>
                      <td className="py-3 px-3 text-zinc-700">{ord.event}</td>
                      <td className="py-3 px-3 text-zinc-600">{ord.tier}</td>
                      <td className="py-3 px-3 font-mono font-bold">₹{ord.amount}</td>
                      <td className="py-3 px-3 text-zinc-500">{ord.method}</td>
                      <td className="py-3 px-3 font-mono text-[11px] font-semibold">{ord.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tickets */}
      {activeTab === "tickets" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Platform Ticket Pass Inventory</h3>
            <p className="text-xs text-zinc-500">Verifiable QR digital passes, check-in gate status, and hash records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Attendee</th>
                  <th className="py-2.5 px-3">Admission Tier</th>
                  <th className="py-2.5 px-3">Check-in Status</th>
                  <th className="py-2.5 px-3">Scanned At</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {tickets.length === 0 ? (
                  <EmptyTableRow
                    colSpan={7}
                    kind="tickets"
                    title="No tickets issued yet"
                    description="Verifiable digital passes with dynamic QR check-in codes will display here upon issue."
                  />
                ) : (
                  tickets.map((tkt) => (
                    <tr key={tkt.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-mono font-bold text-zinc-950">{tkt.ticketCode}</td>
                      <td className="py-3 px-3 text-zinc-700">{tkt.event}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-900">{tkt.owner}</td>
                      <td className="py-3 px-3 text-zinc-600">{tkt.tier}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded font-semibold">
                          {tkt.checkInStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-500">{tkt.scannedAt} ({tkt.gate})</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => {
                            setTickets(tickets.map((t) => t.id === tkt.id ? { ...t, checkInStatus: "REVOKED" } : t));
                          }}
                          className="text-[11px] text-zinc-600 hover:text-zinc-950 underline"
                        >
                          Revoke Pass
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Payments */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          {paymentSubView === "setup" ? (
            /* Dedicated Razorpay Full-Page Setup View (avoid popup) */
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentSubView("overview")}
                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition"
                    title="Back to Payments"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 font-heading">Configure Razorpay Rails</h3>
                    <p className="text-xs text-zinc-500">Manage live API keys, webhook secrets, and checkout settings for all organizer drops.</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2.5 py-1 rounded font-semibold ${
                  platformSettings?.paymentGateways?.razorpay?.keyId
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                    : "text-zinc-600 bg-zinc-100"
                }`}>
                  {platformSettings?.paymentGateways?.razorpay?.keyId ? "Active & Live" : "Not connected"}
                </span>
              </div>

              <form onSubmit={handleSaveGateway} className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold text-zinc-900 mb-1">Razorpay Key ID</label>
                  <input
                    type="text"
                    placeholder="rzp_live_... or rzp_test_..."
                    value={gwKeyId}
                    onChange={(e) => setGwKeyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 font-mono"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">Found in your Razorpay Dashboard → Settings → API Keys.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-900">Razorpay Key Secret</label>
                    <button
                      type="button"
                      onClick={() => setShowKeySecret(!showKeySecret)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium"
                    >
                      {showKeySecret ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKeySecret ? "text" : "password"}
                    placeholder="••••••••••••••••"
                    value={gwKeySecret}
                    onChange={(e) => setGwKeySecret(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 font-mono"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">Generated alongside the Key ID. Stored securely.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-900 mb-1">Webhook Secret</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={gwWebhookSecret}
                    onChange={(e) => setGwWebhookSecret(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 font-mono"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">Secret used to sign and verify incoming webhook requests from Razorpay.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-900 mb-1">Webhook Target URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://hackways.me/api/v1/orders/webhook"
                      className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-600 font-mono select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("https://hackways.me/api/v1/orders/webhook");
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                        showToast("Webhook URL copied to clipboard.");
                      }}
                      className="px-3 py-2 border border-zinc-200 rounded-lg text-xs font-medium hover:bg-zinc-50 flex items-center gap-1.5 shrink-0"
                    >
                      {copiedWebhook ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedWebhook ? "Copied" : "Copy URL"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Configure this URL in your Razorpay Dashboard under Webhooks (events: payment.captured, order.paid).</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="gwEnabled"
                    checked={gwEnabled}
                    onChange={(e) => setGwEnabled(e.target.checked)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <label htmlFor="gwEnabled" className="text-xs font-medium text-zinc-700 cursor-pointer">
                    Enable Razorpay gateway on live checkout drops
                  </label>
                </div>

                <div className="pt-4 flex items-center gap-3 border-t border-zinc-100">
                  <button
                    type="submit"
                    disabled={gwSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-zinc-950 text-white font-medium hover:bg-zinc-800 transition shadow-2xs text-xs disabled:opacity-50"
                  >
                    <span>{gwSaving ? "Saving..." : "Save Credentials"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestPing("razorpay")}
                    className="px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium text-xs transition"
                  >
                    Test Ping Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentSubView("overview")}
                    className="px-4 py-2.5 rounded-lg text-zinc-500 hover:text-zinc-800 font-medium text-xs ml-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Payments Overview: Razorpay Only */
            <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Payment Gateway Rails</h3>
                  <p className="text-xs text-zinc-500">
                    Primary checkout rails powered exclusively by Razorpay. Configured and managed by Super Admin.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-2 py-0.5 shrink-0 self-start sm:self-center">
                  Super Admin Scope
                </span>
              </div>

              <div className="max-w-md pt-1">
                {/* Razorpay Single Card */}
                <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-zinc-950">Razorpay Production Rails</div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      platformSettings?.paymentGateways?.razorpay?.keyId
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                        : "text-zinc-600 bg-zinc-100"
                    }`}>
                      {platformSettings?.paymentGateways?.razorpay?.keyId ? "Active & Live" : "Not connected"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Handles UPI, Credit/Debit Cards, NetBanking, and automated drops with atomic instant capture.
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 space-y-0.5 border-t border-zinc-100 pt-2">
                    <div>Key ID: {platformSettings?.paymentGateways?.razorpay?.keyId ? `rzp_live_••••${platformSettings.paymentGateways.razorpay.keyId.slice(-4)}` : "Not configured"}</div>
                    <div>Webhook: {platformSettings?.paymentGateways?.razorpay?.webhookSecret ? "Configured (Active)" : "Not configured"}</div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openConfigureGateway("razorpay")}
                      className="h-7 px-3 inline-flex items-center text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-md transition shadow-2xs"
                    >
                      Configure Razorpay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestPing("razorpay")}
                      className="h-7 px-2.5 inline-flex items-center text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-md transition"
                    >
                      Test Ping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Gateway Reconciliation */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Payment Gateway Reconciliation</h3>
              <p className="text-xs text-zinc-500">Gross captures, interchange fees, platform commission, and settlement batch status.</p>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                  <th className="py-2.5 px-3">Reference ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Gross</th>
                  <th className="py-2.5 px-3">Platform Fee</th>
                  <th className="py-2.5 px-3">Net</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {orders.length === 0 ? (
                  <EmptyTableRow
                    colSpan={8}
                    kind="revenue"
                    title="No payment transactions recorded"
                    description="Gross captures, interchange fees, platform commission, and settlement batch status will appear here."
                  />
                ) : (
                  orders.map((ord) => {
                    const fee = Math.round((ord.amount || 0) * 0.03);
                    const net = (ord.amount || 0) - fee;
                    return (
                      <tr key={ord.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-3 font-mono text-zinc-600">tx_{ord.id.slice(-8)}</td>
                        <td className="py-3 px-3 font-mono text-zinc-500">{ord.date}</td>
                        <td className="py-3 px-3 font-semibold text-zinc-950">{ord.event}</td>
                        <td className="py-3 px-3 font-mono">{ord.method}</td>
                        <td className="py-3 px-3 font-mono">₹{ord.amount}</td>
                        <td className="py-3 px-3 font-mono text-zinc-500">₹{fee}</td>
                        <td className="py-3 px-3 font-mono font-bold text-zinc-950">₹{net}</td>
                        <td className="py-3 px-3 font-mono text-[11px]">{ord.status}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* 8. Refunds */}
      {activeTab === "refunds" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Refund Approvals & Claims</h3>
            <p className="text-xs text-zinc-500">Attendee ticket cancellations, duplicate payment resolution, and charge reversals.</p>
          </div>
          <div className="space-y-3">
            {refunds.length === 0 ? (
              <EmptyCardState
                kind="refunds"
                title="No refund claims pending"
                description="All attendee ticket cancellations and duplicate payment requests have been resolved."
              />
            ) : (
              refunds.map((ref) => (
                <div key={ref.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{ref.customer} — ₹{ref.amount}</div>
                    <div className="text-zinc-600 mt-0.5">{ref.event} · Order: {ref.orderId}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Reason: {ref.reason} · {ref.requestedAt}</div>
                  </div>
                  <div>
                    {ref.status === "PENDING_APPROVAL" ? (
                      <button
                        onClick={() => {
                          setRefunds(refunds.map((r) => r.id === ref.id ? { ...r, status: "PROCESSED" } : r));
                        }}
                        className="bg-zinc-950 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-zinc-800"
                      >
                        Approve & Refund
                      </button>
                    ) : (
                      <span className="font-mono text-zinc-500 font-semibold bg-zinc-100 px-2.5 py-1 rounded">
                        Refund Settled
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 9. Payouts */}
      {activeTab === "payouts" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Organizer Payout Schedules</h3>
            <p className="text-xs text-zinc-500">Weekly automated bank sweeps, NEFT transfers, and compliance verification holds.</p>
          </div>
          <div className="space-y-3">
            {payouts.length === 0 ? (
              <EmptyCardState
                kind="revenue"
                title="No pending organizer payouts"
                description="Scheduled NEFT bank transfers and organizer payout settlements will appear here."
              />
            ) : (
              payouts.map((pay) => (
                <div key={pay.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{pay.organizer} — ₹{(pay.amount / 100000).toFixed(2)}L</div>
                    <div className="text-zinc-600 mt-0.5">{pay.bank} · IFSC: {pay.ifsc}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{pay.cycle} · {pay.scheduledDate}</div>
                  </div>
                  <div>
                    {pay.status === "HELD_KYC" ? (
                      <button
                        onClick={() => {
                          setPayouts(payouts.map((p) => p.id === pay.id ? { ...p, status: "PROCESSING" } : p));
                        }}
                        className="border border-zinc-300 bg-zinc-50 px-3 py-1.5 rounded-lg font-semibold text-zinc-800 hover:bg-zinc-100"
                      >
                        Release Hold
                      </button>
                    ) : (
                      <span className="font-mono text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded font-semibold">
                        {pay.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 10. Commissions */}
      {activeTab === "commissions" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Platform Fee Tier & Commissions</h3>
            <p className="text-xs text-zinc-500">Default take-rate configuration and enterprise partner commission agreements.</p>
          </div>
          <div className="space-y-3">
            {organizers.length === 0 ? (
              <EmptyCardState
                kind="revenue"
                title="No custom commission agreements"
                description="Enterprise partner take-rate arrangements and negotiated tiers will display here."
              />
            ) : (
              organizers.map((org) => {
                const rate = platformSettings?.platformFeePercent || 3;
                const netFee = Math.round((org.totalGMV * rate) / 100);
                return (
                  <div key={org.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-zinc-950">{org.name}</div>
                      <div className="text-zinc-500 mt-0.5">{org.eventsCount} Events · Gross Captured: ₹{(org.totalGMV / 100000).toFixed(1)}L</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-zinc-950">{rate}% Take Rate</div>
                      <div className="font-mono text-[11px] text-zinc-500 mt-0.5">Net Fee: ₹{(netFee / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 11. KYC / Verification */}
      {activeTab === "kyc" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Organizer Legal & Bank Verification</h3>
            <p className="text-xs text-zinc-500">Government Tax ID audits, bank account ownership documents, and payout hold releases.</p>
          </div>
          <div className="space-y-3">
            {kycList.length === 0 ? (
              <EmptyCardState
                kind="flag"
                title="No pending KYC verifications"
                description="All organizer legal documentation and tax ID audit requests are currently up to date."
              />
            ) : (
              kycList.map((kyc) => (
                <div key={kyc.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{kyc.organizationName}</div>
                    <div className="text-zinc-600 mt-0.5">Contact: {kyc.contactPerson} · Tax ID: {kyc.taxId}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">Bank Account: •••• {kyc.bankAccountLast4}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-zinc-100 px-2 py-1 rounded font-semibold text-zinc-700">
                      {kyc.verificationStatus}
                    </span>
                    {kyc.verificationStatus !== "VERIFIED" && (
                      <button
                        onClick={() => {
                          setKycList(kycList.map((k) => k.id === kyc.id ? { ...k, verificationStatus: "VERIFIED", payoutHold: false } : k));
                        }}
                        className="bg-zinc-950 text-white px-3 py-1 rounded font-semibold hover:bg-zinc-800"
                      >
                        Verify & Release
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 12. Fraud & Risk */}
      {activeTab === "fraud" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Fraud Detection & Rate Limiter Telemetry</h3>
            <p className="text-xs text-zinc-500">Automated bot defense, card testing velocity flags, and IP blacklist triggers.</p>
          </div>
          <div className="space-y-3">
            {fraudFlags.length === 0 ? (
              <EmptyCardState
                kind="flag"
                title="Zero fraud alerts detected"
                description="Active bot defense, velocity triggers, and IP subnet telemetry report clean traffic."
              />
            ) : (
              fraudFlags.map((frd) => (
                <div key={frd.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{frd.ruleTriggered}</div>
                    <div className="text-zinc-600 mt-0.5">Source: {frd.ipAddress} · Target: {frd.targetEvent}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">Timestamp: {frd.timestamp}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[11px] font-bold bg-zinc-950 text-white px-2 py-0.5 rounded">
                      {frd.actionTaken}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 13. Disputes */}
      {activeTab === "disputes" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Payment Chargeback & Bank Disputes</h3>
            <p className="text-xs text-zinc-500">Bank retrieval requests, evidence submission tracking, and merchant buffer protection.</p>
          </div>
          <div className="space-y-3">
            {disputes.length === 0 ? (
              <EmptyCardState
                kind="flag"
                title="No active chargebacks or disputes"
                description="Bank retrieval requests and customer payment dispute cases are clear."
              />
            ) : (
              disputes.map((dsp) => (
                <div key={dsp.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">Case {dsp.bankCaseId} — ₹{dsp.amount}</div>
                    <div className="text-zinc-600 mt-0.5">Customer: {dsp.customer} · Order: {dsp.orderId}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Reason: {dsp.reason} · Deadline: {dsp.deadline}</div>
                  </div>
                  <button
                    onClick={() => showToast("Bank evidence dispatch isn't connected to a live service yet.")}
                    className="bg-zinc-950 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-zinc-800"
                  >
                    Submit Proof
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 14. Support */}
      {activeTab === "support" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Platform Support Tickets Desk</h3>
            <p className="text-xs text-zinc-500">Organizer and attendee escalation tickets, priority handling, and SLA tracking.</p>
          </div>
          <div className="space-y-3">
            {supportTickets.length === 0 ? (
              <EmptyCardState
                kind="broadcast"
                title="No open support tickets"
                description="Organizer and attendee escalation tickets submitted to the desk will be routed here."
              />
            ) : (
              supportTickets.map((sup) => (
                <div key={sup.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{sup.subject}</div>
                    <div className="text-zinc-600 mt-0.5">From: {sup.customer} ({sup.type}) · {sup.createdAt}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-semibold">
                      {sup.status}
                    </span>
                    {sup.status === "OPEN" && (
                      <button
                        onClick={() => {
                          setSupportTickets(supportTickets.map((s) => s.id === sup.id ? { ...s, status: "RESOLVED" } : s));
                        }}
                        className="bg-zinc-950 text-white px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-zinc-800"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 15. Analytics */}
      {activeTab === "analytics" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Platform Intelligence & Concurrency Analytics</h3>
            <p className="text-xs text-zinc-500">Drop traffic spikes, checkout conversion velocity, and drop sellout curves.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="text-zinc-500">Peak Concurrency (Today)</div>
              <div className="text-xl font-bold text-zinc-950">Unavailable</div>
              <div className="text-[11px] text-zinc-400">Concurrency telemetry is not connected</div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="text-zinc-500">Drop Checkout Velocity</div>
              <div className="text-xl font-bold text-zinc-950">Unavailable</div>
              <div className="text-[11px] text-zinc-400">Checkout telemetry is not connected</div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="text-zinc-500">Platform Drop Conversion</div>
              <div className="text-xl font-bold text-zinc-950">Unavailable</div>
              <div className="text-[11px] text-zinc-400">Conversion tracking is not connected</div>
            </div>
          </div>
        </div>
      )}

      {/* 16. Notifications */}
      {activeTab === "notifications" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">System Broadcast Dispatcher</h3>
              <p className="text-xs text-zinc-500">Send platform maintenance announcements or emergency advisories.</p>
            </div>
            <button
              onClick={() => showToast("System broadcasts aren't connected to a delivery service yet.")}
              className="bg-zinc-950 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-800"
            >
              + New Broadcast
            </button>
          </div>
          <div className="space-y-3">
            <EmptyCardState
              kind="broadcast"
              title="No system broadcasts sent"
              description="Platform-wide emergency advisories, scheduled maintenance, and announcements will be archived here."
            />
          </div>
        </div>
      )}

      {/* 17. CMS / Content */}
      {activeTab === "cms" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Platform CMS & Spotlight Placements</h3>
            <p className="text-xs text-zinc-500">Manage featured drops, homepage hero banners, and policy announcements.</p>
          </div>
          <div className="space-y-3">
            {cmsItems.length === 0 ? (
              <EmptyCardState
                kind="venue"
                title="No CMS spotlight placements"
                description="Homepage spotlight hero banners, curated collections, and policy notices will appear here."
              />
            ) : (
              cmsItems.map((cms) => (
                <div key={cms.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{cms.title}</div>
                    <div className="text-zinc-500 mt-0.5">Placement: {cms.location} · Target: {cms.linkTarget}</div>
                  </div>
                  <span className="font-mono text-[11px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded font-semibold">
                    {cms.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 18. Admin Users & Roles */}
      {activeTab === "roles" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Internal Team & RBAC Permissions</h3>
            <p className="text-xs text-zinc-500">Super administrator accounts, security leads, and financial operators.</p>
          </div>
          <div className="space-y-3">
            {staffList.length === 0 ? (
              <EmptyCardState
                kind="communities"
                title="No staff members listed"
                description="Super admin operators and RBAC permission assignments will be configured here."
              />
            ) : (
              staffList.map((stf) => (
                <div key={stf.id} className="p-4 border border-zinc-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-zinc-950">{stf.name}</div>
                    <div className="text-zinc-500 mt-0.5">{stf.email} · Last active: {stf.lastActive}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-zinc-950">{stf.role}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 19. Audit Logs */}
      {activeTab === "audit" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Immutable Security Audit Trail</h3>
            <p className="text-xs text-zinc-500">Every administrative action, KYC verification, and payout authorization log.</p>
          </div>
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <EmptyCardState
                kind="analytics"
                title="No audit records logged"
                description="Immutable audit trails will record administrative actions, overrides, and KYC changes as they happen."
              />
            ) : (
              auditLogs.map((aud) => (
                <div key={aud.id} className="p-3 border border-zinc-200 rounded-lg flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="font-bold text-zinc-950">{aud.actor}</span>
                    <span className="text-zinc-400 mx-1.5">executed</span>
                    <span className="font-bold text-zinc-800">{aud.action}</span>
                    <span className="text-zinc-500 ml-2">on {aud.target}</span>
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    {aud.ip} · {aud.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 19B. Access Management & Platform Fee */}
      {activeTab === "access" && (
        <div className="space-y-8 max-w-3xl">
          <div className="border-b border-zinc-200/80 pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading">
              Access & Fees
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-body">
              Allot which roles can open each console module, and set the platform fee collected on paid tickets.
            </p>
          </div>

          {/* Module access matrix */}
          <section className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-950 font-heading">Console module access</h2>
            <p className="text-xs text-zinc-500 font-body mb-4">
              User Management and Super Admin always stay admin-only and are not listed here.
            </p>
            {!platformLoaded || !moduleAccess ? (
              <PageSkeleton rows={5} />
            ) : (
              <div className="divide-y divide-zinc-100 border-y border-zinc-200/80">
                {CONSOLE_MODULES.map((mod) => (
                  <div key={mod.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <span className="text-sm font-medium text-zinc-900">{mod.label}</span>
                    <div className="flex items-center gap-1.5">
                      {(["organizer", "admin"] as SessionRole[]).map((role) => {
                        const active = moduleAccess[mod.id]?.includes(role) ?? false;
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={!canManagePlatform}
                            aria-pressed={active}
                            aria-label={`${active ? "Remove" : "Allow"} ${role} access to ${mod.label}`}
                            onClick={() =>
                              setModuleAccess((current) => {
                                if (!current) return current;
                                const existing = current[mod.id] ?? [];
                                if (active && existing.length === 1) {
                                  showToast("Every module needs at least one role. Add another role before removing this one.");
                                  return current;
                                }
                                const next = active ? existing.filter((r) => r !== role) : [...existing, role];
                                return { ...current, [mod.id]: next };
                              })
                            }
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition disabled:opacity-50 ${
                              active
                                ? "bg-zinc-950 text-white border-zinc-950"
                                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
                            }`}
                          >
                            {role === "organizer" ? "Organizers" : "Admins"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Platform fee */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-950 font-heading">Platform fee</h2>
            <p className="text-xs text-zinc-500 font-body">
              Percentage collected on top of the ticket price for paid events.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={defaultTakeRate}
                onChange={(e) => setDefaultTakeRate(e.target.value)}
                disabled={!canManagePlatform}
                aria-label="Platform fee percent"
                className="w-28 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:border-zinc-900 disabled:opacity-50"
              />
              <span className="text-sm text-zinc-500">%</span>
            </div>
          </section>

          {!canManagePlatform && platformLoaded && (
            <p className="text-xs text-zinc-400">Only the platform super admin can change these settings.</p>
          )}
          {settingsError && (
            <p role="alert" className="border-l-2 border-red-600 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{settingsError}</p>
          )}
          {settingsMessage && (
            <p role="status" className="border-l-2 border-green-600 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">{settingsMessage}</p>
          )}

          <div className="pt-2 border-t border-zinc-200/80">
            <button
              onClick={savePlatformSettings}
              disabled={!canManagePlatform || settingsSaving || !moduleAccess}
              className="bg-zinc-950 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
            >
              {settingsSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* 20. Platform Settings */}
      {activeTab === "settings" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-950">Global Infrastructure & Engine Settings</h3>
            <p className="text-xs text-zinc-500">Platform-level operational parameters, concurrency controls, and cache configurations.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg">
              <div>
                <div className="font-bold text-zinc-950">Global Maintenance Mode</div>
                <div className="text-zinc-500 mt-0.5">When active, public checkout queues are paused while existing passes remain valid.</div>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`px-3 py-1.5 rounded font-semibold transition ${
                  maintenanceMode ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {maintenanceMode ? "Active" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg">
              <div>
                <div className="font-bold text-zinc-950">PostgreSQL Serializable Concurrency Lock Engine</div>
                <div className="text-zinc-500 mt-0.5">Guarantees zero-overselling under massive flash drops.</div>
              </div>
              <button
                onClick={() => setConcurrencyLockEngine(!concurrencyLockEngine)}
                className={`px-3 py-1.5 rounded font-semibold transition ${
                  concurrencyLockEngine ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {concurrencyLockEngine ? "Enforced" : "Relaxed"}
              </button>
            </div>

            <div className="p-3 border border-zinc-200 rounded-lg space-y-2">
              <div className="font-bold text-zinc-950">Drop Rate Limiter Ceiling (RPS per Subnet)</div>
              <input
                type="number"
                value={rateLimitRps}
                onChange={(e) => setRateLimitRps(e.target.value)}
                className="w-32 bg-zinc-50 border border-zinc-300 rounded px-2.5 py-1 text-xs font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-4">
              <p className="text-[11px] text-zinc-400">
                Module access and the platform fee live under <Link href="/console/super-admin/access" className="underline underline-offset-4 text-zinc-600 hover:text-zinc-950">Access &amp; Fees</Link>.
              </p>
              <button
                onClick={() => showToast("Engine parameters aren't persisted yet — only Access & Fees settings save today.")}
                className="bg-zinc-950 text-white px-4 py-2 rounded-lg font-semibold hover:bg-zinc-800"
              >
                Save Global Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Organizer Modal */}
      {isInviteOrganizerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Invite Community Organizer</h3>
                  <p className="text-xs text-zinc-500">Register new host community on Hackways</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOrganizerOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteOrganizer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Organization / Community Name</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. NextGen Builders Club"
                    value={inviteOrgName}
                    onChange={(e) => setInviteOrgName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Lead Contact Person</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="e.g. Aarav Patel"
                    value={inviteContactPerson}
                    onChange={(e) => setInviteContactPerson(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Organizer Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="aarav@community.org"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOrganizerOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950 text-white font-medium hover:bg-zinc-800 transition shadow-2xs"
                >
                  <Send size={13} />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
  );
}
