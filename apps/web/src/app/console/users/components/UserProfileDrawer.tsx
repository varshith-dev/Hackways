"use client";

import React, { useState } from "react";
import {
  ManagedUser,
  saveUserOverride,
  addUserNote,
  addUserCommunication,
} from "../data/userData";
import {
  X,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  Ticket,
  DollarSign,
  AlertCircle,
  FileText,
  Lock,
  Send,
  UserX,
  UserCheck,
  RotateCcw,
  Smartphone,
  Laptop,
} from "lucide-react";

interface UserProfileDrawerProps {
  user: ManagedUser | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

export type ProfileSubTab =
  | "overview"
  | "activity"
  | "events"
  | "tickets"
  | "orders"
  | "payments"
  | "refunds"
  | "sessions"
  | "devices"
  | "notifications"
  | "support"
  | "security"
  | "history";

const PROFILE_SUB_TABS: { id: ProfileSubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "events", label: "Events" },
  { id: "tickets", label: "Tickets" },
  { id: "orders", label: "Orders" },
  { id: "payments", label: "Payments" },
  { id: "refunds", label: "Refunds" },
  { id: "sessions", label: "Sessions" },
  { id: "devices", label: "Devices" },
  { id: "notifications", label: "Notifications" },
  { id: "support", label: "Support" },
  { id: "security", label: "Security" },
  { id: "history", label: "History" },
];

export function UserProfileDrawer({ user, onClose, onUserUpdated }: UserProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<ProfileSubTab>("overview");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<"INTERNAL" | "SUPPORT" | "ACCOUNT" | "MODERATION">("INTERNAL");
  const [commChannel, setCommChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP">("EMAIL");
  const [commSubject, setCommSubject] = useState("");
  const [commMessage, setCommMessage] = useState("");
  const [statusActionMessage, setStatusActionMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleStatusChange = (newStatus: ManagedUser["accountStatus"]) => {
    saveUserOverride(user.id, { accountStatus: newStatus });
    setStatusActionMessage(`Account status updated to ${newStatus}`);
    setTimeout(() => setStatusActionMessage(null), 3000);
    onUserUpdated();
  };

  const handleVerificationChange = (newVerif: ManagedUser["verificationStatus"]) => {
    saveUserOverride(user.id, { verificationStatus: newVerif });
    setStatusActionMessage(`Verification status set to ${newVerif}`);
    setTimeout(() => setStatusActionMessage(null), 3000);
    onUserUpdated();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    addUserNote(user.id, {
      author: "Admin",
      category: noteCategory,
      content: noteContent.trim(),
    });
    setNoteContent("");
    onUserUpdated();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commMessage.trim()) return;
    addUserCommunication(user.id, {
      channel: commChannel,
      subject: commSubject || `${commChannel} Notification`,
      content: commMessage.trim(),
      status: "SENT",
    });
    setCommSubject("");
    setCommMessage("");
    setStatusActionMessage(`Message dispatched via ${commChannel}`);
    setTimeout(() => setStatusActionMessage(null), 3000);
    onUserUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col antialiased border-l border-zinc-200">
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-zinc-200 shrink-0 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {user.avatar && <img
                src={user.avatar}
                alt={user.name}
                className="w-14 h-14 rounded-full border border-zinc-200 object-cover bg-zinc-100 shrink-0"
              />}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-950 font-heading tracking-tight">{user.name}</h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      user.accountStatus === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : user.accountStatus === "BANNED"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {user.accountStatus}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                    <ShieldCheck size={11} className="text-zinc-500" />
                    {user.verificationStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {user.email}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">ID: {user.id}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition cursor-pointer"
              aria-label="Close user profile"
            >
              <X size={18} />
            </button>
          </div>

          {statusActionMessage && (
            <div className="mt-3 py-1.5 px-3 rounded-full bg-zinc-950 text-white text-xs inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{statusActionMessage}</span>
            </div>
          )}

          {/* QUICK CAPSULE ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
            {user.accountStatus !== "ACTIVE" && (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                className="px-3.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck size={12} />
                <span>Activate Account</span>
              </button>
            )}

            {user.accountStatus === "ACTIVE" && (
              <button
                onClick={() => handleStatusChange("SUSPENDED")}
                className="px-3.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserX size={12} />
                <span>Suspend</span>
              </button>
            )}

            {user.accountStatus !== "BANNED" ? (
              <button
                onClick={() => handleStatusChange("BANNED")}
                className="px-3.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <AlertCircle size={12} />
                <span>Ban User</span>
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                className="px-3.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Unban</span>
              </button>
            )}

            {user.verificationStatus !== "VERIFIED" && (
              <button
                onClick={() => handleVerificationChange("VERIFIED")}
                className="px-3.5 py-1 rounded-full text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck size={12} />
                <span>Mark Verified</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("notifications")}
              className="px-3.5 py-1 rounded-full text-xs font-medium border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={12} />
              <span>Send Message</span>
            </button>
          </div>
        </div>

        {/* 13 UNDERLINE SUB-TABS */}
        <div className="px-6 border-b border-zinc-200 flex items-center gap-6 overflow-x-auto no-scrollbar shrink-0 bg-white">
          {PROFILE_SUB_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-xs transition relative whitespace-nowrap cursor-pointer ${
                  isActive ? "text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-900 font-medium"
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

        {/* DRAWER CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stat Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 border-y border-zinc-200 py-3">
                <div className="py-2 px-3 space-y-1">
                  <div className="text-[11px] text-zinc-500 font-medium">Total Spend</div>
                  <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
                    ₹{user.totalSpend.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400">Captured GMV</div>
                </div>

                <div className="py-2 px-3 space-y-1">
                  <div className="text-[11px] text-zinc-500 font-medium">Tickets Purchased</div>
                  <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
                    {user.ticketsPurchasedCount}
                  </div>
                  <div className="text-[10px] text-zinc-400">Passes issued</div>
                </div>

                <div className="py-2 px-3 space-y-1">
                  <div className="text-[11px] text-zinc-500 font-medium">Events Attended</div>
                  <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
                    {user.eventsAttendedCount}
                  </div>
                  <div className="text-[10px] text-zinc-400">Door scans verified</div>
                </div>

                <div className="py-2 px-3 space-y-1">
                  <div className="text-[11px] text-zinc-500 font-medium">Orders Count</div>
                  <div className="text-xl font-bold text-zinc-950 font-heading tabular-nums">
                    {user.orders.length}
                  </div>
                  <div className="text-[10px] text-zinc-400">Paid checkouts</div>
                </div>
              </div>

              {/* Personal & Contact Grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Account Particulars
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-zinc-400 text-[11px]">Account Type</span>
                    <p className="font-semibold text-zinc-900">{user.accountType}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-zinc-400 text-[11px]">Primary Phone</span>
                    <p className="font-semibold text-zinc-900">{user.phone}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-zinc-400 text-[11px]">Registration Date</span>
                    <p className="font-semibold text-zinc-900">
                      {new Date(user.joinedDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200 space-y-1">
                    <span className="text-zinc-400 text-[11px]">Last Activity Trace</span>
                    <p className="font-semibold text-zinc-900">
                      {new Date(user.lastActive).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Events List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Registered Events ({user.events.length})
                </h3>
                {user.events.length === 0 ? (
                  <div className="text-xs text-zinc-400 py-6 text-center border border-dashed border-zinc-200 rounded-xl">
                    No event registrations recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden text-xs">
                    {user.events.map((ev, i) => (
                      <div key={i} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition">
                        <div>
                          <p className="font-semibold text-zinc-950">{ev.eventTitle}</p>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Code: {ev.ticketCode}</p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            ev.checkInStatus === "CHECKED_IN"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {ev.checkInStatus === "CHECKED_IN" ? "Checked In" : "Unscanned"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  User Audit Timeline ({user.activities.length})
                </h3>
                <span className="text-[11px] text-zinc-400">Telemetry feed</span>
              </div>
              {user.activities.length === 0 ? (
                <div className="text-xs text-zinc-400 py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                  No activity logs registered for this account.
                </div>
              ) : (
                <div className="space-y-3">
                  {user.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl border border-zinc-200 text-xs flex items-start gap-3 hover:border-zinc-300 transition"
                    >
                      <span className="w-2 h-2 rounded-full bg-zinc-950 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-950">{act.title}</span>
                          <span className="text-[11px] text-zinc-400 tabular-nums">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[11px] mt-0.5">{act.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. EVENTS */}
          {activeTab === "events" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                Events Ledger ({user.events.length})
              </h3>
              {user.events.length === 0 ? (
                <div className="text-xs text-zinc-400 py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                  No event records found.
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs divide-y divide-zinc-100">
                  {user.events.map((ev, i) => (
                    <div key={i} className="p-3.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-950">{ev.eventTitle}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Tier: {ev.ticketTier}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                          {ev.status}
                        </span>
                        <p className="text-[10px] text-zinc-400 font-mono">{ev.ticketCode}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. TICKETS */}
          {activeTab === "tickets" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                Issued Passes & Credentials ({user.events.length})
              </h3>
              {user.events.length === 0 ? (
                <div className="text-xs text-zinc-400 py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                  No ticket credentials issued to this user.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {user.events.map((ev, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-950">{ev.ticketTier}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          VALID
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">{ev.eventTitle}</p>
                      <div className="pt-2 border-t border-zinc-100 font-mono text-[10px] text-zinc-400 flex justify-between">
                        <span>CODE</span>
                        <span className="font-bold text-zinc-800">{ev.ticketCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                Orders History ({user.orders.length})
              </h3>
              {user.orders.length === 0 ? (
                <div className="text-xs text-zinc-400 py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                  No orders completed by this account.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden text-xs">
                  {user.orders.map((ord) => (
                    <div key={ord.id} className="p-3.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-950">{ord.eventName}</p>
                        <p className="text-[11px] text-zinc-500">
                          {ord.tierName} · {ord.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-zinc-950 tabular-nums">₹{ord.amount.toLocaleString()}</p>
                        <span className="text-[10px] text-emerald-600 font-semibold">{ord.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. PAYMENTS & REFUNDS */}
          {(activeTab === "payments" || activeTab === "refunds") && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                Financial Transactions & Reversals
              </h3>
              {user.orders.length === 0 ? (
                <div className="text-xs text-zinc-400 py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                  No payment transactions recorded for this user.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden text-xs">
                  {user.orders.map((ord) => (
                    <div key={ord.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-zinc-950">Tx: {ord.transactionId}</p>
                        <p className="text-[11px] text-zinc-400">{ord.eventName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-zinc-950 tabular-nums">₹{ord.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">CLEARED</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. SESSIONS & DEVICES */}
          {(activeTab === "sessions" || activeTab === "devices") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Active Client Sessions
                </h3>
                <button
                  onClick={() => {
                    saveUserOverride(user.id, {
                      sessions: user.sessions.map((s) => ({ ...s, status: "REVOKED" })),
                    });
                    setStatusActionMessage("All sessions terminated");
                    onUserUpdated();
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-medium border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  Revoke All Sessions
                </button>
              </div>

              <div className="space-y-2.5">
                {user.sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 rounded-xl border border-zinc-200 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Laptop size={16} className="text-zinc-400" />
                      <div>
                        <p className="font-bold text-zinc-950">
                          {sess.device} ({sess.os})
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">IP: {sess.ipAddress} · {sess.location}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        sess.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {sess.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. NOTIFICATIONS & COMMUNICATION */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              {/* Dispatch New Message Form */}
              <form onSubmit={handleSendMessage} className="p-4 rounded-xl border border-zinc-200 space-y-3 bg-zinc-50/50">
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Send Direct User Communication
                </h4>

                <div className="flex items-center gap-2">
                  {(["EMAIL", "WHATSAPP", "PUSH", "SMS"] as const).map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setCommChannel(ch)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                        commChannel === ch ? "bg-zinc-950 text-white" : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Subject line..."
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-900"
                />

                <textarea
                  rows={3}
                  placeholder={`Type your ${commChannel} message to ${user.name}...`}
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-900"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    <span>Dispatch Message</span>
                  </button>
                </div>
              </form>

              {/* Communication History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Communication History ({user.communications.length})
                </h4>
                {user.communications.length === 0 ? (
                  <div className="text-xs text-zinc-400 py-6 text-center border border-dashed border-zinc-200 rounded-xl">
                    No communication dispatched to this user.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {user.communications.map((comm) => (
                      <div key={comm.id} className="p-3 rounded-xl border border-zinc-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-950">
                            [{comm.channel}] {comm.subject}
                          </span>
                          <span className="text-[10px] text-zinc-400 tabular-nums">
                            {new Date(comm.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-zinc-600 text-[11px]">{comm.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. SUPPORT & NOTES */}
          {activeTab === "support" && (
            <div className="space-y-6">
              <form onSubmit={handleAddNote} className="p-4 rounded-xl border border-zinc-200 space-y-3 bg-zinc-50/50">
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Add Internal Team Note
                </h4>
                <div className="flex items-center gap-2">
                  {(["INTERNAL", "SUPPORT", "MODERATION", "ACCOUNT"] as const).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setNoteCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                        noteCategory === cat
                          ? "bg-zinc-950 text-white"
                          : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  placeholder="Record an internal note about this user..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-900"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <FileText size={12} />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                  Recorded Notes ({user.notes.length})
                </h4>
                {user.notes.length === 0 ? (
                  <div className="text-xs text-zinc-400 py-6 text-center border border-dashed border-zinc-200 rounded-xl">
                    No notes recorded for this user.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {user.notes.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl border border-zinc-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="font-semibold text-zinc-700">{n.category} · {n.author}</span>
                          <span>{new Date(n.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-zinc-900">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. SECURITY & AUDIT */}
          {(activeTab === "security" || activeTab === "history") && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-heading">
                Security & Credential Operations
              </h3>

              <div className="p-4 rounded-xl border border-zinc-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-zinc-950">Password & Authentication</p>
                    <p className="text-zinc-500 text-[11px]">Send password reset authorization email</p>
                  </div>
                  <button
                    onClick={() => {
                      addUserCommunication(user.id, {
                        channel: "EMAIL",
                        subject: "Security Alert: Password Reset Requested",
                        content: "A password reset link was triggered by platform administration.",
                        status: "SENT",
                      });
                      setStatusActionMessage("Password reset email dispatched to user");
                      setTimeout(() => setStatusActionMessage(null), 3000);
                      onUserUpdated();
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 hover:bg-zinc-50 text-zinc-800 transition cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-zinc-950">Identity Verification</p>
                    <p className="text-zinc-500 text-[11px]">Current Status: {user.verificationStatus}</p>
                  </div>
                  <button
                    onClick={() => handleVerificationChange(user.verificationStatus === "VERIFIED" ? "UNVERIFIED" : "VERIFIED")}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 hover:bg-zinc-50 text-zinc-800 transition cursor-pointer"
                  >
                    Toggle Verification
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
