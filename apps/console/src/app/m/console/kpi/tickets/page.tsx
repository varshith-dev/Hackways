"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Ticket, ShoppingBag, ChevronRight, Users } from "lucide-react";
import { getAllAttendees, getAllOrders, getStoredEvents } from "@/lib/api";
import { EventItem } from "@/lib/types";

export default function MobileTicketsDetailPage() {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    setAttendees(getAllAttendees());
    setOrders(getAllOrders());
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
  }, []);

  const confirmedCount = attendees.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN").length;
  const waitlistCount = attendees.filter((a) => a.status === "WAITLIST").length;
  const totalCapacity = events.reduce((sum, e) => {
    const tierCap = e.tiers?.reduce((ts, t) => ts + (t.total_capacity || 0), 0) || 0;
    return sum + (tierCap || e.total_capacity || 0);
  }, 0);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 py-3.5 flex items-center justify-between">
        <Link
          href="/m/console/kpi"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition"
        >
          <ArrowLeft size={16} />
          <span>Analytics</span>
        </Link>
        <span className="text-xs font-bold text-zinc-950">Tickets Sold</span>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-5 pb-16 max-w-md mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Tickets & Orders</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Ticket issuance, tier breakdown, and order velocity.
          </p>
        </div>

        {/* 3 Metric Summary Pills */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3.5 rounded-2xl bg-zinc-100/80 text-center">
            <span className="text-[11px] text-zinc-500 block font-medium">Confirmed</span>
            <span className="text-xl font-bold text-zinc-950 tabular-nums">{confirmedCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-100/80 text-center">
            <span className="text-[11px] text-zinc-500 block font-medium">Waitlist</span>
            <span className="text-xl font-bold text-zinc-950 tabular-nums">{waitlistCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-100/80 text-center">
            <span className="text-[11px] text-zinc-500 block font-medium">Total Cap</span>
            <span className="text-xl font-bold text-zinc-950 tabular-nums">{totalCapacity}</span>
          </div>
        </div>

        {/* Jump to Orders Ledger */}
        <Link
          href="/m/console/orders"
          className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 transition"
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-zinc-400" />
            <div>
              <span className="text-xs font-bold block">Orders Ledger</span>
              <span className="text-[11px] text-zinc-400">View customer receipts & refund orders</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-400" />
        </Link>

        {/* Tickets Per Event Breakdown */}
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
            Ticket Sales by Event
          </h2>
          {events.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
              No events found.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => {
                const eventAttendees = attendees.filter((a) => a.eventId === ev.id);
                const cap = ev.tiers?.reduce((s, t) => s + (t.total_capacity || 0), 0) || ev.total_capacity || 1;
                const pct = Math.min(100, Math.round((eventAttendees.length / cap) * 100));

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-zinc-950 block truncate">
                        {ev.title}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {eventAttendees.length} / {cap} tickets sold
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-900 tabular-nums shadow-xs">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
