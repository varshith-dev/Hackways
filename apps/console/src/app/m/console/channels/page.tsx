"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ExternalLink,
  Globe,
} from "lucide-react";
import { getStoredChannels, getStoredEvents } from "@/lib/api";
import { Channel, EventItem } from "@/lib/types";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";
import { webAppHref } from "@/lib/webAppUrl";

export default function MobileChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const refresh = () => {
    const list = getStoredChannels();
    setChannels(list);
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
  };

  useEffect(() => {
    refresh();
    window.addEventListener("hackways_channels_updated", refresh);
    return () => window.removeEventListener("hackways_channels_updated", refresh);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="channels"
        title="Communities"
        subtitle="Manage your hubs & followers"
        rightAction={
          <Link
            href="/m/console/channels/create"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202022] text-white text-xs font-medium whitespace-nowrap shrink-0 hover:opacity-90 transition active:scale-95"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Create</span>
          </Link>
        }
      />

      {/* Main Content */}
      <main className="p-4 space-y-3 max-w-[600px] mx-auto w-full pb-20">
        {/* Communities Feed */}
        {channels.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white border border-[#dedee2] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#fafafa] border border-[#dedee2] flex items-center justify-center text-[#707077]">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#202022]">No communities yet</p>
              <p className="text-xs text-[#707077] mt-0.5">Create a community hub to host recurring events and grow followers.</p>
            </div>
            <Link
              href="/m/console/channels/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 transition whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>Create Community</span>
            </Link>
          </div>
        ) : (
          channels.map((chan) => {
            const channelEvents = events.filter((e) => e.channel_id === chan.id || e.channel_name === chan.name);
            return (
              <div
                key={chan.id}
                className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#fafafa] border border-[#dedee2] flex items-center justify-center font-bold text-base text-[#202022] shrink-0 overflow-hidden">
                    {chan.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={chan.avatar_url} alt={chan.name} className="w-full h-full object-cover" />
                    ) : (
                      chan.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-[#202022] truncate">
                        {chan.name}
                      </h2>
                      {chan.verified && (
                        <span className="text-[10px] bg-[#f0f0f2] text-[#202022] px-1.5 py-0.5 rounded-full font-medium">
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#707077] font-mono truncate">
                      /c/{chan.slug || chan.id}
                    </p>

                    {chan.description && (
                      <p className="text-xs text-[#707077] line-clamp-2 mt-1">
                        {chan.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="pt-2 border-t border-[#dedee2] flex items-center justify-between text-xs text-[#707077]">
                  <div className="flex items-center gap-3">
                    <span><strong className="text-[#202022]">{chan.members?.length || 1}</strong> members</span>
                    <span><strong className="text-[#202022]">{channelEvents.length}</strong> events</span>
                  </div>

                  <Link
                    href={webAppHref(`/channels/${encodeURIComponent(chan.slug || chan.id)}`)}
                    className="px-3 py-1 rounded-full border border-[#dedee2] hover:bg-[#fafafa] text-[#202022] text-xs font-medium transition whitespace-nowrap shrink-0 flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
