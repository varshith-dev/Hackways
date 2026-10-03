"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Ticket, Users, Calendar, TrendingUp, Wallet } from "lucide-react";
import { getStoredEvents, getAllOrders, getAllAttendees, getPlatformMetrics } from "@/lib/api";
import { EventItem } from "@/lib/types";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";
import AnalyticsChart from "./_components/AnalyticsChart";

export default function MobileKpiPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalGmv: 0,
    totalOrders: 0,
    netRevenue: 0,
    platformFee: 0,
  });

  useEffect(() => {
    const evs = getStoredEvents().filter((e) => e.status !== "DELETED");
    setEvents(evs);
    setOrders(getAllOrders());
    setAttendees(getAllAttendees());
    setMetrics(getPlatformMetrics());
  }, []);

  const totalAttendees = attendees.length;
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const attendanceRate = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0;
  const totalCapacity = events.reduce((sum, e) => {
    const tierCap = e.tiers?.reduce((ts, t) => ts + (t.total_capacity || 0), 0) || 0;
    return sum + (tierCap || e.total_capacity || 0);
  }, 0);

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans">
      {/* Universal 3-line Menu Header */}
      <MobileConsoleHeader
        currentTab="kpi"
        title="Analytics"
        subtitle="Organizer Hub"
      />

      {/* Main Content */}
      <main className="p-4 space-y-6 max-w-md mx-auto w-full pb-20">
        {/* Header Title & Period Filter */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Overview</h1>
            <p className="text-xs text-zinc-400">Community, turnout & sales</p>
          </div>
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod("7d")}
              className={`px-3 py-1 rounded-full transition ${
                period === "7d" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => setPeriod("30d")}
              className={`px-3 py-1 rounded-full transition ${
                period === "30d" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => setPeriod("all")}
              className={`px-3 py-1 rounded-full transition ${
                period === "all" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Interactive Bar & Line Chart (Light / Transparent) */}
        <AnalyticsChart period={period} />

        {/* Section 1: Community & Audience */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Community & Audience
            </span>
            <Link
              href="/m/console/kpi/community"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
            <Link
              href="/m/console/kpi/community"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Community Members</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">248</span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +14%
                </span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>

            <Link
              href="/m/console/kpi/community"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Page Impressions</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">1,420</span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>

            <Link
              href="/m/console/kpi/community"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">RSVP Conversion Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">34.2%</span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>
          </div>
        </div>

        {/* Section 2: Attendance & Turnout */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Attendance & Turnout
            </span>
            <Link
              href="/m/console/kpi/attendance"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
            <Link
              href="/m/console/kpi/attendance"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Turnout Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">{attendanceRate}%</span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {checkedInCount} / {totalAttendees} checked in
                </span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>

            <Link
              href="/m/console/kpi/tickets"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Confirmed Passes</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">{orders.length}</span>
                <span className="text-[11px] text-zinc-400 font-medium">of {totalCapacity} cap</span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>
          </div>
        </div>

        {/* Section 3: Sales & Finance Summary */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Sales & Orders
            </span>
            <Link
              href="/m/console/kpi/sales"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
            <Link
              href="/m/console/kpi/sales"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Gross Sales</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">
                  ₹{metrics.totalGmv.toLocaleString()}
                </span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>

            <Link
              href="/m/console/kpi/sales"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Net Revenue</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 tabular-nums">
                  ₹{metrics.netRevenue.toLocaleString()}
                </span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>

            <Link
              href="/m/console/orders"
              className="py-3 px-1 flex items-center justify-between active:bg-zinc-50 transition"
            >
              <span className="text-xs font-semibold text-zinc-800">Orders Placed</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950 tabular-nums">{orders.length}</span>
                <ChevronRight size={14} className="text-zinc-300" />
              </div>
            </Link>
          </div>
        </div>

        {/* Section 4: Event Performance */}
        <section className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Active Events ({events.length})
            </span>
            <Link
              href="/m/console/kpi/events"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-950 flex items-center gap-0.5"
            >
              <span>Rankings</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No events recorded yet.
              </div>
            ) : (
              events.map((ev) => {
                const evAttendees = attendees.filter((a) => a.eventId === ev.id);
                const cap = ev.tiers?.reduce((s, t) => s + (t.total_capacity || 0), 0) || ev.total_capacity || 1;
                const soldPct = Math.min(100, Math.round((evAttendees.length / cap) * 100));

                return (
                  <Link
                    key={ev.id}
                    href={`/m/console/events/${encodeURIComponent(ev.slug || ev.id)}/overview`}
                    className="py-3 px-1 flex items-center justify-between gap-3 active:bg-zinc-50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-semibold text-zinc-950 truncate">
                        {ev.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {evAttendees.length} / {cap} tickets sold
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-900 text-xs font-bold tabular-nums">
                        {soldPct}%
                      </span>
                      <ChevronRight size={14} className="text-zinc-300" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
