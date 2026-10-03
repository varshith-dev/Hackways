"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Logo3D from "@/components/ui/Logo3D";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  getManagedUserById,
  ManagedUser,
  saveUserOverride,
  addUserNote,
  addUserCommunication,
} from "../data/userData";
import {
  ArrowLeft,
  Copy,
  Check,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Send,
  UserX,
  UserCheck,
  RotateCcw,
  FileText,
  AlertCircle,
  Laptop,
} from "lucide-react";

export type ProfileSubTab =
  | "overview"
  | "events"
  | "tickets"
  | "orders"
  | "payments"
  | "refunds"
  | "activity"
  | "sessions"
  | "devices"
  | "notifications"
  | "support"
  | "security"
  | "history";

interface SubTabItem {
  id: ProfileSubTab;
  label: string;
}

const PROFILE_SUB_TABS: SubTabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "tickets", label: "Tickets" },
  { id: "orders", label: "Orders" },
  { id: "payments", label: "Payments" },
  { id: "refunds", label: "Refunds" },
  { id: "activity", label: "Activity" },
  { id: "sessions", label: "Sessions" },
  { id: "devices", label: "Devices" },
  { id: "notifications", label: "Notifications" },
  { id: "support", label: "Notes" },
  { id: "security", label: "Security" },
  { id: "history", label: "History" },
];

export default function UserDetailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const rawId = (params?.id as string) || "";
  const userId = decodeURIComponent(rawId);

  const initialTab = (searchParams.get("tab") as ProfileSubTab) || "overview";
  const [activeTab, setActiveTab] = useState<ProfileSubTab>(initialTab);
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Form states
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<"INTERNAL" | "SUPPORT" | "ACCOUNT" | "MODERATION">("INTERNAL");
  const [commChannel, setCommChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [commSubject, setCommSubject] = useState("");
  const [commMessage, setCommMessage] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const found = getManagedUserById(userId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(found);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
  }, [userId, dataVersion]);

  const handleTabChange = (tabId: ProfileSubTab) => {
    setActiveTab(tabId);
    router.replace(`/console/users/${encodeURIComponent(userId)}?tab=${tabId}`, { scroll: false });
  };

  const handleCopy = (text: string, isId = false) => {
    navigator.clipboard.writeText(text);
    if (isId) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } else {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 1500);
    }
  };

  const handleStatusChange = (newStatus: ManagedUser["accountStatus"]) => {
    if (!user) return;
    saveUserOverride(user.id, { accountStatus: newStatus });
    setNotification(`Status changed to ${newStatus}`);
    setTimeout(() => setNotification(null), 2500);
    setDataVersion((v) => v + 1);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !noteContent.trim()) return;
    addUserNote(user.id, {
      author: "Admin",
      category: noteCategory,
      content: noteContent.trim(),
    });
    setNoteContent("");
    setNotification("Note saved");
    setTimeout(() => setNotification(null), 2500);
    setDataVersion((v) => v + 1);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commMessage.trim()) return;
    addUserCommunication(user.id, {
      channel: commChannel,
      subject: commSubject || `${commChannel} Notice`,
      content: commMessage.trim(),
      status: "SENT",
    });
    setCommSubject("");
    setCommMessage("");
    setNotification(`Message sent via ${commChannel}`);
    setTimeout(() => setNotification(null), 2500);
    setDataVersion((v) => v + 1);
  };

  const handleRefund = async (orderId: string) => {
    if (!user) return;
    try {
      const res = await fetch("/api/v1/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason: "Admin reversal" }),
      });
      if (res.ok) {
        setNotification(`Order ${orderId} refunded`);
        const updated = user.orders.map((o) =>
          o.id === orderId ? { ...o, status: "REFUNDED" as const } : o
        );
        saveUserOverride(user.id, { orders: updated });
        setDataVersion((v) => v + 1);
      }
    } catch {
      setNotification("Refund failed");
    } finally {
      setTimeout(() => setNotification(null), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-6 py-16 mx-auto w-full max-w-3xl">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold text-zinc-950">User not found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">No record matching {userId}</p>
        <Link
          href="/console/users"
          className="px-4 py-1.5 rounded-full text-xs font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  // Get monogram for avatar
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">
      {/* 1. TOP APP BAR */}
      <header className="h-14 border-b border-zinc-200 bg-white px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Logo3D />
          <span className="text-zinc-300">/</span>
          <Link
            href="/console/users"
            className="text-xs text-zinc-500 hover:text-zinc-900 transition font-medium"
          >
            Users
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-xs font-semibold text-zinc-950">{user.name}</span>
        </div>

        <Link
          href="/console/users"
          className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={12} />
          <span>Back to Users</span>
        </Link>
      </header>

      {/* TOAST FEEDBACK */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 bg-zinc-950 text-white px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. USER PROFILE HERO */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-8 border-b border-zinc-200">
          {/* User info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-base tracking-wider shrink-0 select-none">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-zinc-950 tracking-tight">{user.name}</h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    user.accountStatus === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : user.accountStatus === "BANNED"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {user.accountStatus.toLowerCase()}
                </span>
                {user.accountType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600">
                    {user.accountType.toLowerCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <a href={`mailto:${user.email}`} className="hover:text-zinc-900 transition">
                  {user.email}
                </a>

                {user.phone && user.phone !== "—" && (
                  <>
                    <span className="text-zinc-300">·</span>
                    <a href={`tel:${user.phone}`} className="hover:text-zinc-900 transition">
                      {user.phone}
                    </a>
                  </>
                )}

                <span className="text-zinc-300">·</span>
                <button
                  onClick={() => handleCopy(user.id, true)}
                  className="hover:text-zinc-900 font-mono text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  title="Copy User ID"
                >
                  <span>{user.id}</span>
                  {copiedId ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                </button>

                <span className="text-zinc-300">·</span>
                <span>
                  Joined {new Date(user.joinedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTabChange("notifications")}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              Send message
            </button>

            <button
              onClick={() => handleTabChange("support")}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50 transition cursor-pointer"
            >
              Add note
            </button>

            {user.accountStatus === "ACTIVE" ? (
              <button
                onClick={() => handleStatusChange("SUSPENDED")}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
              >
                Suspend
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
              >
                Activate
              </button>
            )}

            {user.accountStatus !== "BANNED" ? (
              <button
                onClick={() => handleStatusChange("BANNED")}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Ban
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
              >
                Unban
              </button>
            )}
          </div>
        </div>

        {/* 3. METRIC STRIP (CLEAN, NO FAKE DELTAS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 py-4 border-b border-zinc-200">
          <div className="py-1 sm:px-4 space-y-0.5">
            <div className="text-xs text-zinc-500">Total spend</div>
            <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
              ₹{user.totalSpend.toLocaleString()}
            </div>
          </div>

          <div className="py-1 sm:px-4 space-y-0.5">
            <div className="text-xs text-zinc-500">Orders</div>
            <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
              {user.orders.length}
            </div>
          </div>

          <div className="py-1 sm:px-4 space-y-0.5">
            <div className="text-xs text-zinc-500">Passes</div>
            <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
              {user.ticketsPurchasedCount}
            </div>
          </div>

          <div className="py-1 sm:px-4 space-y-0.5">
            <div className="text-xs text-zinc-500">Events attended</div>
            <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
              {user.eventsAttendedCount}
            </div>
          </div>
        </div>

        {/* 4. UNDERLINE SUB-TABS */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-zinc-200 pt-1">
          {PROFILE_SUB_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            let count: number | null = null;
            if (tab.id === "events") count = user.events.length;
            if (tab.id === "tickets") count = user.events.length;
            if (tab.id === "orders") count = user.orders.length;
            if (tab.id === "support") count = user.notes.length;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-3 text-xs transition relative whitespace-nowrap cursor-pointer ${
                  isActive ? "text-zinc-950 font-semibold" : "text-zinc-500 hover:text-zinc-900 font-normal"
                }`}
              >
                <span>{tab.label}</span>
                {count !== null && count > 0 && (
                  <span className="ml-1.5 text-[10px] text-zinc-400 font-mono">
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* 5. TAB CONTENT CANVAS */}
        <div className="py-8">
          {/* ========================================== */}
          {/* OVERVIEW TAB */}
          {/* ========================================== */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Events & Orders */}
              <div className="space-y-6">
                {/* Events */}
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Events</h2>
                    <button
                      onClick={() => handleTabChange("events")}
                      className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
                    >
                      View all ({user.events.length})
                    </button>
                  </div>

                  {user.events.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                      No event registrations
                    </div>
                  ) : (
                    <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                      {user.events.map((ev, i) => (
                        <div key={i} className="p-3.5 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-950">{ev.eventTitle}</p>
                            <p className="text-zinc-500 text-[11px] mt-0.5">
                              {ev.ticketTier} · <span className="font-mono">{ev.ticketCode}</span>
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              ev.checkInStatus === "CHECKED_IN"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {ev.checkInStatus === "CHECKED_IN" ? "Checked in" : "Unscanned"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orders */}
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Orders</h2>
                    <button
                      onClick={() => handleTabChange("orders")}
                      className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
                    >
                      View all ({user.orders.length})
                    </button>
                  </div>

                  {user.orders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                      No orders placed
                    </div>
                  ) : (
                    <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                      {user.orders.map((ord) => (
                        <div key={ord.id} className="p-3.5 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-950">{ord.eventName}</p>
                            <p className="text-zinc-500 text-[11px] mt-0.5">
                              {new Date(ord.createdAt).toLocaleDateString()} · {ord.tierName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-950 tabular-nums">₹{ord.amount.toLocaleString()}</p>
                            <span className="text-[10px] text-zinc-500">{ord.status.toLowerCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Details & Notes */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider pb-3">Details</h2>
                  <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                    <div className="p-3 flex justify-between">
                      <span className="text-zinc-500">Email</span>
                      <span className="font-medium text-zinc-900">{user.email}</span>
                    </div>
                    {user.phone && user.phone !== "—" && (
                      <div className="p-3 flex justify-between">
                        <span className="text-zinc-500">Phone</span>
                        <span className="font-medium text-zinc-900">{user.phone}</span>
                      </div>
                    )}
                    <div className="p-3 flex justify-between">
                      <span className="text-zinc-500">Account status</span>
                      <span className="font-medium text-zinc-900">{user.accountStatus}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-zinc-500">Verification</span>
                      <span className="font-medium text-zinc-900">{user.verificationStatus}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-zinc-500">Registered on</span>
                      <span className="font-medium text-zinc-900">
                        {new Date(user.joinedDate).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes preview */}
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Notes</h2>
                    <button
                      onClick={() => handleTabChange("support")}
                      className="text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
                    >
                      Manage ({user.notes.length})
                    </button>
                  </div>

                  {user.notes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                      No internal notes recorded
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {user.notes.slice(0, 3).map((n) => (
                        <div key={n.id} className="p-3 rounded-lg border border-zinc-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span className="font-medium text-zinc-700">{n.category.toLowerCase()} · {n.author}</span>
                            <span>{new Date(n.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-zinc-800">{n.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TICKETS TAB (NO FAKE LABELS) */}
          {/* ========================================== */}
          {activeTab === "tickets" && (
            <div className="space-y-4">
              {user.events.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                  No tickets found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.events.map((ev, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-zinc-200 bg-white space-y-4 hover:border-zinc-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-zinc-500">{ev.ticketTier}</p>
                          <h3 className="text-sm font-bold text-zinc-950 mt-0.5">{ev.eventTitle}</h3>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            ev.checkInStatus === "CHECKED_IN"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {ev.checkInStatus === "CHECKED_IN" ? "Checked in" : "Valid"}
                        </span>
                      </div>

                      {/* Ticket Code Box */}
                      <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-zinc-900 tracking-wider">
                          {ev.ticketCode}
                        </span>
                        <button
                          onClick={() => handleCopy(ev.ticketCode)}
                          className="text-xs text-zinc-500 hover:text-zinc-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode === ev.ticketCode ? (
                            <span className="text-emerald-600">Copied</span>
                          ) : (
                            <span>Copy</span>
                          )}
                        </button>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                        <span>{new Date(ev.date).toLocaleDateString()}</span>
                        <Link
                          href={`/events/${ev.eventId}`}
                          target="_blank"
                          className="text-zinc-700 hover:text-zinc-950 font-medium inline-flex items-center gap-1"
                        >
                          <span>Event</span>
                          <ExternalLink size={11} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* EVENTS TAB (STRICT 16:9 & 1:1 BANNERS) */}
          {/* ========================================== */}
          {activeTab === "events" && (
            <div className="space-y-4">
              {user.events.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                  No registered events
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.events.map((ev, i) => (
                    <div
                      key={i}
                      className="border border-zinc-200 rounded-xl overflow-hidden bg-white hover:border-zinc-300 transition flex flex-col justify-between"
                    >
                      {/* 16:9 Banner */}
                      {ev.banner_url && (
                        <div className="aspect-[16/9] w-full bg-zinc-100 overflow-hidden relative">
                          <img
                            src={ev.banner_url}
                            alt={ev.eventTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-zinc-500">{ev.ticketTier}</p>
                            <h3 className="text-sm font-bold text-zinc-950 mt-0.5">{ev.eventTitle}</h3>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              ev.checkInStatus === "CHECKED_IN"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {ev.checkInStatus === "CHECKED_IN" ? "Checked in" : "Unscanned"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                          <span className="font-mono text-zinc-600">{ev.ticketCode}</span>
                          <Link
                            href={`/events/${ev.eventId}`}
                            target="_blank"
                            className="text-zinc-700 hover:text-zinc-950 font-medium inline-flex items-center gap-1"
                          >
                            <span>View details</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* ORDERS TAB */}
          {/* ========================================== */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {user.orders.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                  No orders recorded
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                      <tr>
                        <th className="py-3 px-4">Order</th>
                        <th className="py-3 px-4">Event</th>
                        <th className="py-3 px-4">Tier</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {user.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-zinc-50/70 transition">
                          <td className="py-3 px-4 font-mono font-medium text-zinc-700">{ord.id}</td>
                          <td className="py-3 px-4 font-medium text-zinc-950">{ord.eventName}</td>
                          <td className="py-3 px-4 text-zinc-500">{ord.tierName}</td>
                          <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">₹{ord.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-zinc-500 tabular-nums">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                ord.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {ord.status.toLowerCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {ord.status === "COMPLETED" && (
                              <button
                                onClick={() => handleRefund(ord.id)}
                                className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-zinc-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* PAYMENTS & REFUNDS TAB */}
          {/* ========================================== */}
          {(activeTab === "payments" || activeTab === "refunds") && (
            <div className="space-y-4">
              {user.orders.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                  No payment transactions recorded
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                  {user.orders.map((ord) => (
                    <div key={ord.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-zinc-950">{ord.eventName}</p>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                          Tx: <span className="font-mono">{ord.transactionId}</span> · {new Date(ord.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-zinc-950 tabular-nums">₹{ord.amount.toLocaleString()}</p>
                        <span className="text-[10px] text-zinc-500">{ord.status.toLowerCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* ACTIVITY TAB */}
          {/* ========================================== */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              {user.activities.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                  No activity recorded
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                  {user.activities.map((act) => (
                    <div key={act.id} className="p-3.5 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-zinc-950">{act.title}</p>
                        <p className="text-zinc-500 text-[11px] mt-0.5">{act.detail}</p>
                      </div>
                      <span className="text-zinc-400 text-[11px] tabular-nums shrink-0">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* SESSIONS & DEVICES TAB */}
          {/* ========================================== */}
          {(activeTab === "sessions" || activeTab === "devices") && (
            <div className="space-y-3">
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                {user.sessions.map((sess) => (
                  <div key={sess.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-950">{sess.device} — {sess.browser}</p>
                      <p className="text-zinc-400 text-[11px] font-mono mt-0.5">
                        IP: {sess.ipAddress} · {sess.location}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                      {sess.status.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* NOTIFICATIONS TAB */}
          {/* ========================================== */}
          {activeTab === "notifications" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Message Composer */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Send Message</h3>

                <form onSubmit={handleSendMessage} className="space-y-3 border border-zinc-200 rounded-xl p-4">
                  <div className="flex gap-2">
                    {(["EMAIL", "SMS", "WHATSAPP"] as const).map((ch) => (
                      <button
                        type="button"
                        key={ch}
                        onClick={() => setCommChannel(ch)}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          commChannel === ch
                            ? "bg-zinc-950 text-white"
                            : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Subject..."
                    value={commSubject}
                    onChange={(e) => setCommSubject(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-900"
                  />

                  <textarea
                    rows={3}
                    placeholder="Message text..."
                    value={commMessage}
                    onChange={(e) => setCommMessage(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-900"
                  />

                  <button
                    type="submit"
                    className="w-full py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* History */}
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                  Sent Messages ({user.communications.length})
                </h3>

                {user.communications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                    No messages sent yet
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                    {user.communications.map((comm) => (
                      <div key={comm.id} className="p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-950">
                            [{comm.channel}] {comm.subject}
                          </span>
                          <span className="text-zinc-400 text-[11px] tabular-nums">
                            {new Date(comm.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-600">{comm.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* SUPPORT / NOTES TAB */}
          {/* ========================================== */}
          {activeTab === "support" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Note Composer */}
              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Add Note</h3>

                <form onSubmit={handleAddNote} className="space-y-3 border border-zinc-200 rounded-xl p-4">
                  <div className="flex gap-2">
                    {(["INTERNAL", "SUPPORT", "ACCOUNT"] as const).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setNoteCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          noteCategory === cat
                            ? "bg-zinc-950 text-white"
                            : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {cat.toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Write an internal observation..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-900"
                  />

                  <button
                    type="submit"
                    className="w-full py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Save note
                  </button>
                </form>
              </div>

              {/* Notes List */}
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                  Notes ({user.notes.length})
                </h3>

                {user.notes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400 border border-zinc-200 rounded-lg">
                    No notes recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {user.notes.map((n) => (
                      <div key={n.id} className="p-3.5 rounded-lg border border-zinc-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="font-semibold text-zinc-700">{n.category.toLowerCase()} · {n.author}</span>
                          <span>{new Date(n.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-zinc-800">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* SECURITY & HISTORY TAB */}
          {/* ========================================== */}
          {(activeTab === "security" || activeTab === "history") && (
            <div className="max-w-xl space-y-3">
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-950">Password reset</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">Send reset link to {user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      addUserCommunication(user.id, {
                        channel: "EMAIL",
                        subject: "Password Reset Requested",
                        content: "A password reset link was generated by administration.",
                        status: "SENT",
                      });
                      setNotification("Password reset email sent");
                      setTimeout(() => setNotification(null), 2500);
                      setDataVersion((v) => v + 1);
                    }}
                    className="px-3 py-1 rounded-full text-xs font-medium border border-zinc-200 text-zinc-800 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Send link
                  </button>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-950">Account standing</p>
                    <p className="text-zinc-500 text-[11px] mt-0.5">Current: {user.accountStatus.toLowerCase()}</p>
                  </div>
                  <button
                    onClick={() => handleStatusChange(user.accountStatus === "BANNED" ? "ACTIVE" : "BANNED")}
                    className="px-3 py-1 rounded-full text-xs font-medium border border-zinc-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    {user.accountStatus === "BANNED" ? "Unban" : "Ban user"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
