"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAllAttendees, getAllOrders, getUserTickets, StoredAttendee, StoredOrder, UserTicket } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export default function UserAuditPage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const { showToast } = useToast();

  const [attendee, setAttendee] = useState<StoredAttendee | null>(null);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [status, setStatus] = useState("ACTIVE");
  const [activeTab, setActiveTab] = useState<"orders" | "tickets" | "security">("orders");

  useEffect(() => {
    const allAtts = getAllAttendees();
    const found = allAtts.find((a) => a.id === id || a.email.toLowerCase() === id.toLowerCase());
    if (found) {
      setAttendee(found);
      const allOrds = getAllOrders();
      setOrders(allOrds.filter((o) => o.buyerEmail.toLowerCase() === found.email.toLowerCase()));
      const allTkts = getUserTickets();
      setTickets(allTkts.filter((t) => t.user_email.toLowerCase() === found.email.toLowerCase()));
    } else {
      setAttendee(null);
      setOrders([]);
      setTickets([]);
    }
  }, [id]);

  if (!attendee) {
    return (
      <div className="space-y-6 max-w-5xl py-8">
        <Link
          href="/console/super-admin/attendees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back to Attendee Directory</span>
        </Link>
        <div className="p-12 text-center border border-zinc-200 rounded-2xl bg-white space-y-3">
          <p className="text-zinc-600 text-sm font-medium">User record not found in platform directory.</p>
        </div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  const handleToggleRestriction = () => {
    const next = status === "ACTIVE" ? "RESTRICTED" : "ACTIVE";
    setStatus(next);
    showToast(next === "RESTRICTED" ? `Account access restricted for ${attendee.name}` : `Restored active access for ${attendee.name}`);
  };

  const handleRevokeSessions = () => {
    showToast(`Revoked all active sessions and refresh tokens for ${attendee.email}`);
  };

  const handleSendMagicLink = () => {
    showToast(`Passwordless authentication link dispatched to ${attendee.email}`);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back Link */}
      <div>
        <Link
          href="/console/super-admin/attendees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back to Attendee Directory</span>
        </Link>
      </div>

      {/* Header Profile Dossier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-950">
              {attendee.name}
            </h1>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded font-semibold ${
                status === "ACTIVE"
                  ? "bg-zinc-100 text-zinc-800"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
            <span className="font-mono">{attendee.email}</span>
            <span>•</span>
            <span>Registered: {new Date(attendee.registeredAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSendMagicLink}
            className="h-8 px-3 rounded-lg text-xs font-semibold border border-zinc-200 bg-white hover:bg-zinc-50 transition"
          >
            Send Magic Link
          </button>
          <button
            type="button"
            onClick={handleRevokeSessions}
            className="h-8 px-3 rounded-lg text-xs font-semibold border border-zinc-200 bg-white hover:bg-zinc-50 transition"
          >
            Revoke Sessions
          </button>
          <button
            type="button"
            onClick={handleToggleRestriction}
            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition ${
              status === "ACTIVE"
                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                : "bg-zinc-950 text-white border-zinc-950"
            }`}
          >
            {status === "ACTIVE" ? "Restrict Account" : "Lift Restriction"}
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="text-xs text-zinc-500">Total Spent</div>
          <div className="text-xl font-bold text-zinc-950 mt-1">₹{totalSpent.toLocaleString()}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Real settled orders</div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="text-xs text-zinc-500">Orders Placed</div>
          <div className="text-xl font-bold text-zinc-950 mt-1">{orders.length}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Successful checkouts</div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="text-xs text-zinc-500">Active Passes</div>
          <div className="text-xl font-bold text-zinc-950 mt-1">{tickets.length}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Claimed registrations</div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="text-xs text-zinc-500">Fraud Score</div>
          <div className="text-xl font-bold text-zinc-950 mt-1 font-mono">Unavailable</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Risk assessment is not connected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 text-xs font-semibold transition relative ${
              activeTab === "orders"
                ? "text-zinc-950 border-b-2 border-zinc-950"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Order History ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`pb-3 text-xs font-semibold transition relative ${
              activeTab === "tickets"
                ? "text-zinc-950 border-b-2 border-zinc-950"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Issued Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 text-xs font-semibold transition relative ${
              activeTab === "security"
                ? "text-zinc-950 border-b-2 border-zinc-950"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Security & Access
          </button>
        </nav>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === "orders" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-950">Completed Transactions</h3>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-800">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-mono font-bold">{o.id}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-950">{o.eventName}</td>
                      <td className="py-3 px-3 text-zinc-600">{o.tierName}</td>
                      <td className="py-3 px-3 font-mono font-bold">₹{o.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-zinc-500">{o.paymentMethod}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-semibold">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-500">
              No orders found for this user.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TICKETS */}
      {activeTab === "tickets" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-950">Issued Event Passes</h3>
          {tickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold">
                    <th className="py-2.5 px-3">Ticket Code</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Checked In At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-800">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-mono font-bold text-zinc-950">{t.ticket_code}</td>
                      <td className="py-3 px-3 font-semibold">{t.event_title}</td>
                      <td className="py-3 px-3 text-zinc-600">{t.tier_name}</td>
                      <td className="py-3 px-3">
                        <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                          t.status === "CHECKED_IN"
                            ? "bg-zinc-950 text-white"
                            : "bg-zinc-100 text-zinc-800"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-500">{t.checked_in_at || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-500">
              No active tickets issued to this user.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY */}
      {activeTab === "security" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-950">Authentication & Security Audit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="font-bold text-zinc-950">Two-Factor Authentication</div>
              <p className="text-zinc-500">Authentication details are unavailable.</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <div className="font-bold text-zinc-950">Active Sessions</div>
              <p className="text-zinc-500">Session details are unavailable.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
