"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DashboardArtwork from "@/components/ui/DashboardArtwork";
import { useRouter } from "next/navigation";
import { getStoredChannels, getStoredEvents } from "@/lib/api";
import { Channel, EventItem } from "@/lib/types";
import { PlusIcon, ArrowRightIcon, UsersGroupIcon, PresentationIcon } from "@/components/icons/hugeicons";
import { webAppHref } from "@/lib/webAppUrl";

export default function ConsoleChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getStoredChannels();
    const evts = getStoredEvents();
    setChannels(list);
    setEvents(evts);
    setLoading(false);

    const handleUpdate = () => {
      setChannels(getStoredChannels());
      setEvents(getStoredEvents());
    };
    window.addEventListener("hackways_channels_updated", handleUpdate);
    window.addEventListener("hackways_events_updated", handleUpdate);
    return () => {
      window.removeEventListener("hackways_channels_updated", handleUpdate);
      window.removeEventListener("hackways_events_updated", handleUpdate);
    };
  }, []);

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ch.description && ch.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-heading">
              Managed Communities
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700 font-mono">
              {channels.length} {channels.length === 1 ? "Community" : "Communities"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Switch into any dedicated community console workspace or launch an event under your brand.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={webAppHref("/channels/create")}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2 text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <PlusIcon size={14} strokeWidth={2.5} />
            <span>New Community</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {channels.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search managed communities by name or handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition"
            />
          </div>
        </div>
      )}

      {/* Communities Grid */}
      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center bg-zinc-50/50">
          <div className="mb-4"><DashboardArtwork kind="communities" /></div>
          <h3 className="text-base font-bold text-zinc-950 font-heading">
            No Communities Created Yet
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1.5 mb-6">
            Create your first community channel to establish a shared brand, publish recurring event drops, invite co-hosts, and cultivate an audience roster.
          </p>
          <Link
            href={webAppHref("/channels/create")}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white px-6 py-2.5 text-xs font-semibold transition cursor-pointer"
          >
            <PlusIcon size={14} strokeWidth={2.5} />
            <span>Create Your First Community</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChannels.map((ch) => {
            const communityEvents = events.filter((e) => e.channel_id === ch.id);
            const totalFollowers = ch.follower_count || ch.members?.length || 0;

            return (
              <div
                key={ch.id}
                className="group rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
              >
                {/* Cover Banner */}
                <div className="relative h-24 bg-gradient-to-r from-zinc-900 via-zinc-800 to-indigo-950 overflow-hidden">
                  {ch.banner_url ? (
                    <img
                      src={ch.banner_url}
                      alt=""
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
                  )}

                  {/* Public link pill */}
                  <div className="absolute top-2.5 right-2.5">
                    <Link
                      href={webAppHref(`/channels/${ch.slug}`)}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-sm text-[10px] font-medium text-white transition"
                    >
                      <span>Public Feed</span>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Profile Meta & Avatar */}
                <div className="px-5 pt-0 pb-4 relative flex-1 flex flex-col">
                  <div className="flex items-end justify-between -mt-8 mb-3">
                    {ch.avatar_url ? (
                      <img
                        src={ch.avatar_url}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover ring-4 ring-white bg-zinc-100 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center ring-4 ring-white shadow-xs font-heading">
                        {ch.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full font-mono">
                      OWNER
                    </span>
                  </div>

                  {/* Title & Slug */}
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-zinc-950 font-heading truncate">
                        {ch.name}
                      </h2>
                      {ch.verified && (
                        <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">
                      @{ch.slug}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4 flex-1">
                    {ch.description || "Official community workspace for hosted events and drops."}
                  </p>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2 py-2.5 border-t border-zinc-100 mb-4 bg-zinc-50/70 rounded-lg px-3">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400 font-heading">Events</div>
                      <div className="text-sm font-bold text-zinc-900 font-mono">{communityEvents.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400 font-heading">Members</div>
                      <div className="text-sm font-bold text-zinc-900 font-mono">{totalFollowers}</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/console/channels/${ch.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition group-hover:bg-indigo-600"
                  >
                    <span>Open Community Console</span>
                    <ArrowRightIcon size={14} strokeWidth={2} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
