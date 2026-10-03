"use client";

import React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons/hugeicons";
import { webAppHref } from "@/lib/webAppUrl";
import { EventItem } from "@/lib/types";
import { useSyncStatus } from "@/hooks/useSyncStatus";

interface EventContextBarProps {
  event: EventItem | null;
  eventId: string;
  activeTab: string;
}

export default function EventContextBar({ event, eventId, activeTab }: EventContextBarProps) {
  const { status, pendingCount } = useSyncStatus();

  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 mb-4 select-none">
      <div className="flex items-center gap-2 text-xs font-heading">
        <Link
          href="/console/organizer/events"
          className="inline-flex items-center gap-1.5 font-medium text-zinc-500 hover:text-zinc-950 transition"
        >
          <ArrowRightIcon size={12} className="rotate-180 text-zinc-400" />
          <span>Organizer Console</span>
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-semibold text-zinc-900 truncate max-w-[240px]">
          {event?.title || event?.slug || eventId}
        </span>
        <span className="text-zinc-300">/</span>
        <span className="capitalize text-zinc-600 font-mono text-[11px] bg-zinc-100 px-2 py-0.5 rounded">
          {activeTab}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Sync & Offline Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono">
          {status === "online" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-500">Synced</span>
            </>
          )}
          {status === "syncing" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600 font-medium">Syncing...</span>
            </>
          )}
          {status === "offline" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-700 font-medium">Offline {pendingCount > 0 ? `(${pendingCount})` : ""}</span>
            </>
          )}
          {status === "error" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-red-600 font-medium">Retry Sync</span>
            </>
          )}
        </div>

        <Link
          href={webAppHref(`/events/${encodeURIComponent(event?.slug || eventId)}`)}
          target="_blank"
          className="text-xs font-medium text-zinc-600 hover:text-zinc-950 inline-flex items-center gap-1 transition"
        >
          <span>Live Public Page</span>
          <ArrowRightIcon size={11} className="-rotate-45 text-zinc-400" />
        </Link>
      </div>
    </div>
  );
}
