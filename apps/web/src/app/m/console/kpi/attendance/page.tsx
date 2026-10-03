"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, QrCode, ChevronRight, CheckCircle2 } from "lucide-react";
import { getAllAttendees, getStoredEvents } from "@/lib/api";
import { EventItem } from "@/lib/types";

export default function MobileAttendanceDetailPage() {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    setAttendees(getAllAttendees());
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
  }, []);

  const totalAttendees = attendees.length;
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const pendingCount = totalAttendees - checkedInCount;
  const rate = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0;

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
        <span className="text-xs font-bold text-zinc-950">Attendance</span>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-5 pb-16 max-w-md mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Gate Attendance</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time venue check-in rates and attendee turnout.
          </p>
        </div>

        {/* Big Turnout Card */}
        <div className="p-5 rounded-2xl bg-zinc-950 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-medium">Turnout Rate</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-0.5">
              {rate}%
            </div>
            <span className="text-xs text-zinc-400 mt-1 block">
              {checkedInCount} checked in / {pendingCount} remaining
            </span>
          </div>

          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-emerald-400 text-sm">
            {checkedInCount}/{totalAttendees}
          </div>
        </div>

        {/* Check-in Terminal Shortcut */}
        <Link
          href="/m/console/checkin"
          className="flex items-center justify-between p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200/80 transition"
        >
          <div className="flex items-center gap-3">
            <QrCode size={18} className="text-zinc-700" />
            <div>
              <span className="text-xs font-bold text-zinc-900 block">Open Check-in Terminal</span>
              <span className="text-[11px] text-zinc-500">Scan QR passes or search guest list</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-400" />
        </Link>

        {/* Attendance by Event Breakdown */}
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
            Turnout by Event
          </h2>
          {events.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
              No events found.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => {
                const evAttendees = attendees.filter((a) => a.eventId === ev.id);
                const evCheckedIn = evAttendees.filter((a) => a.status === "CHECKED_IN").length;
                const evRate = evAttendees.length > 0 ? Math.round((evCheckedIn / evAttendees.length) * 100) : 0;

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
                        {evCheckedIn} of {evAttendees.length} checked in
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-900 tabular-nums shadow-xs">
                      {evRate}%
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
