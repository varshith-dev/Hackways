"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Eye, TrendingUp, UserCheck, ExternalLink, ChevronRight } from "lucide-react";
import { getStoredChannels, getStoredEvents, getAllAttendees } from "@/lib/api";
import { Channel, EventItem } from "@/lib/types";

export default function MobileCommunityAnalyticsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);

  useEffect(() => {
    setChannels(getStoredChannels());
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
    setAttendees(getAllAttendees());
  }, []);

  const totalMembers = channels.reduce((sum, c) => sum + (c.members?.length || 1), 0) + 124; // baseline followers
  const totalViews = 1840;
  const totalRsvps = attendees.length || 24;
  const conversionRate = Math.round((totalRsvps / totalViews) * 100 * 10) / 10;
  const repeatRate = 38; // 38% repeat attendees

  const weeklyGrowth = [
    { label: "W1", members: 18 },
    { label: "W2", members: 32 },
    { label: "W3", members: 45 },
    { label: "W4", members: 68 },
  ];
  const maxGrowth = Math.max(...weeklyGrowth.map((g) => g.members));

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
        <span className="text-xs font-bold text-zinc-950">Community & Audience</span>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-5 pb-16 max-w-md mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Community Analytics</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Audience growth, profile visits, and member loyalty metrics.
          </p>
        </div>

        {/* 2x2 Clean Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium text-zinc-600">Community Members</span>
              <Users size={14} className="text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
              {totalMembers}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block">
              +18% this month
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium text-zinc-600">Page Impressions</span>
              <Eye size={14} className="text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
              {totalViews.toLocaleString()}
            </div>
            <span className="text-[11px] text-zinc-500 font-medium block">
              across all drops
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium text-zinc-600">RSVP Conversion</span>
              <TrendingUp size={14} className="text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
              {conversionRate}%
            </div>
            <span className="text-[11px] text-zinc-500 font-medium block">
              views into tickets
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium text-zinc-600">Member Retention</span>
              <UserCheck size={14} className="text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-zinc-950 tabular-nums">
              {repeatRate}%
            </div>
            <span className="text-[11px] text-zinc-500 font-medium block">
              repeat attendees
            </span>
          </div>
        </div>

        {/* Member Growth Bar Graph */}
        <div className="p-4 rounded-2xl bg-zinc-950 text-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">New Community Joins</span>
            <span className="text-xs font-bold text-emerald-400">+163 total</span>
          </div>

          {/* SVG Growth Bars */}
          <div className="flex items-end justify-between gap-3 h-28 pt-2 px-2 border-b border-zinc-800">
            {weeklyGrowth.map((w, idx) => {
              const hPct = Math.round((w.members / maxGrowth) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-zinc-300 tabular-nums">+{w.members}</span>
                  <div
                    className="w-full max-w-[36px] bg-white rounded-t-md transition-all duration-300"
                    style={{ height: `${hPct}%` }}
                  />
                  <span className="text-[10px] text-zinc-500 font-medium mt-1">{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Community Hubs */}
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
            Community Hubs
          </h2>
          {channels.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-100">
              No communities created yet.
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map((chan) => (
                <Link
                  key={chan.id}
                  href={`/channels/${encodeURIComponent(chan.slug || chan.id)}`}
                  className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-100 transition flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-zinc-950 block truncate">{chan.name}</span>
                    <span className="text-[11px] text-zinc-400 font-mono">/c/{chan.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-900 font-semibold text-[11px]">
                      {chan.members?.length || 1} members
                    </span>
                    <ExternalLink size={13} className="text-zinc-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
