"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  CalendarDays,
  MapPin,
  QrCode,
  Plus,
  Users,
  ChevronRight,
  TrendingUp,
  Megaphone,
  Wallet,
  Settings,
  Shield,
  ShoppingBag,
  ExternalLink,
  Zap,
} from "lucide-react";
import { getStoredEvents, getAllAttendees, getAllOrders } from "@/lib/api";
import { EventItem } from "@/lib/types";
import MobileConsoleHeader from "./_components/MobileConsoleHeader";

export default function MobileConsoleRootPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
    setAttendees(getAllAttendees());
    setOrders(getAllOrders());
  }, []);

  const confirmedCount = attendees.filter(
    (a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN"
  ).length;
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] font-sans min-h-screen">
      {/* Mobile Top Header with Sidebar Drawer */}
      <MobileConsoleHeader
        currentTab="events"
        title="Organizer"
        subtitle="Events & Performance"
        rightAction={
          <button
            onClick={() => setActionsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#202022] text-white text-xs font-medium whitespace-nowrap shrink-0 hover:opacity-90 transition active:scale-95"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Actions</span>
          </button>
        }
      />

      {/* Quick Actions Bottom Sheet */}
      {actionsOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setActionsOpen(false)}
          />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-2xl p-5 z-10 space-y-4 animate-in slide-in-from-bottom duration-200 border-t border-[#dedee2]">
            <div className="flex items-center justify-between pb-2 border-b border-[#dedee2]">
              <h3 className="text-sm font-semibold text-[#202022]">Quick Actions</h3>
              <button onClick={() => setActionsOpen(false)} className="p-1 text-[#707077]">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/create"
                onClick={() => setActionsOpen(false)}
                className="p-3.5 rounded-xl border border-[#dedee2] hover:bg-[#fafafa] flex flex-col items-center text-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-full bg-[#202022] text-white flex items-center justify-center">
                  <CalendarDays size={18} />
                </div>
                <span className="text-xs font-medium text-[#202022]">Create Event</span>
              </Link>

              <Link
                href="/m/console/channels/create"
                onClick={() => setActionsOpen(false)}
                className="p-3.5 rounded-xl border border-[#dedee2] hover:bg-[#fafafa] flex flex-col items-center text-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-full bg-[#f0f0f2] text-[#202022] flex items-center justify-center">
                  <Users size={18} />
                </div>
                <span className="text-xs font-medium text-[#202022]">New Community</span>
              </Link>

              <Link
                href="/m/console/marketing/create"
                onClick={() => setActionsOpen(false)}
                className="p-3.5 rounded-xl border border-[#dedee2] hover:bg-[#fafafa] flex flex-col items-center text-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-full bg-[#f0f0f2] text-[#202022] flex items-center justify-center">
                  <Megaphone size={18} />
                </div>
                <span className="text-xs font-medium text-[#202022]">New Promo</span>
              </Link>

              <Link
                href="/m/console/team/invite"
                onClick={() => setActionsOpen(false)}
                className="p-3.5 rounded-xl border border-[#dedee2] hover:bg-[#fafafa] flex flex-col items-center text-center gap-1.5 transition"
              >
                <div className="w-10 h-10 rounded-full bg-[#f0f0f2] text-[#202022] flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <span className="text-xs font-medium text-[#202022]">Invite Team</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Feed */}
      <main className="flex-1 max-w-[600px] mx-auto w-full p-4 space-y-6 pb-20">
        {/* Flat Overview Summary Row with Hairline Dividers (Zero Puffy Cards) */}
        <section aria-label="Event stats" className="py-3 px-1 border-b border-[#dedee2] grid grid-cols-3 divide-x divide-[#dedee2]">
          <div className="px-2 text-center">
            <span className="text-2xl font-semibold text-[#202022] tracking-tight tabular-nums block">
              {events.length}
            </span>
            <span className="text-xs text-[#707077]">Events</span>
          </div>
          <div className="px-2 text-center">
            <span className="text-2xl font-semibold text-[#202022] tracking-tight tabular-nums block">
              {confirmedCount}
            </span>
            <span className="text-xs text-[#707077]">RSVPs</span>
          </div>
          <div className="px-2 text-center">
            <span className="text-2xl font-semibold text-[#202022] tracking-tight tabular-nums block">
              {checkedInCount}
            </span>
            <span className="text-xs text-[#707077]">Checked in</span>
          </div>
        </section>

        {/* Hosted Events List: Minimal Border Cards (Zero Shadows) */}
        <section className="space-y-3" aria-label="Events">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium text-[#202022]">
              Hosted events <span className="text-[#707077] font-normal">({events.length})</span>
            </h2>
            <Link
              href="/console/organizer/events?view=desktop"
              className="text-xs text-[#707077] hover:text-[#202022] transition"
            >
              Desktop view
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#dedee2] bg-white space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#f0f0f2] flex items-center justify-center text-[#707077]">
                <CalendarDays size={22} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#202022]">No events yet</p>
                <p className="text-xs text-[#707077] mt-0.5">Create your first event to get started.</p>
              </div>
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 transition"
              >
                <Plus size={14} />
                <span>Create Event</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const eventAttendees = attendees.filter((a) => a.eventId === ev.id);
                const regCount = eventAttendees.length;
                const checkCount = eventAttendees.filter((a) => a.status === "CHECKED_IN").length;
                // STRICT MANDATORY RULE: maintain 1:1 square banner on mobile cards
                const artwork = ev.square_banner_url || ev.banner_url;
                const date = ev.start_time ? new Date(ev.start_time) : null;
                const formattedDate = date && !isNaN(date.getTime())
                  ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
                  : "Upcoming";

                return (
                  <article
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-[#dedee2] bg-white space-y-3"
                  >
                    <div className="flex gap-3 items-start">
                      {artwork ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artwork}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover border border-[#dedee2] shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#f0f0f2] border border-[#dedee2] flex items-center justify-center shrink-0 text-[#707077] font-semibold text-base">
                          {ev.title ? ev.title.charAt(0).toUpperCase() : "E"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            ev.status === "PUBLISHED"
                              ? "bg-[#f0f0f2] text-[#202022]"
                              : "bg-amber-50 text-amber-800"
                          }`}>
                            {ev.status}
                          </span>
                          <span className="text-[11px] text-[#707077]">
                            {formattedDate}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-[#202022] truncate mt-1">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-[#707077] truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="shrink-0 text-[#707077]" />
                          <span>{ev.location || "Online"}</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats & Quick Actions with Subtle Divider */}
                    <div className="pt-2.5 border-t border-[#dedee2] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-[#707077]">
                        <span>
                          <strong className="font-medium text-[#202022]">{regCount}</strong> rsvps
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="font-medium text-[#202022]">{checkCount}</strong> checked in
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/m/console/events/${encodeURIComponent(ev.slug || ev.id)}/check-in`}
                          className="px-3 py-1 rounded-full border border-[#dedee2] hover:border-[#202022] text-[#202022] text-xs font-medium flex items-center gap-1 transition"
                        >
                          <QrCode size={12} />
                          <span>Scan</span>
                        </Link>
                        <Link
                          href={`/m/console/events/${encodeURIComponent(ev.slug || ev.id)}/overview`}
                          className="px-3 py-1 rounded-full bg-[#202022] text-white text-xs font-medium flex items-center gap-1 hover:opacity-90 transition"
                        >
                          <span>Manage</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
