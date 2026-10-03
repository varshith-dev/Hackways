"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight, Plus } from "lucide-react";
import { getStoredEvents, getAllAttendees, getAllOrders } from "@/lib/api";
import { EventItem } from "@/lib/types";

export default function MobileEventsKpiPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
    setAttendees(getAllAttendees());
    setOrders(getAllOrders());
  }, []);

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
        <span className="text-xs font-bold text-zinc-950">Events Overview</span>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-5 pb-16 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Event Performance</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Individual drop analytics, bookings, and capacities.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-950 text-white text-xs font-semibold whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus size={13} />
            <span>Create</span>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
            No events found.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const evAttendees = attendees.filter((a) => a.eventId === ev.id);
              const evOrders = orders.filter((o) => o.eventId === ev.id);
              const revenue = evOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
              const cap = ev.tiers?.reduce((s, t) => s + (t.total_capacity || 0), 0) || ev.total_capacity || 1;
              const soldPct = Math.min(100, Math.round((evAttendees.length / cap) * 100));

              return (
                <Link
                  key={ev.id}
                  href={`/m/console/events/${encodeURIComponent(ev.slug || ev.id)}/overview`}
                  className="block p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-300 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-zinc-950 truncate">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(ev.start_time || Date.now()).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        • {ev.location || "Venue TBD"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                    <span className="font-semibold text-zinc-900 tabular-nums">
                      {evAttendees.length} / {cap} RSVPs ({soldPct}%)
                    </span>
                    <span className="font-bold text-zinc-950 tabular-nums">
                      ₹{revenue.toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
