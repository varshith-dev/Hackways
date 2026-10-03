"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EventItem, EventTeam } from "@/lib/types";
import { UserTicket, StoredAttendee } from "@/lib/api";
import {
  CalendarIcon,
  MapPinIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@/components/icons/hugeicons";

interface RegistrationStatusCardProps {
  event: EventItem;
  status: "PENDING_APPROVAL" | "WAITLIST" | "CANCELLED" | "REJECTED";
  ticket?: UserTicket | null;
  attendee?: StoredAttendee | null;
  team?: EventTeam | null;
  onRefresh?: () => void;
  onCancelRSVP?: () => void;
  isCancelling?: boolean;
}

export const RegistrationStatusCard: React.FC<RegistrationStatusCardProps> = ({
  event,
  status,
  ticket,
  attendee,
  team,
  onCancelRSVP,
  isCancelling = false,
}) => {
  const [copiedTeamLink, setCopiedTeamLink] = useState(false);

  const attendeeName = attendee?.name || ticket?.user_name || "Guest Attendee";
  const attendeeEmail = attendee?.email || ticket?.user_email || "";
  const tierName = attendee?.tierName || ticket?.tier_name || "General Admission";
  const ticketCode = attendee?.ticketCode || ticket?.ticket_code || "";

  const isWaitlist = status === "WAITLIST";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 text-zinc-900">
      {/* 01. Event Hero Banner (No card, prominent responsive banner) */}
      {event.banner_url && (
        <div className="relative w-full aspect-16/9 sm:aspect-21/9 rounded-xl overflow-hidden border border-zinc-200/80 shadow-xs bg-zinc-900">
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl" />
        </div>
      )}

      {/* 02. Open Typographic Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
            {tierName}
          </span>
          {ticketCode && (
            <span className="font-mono text-xs text-zinc-500 font-medium">
              Ref: {ticketCode}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 font-heading leading-tight">
          {event.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap pt-0.5">
          {(event.time_display || event.start_time) && (
            <div className="flex items-center gap-1.5">
              <CalendarIcon size={14} className="text-zinc-500 shrink-0" />
              <span className="font-medium text-zinc-900">
                {event.time_display || event.start_time}
              </span>
            </div>
          )}
          {event.location && event.location.trim() && (
            <div className="flex items-center gap-1.5">
              <MapPinIcon size={14} className="text-zinc-500 shrink-0" />
              <span className="font-medium text-zinc-900">
                {event.location}
                {event.city ? `, ${event.city}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-200/80 w-full" />

      {/* 03. Calm Status Notification (Open typographic layout, no box-in-a-box) */}
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight font-heading">
          {isWaitlist ? "You are on the Waitlist" : "Application Submitted"}
        </h2>
        <p className="text-sm text-zinc-600 leading-relaxed font-body max-w-xl">
          {isWaitlist
            ? "This ticket tier is currently at capacity. If an admission spot opens up, your application will be prioritized automatically and you will receive an email."
            : `Your registration details have been submitted to the host. Once reviewed and approved, your admission pass will be sent directly to ${
                attendeeEmail || "your email"
              }.`}
        </p>
      </div>

      {/* 04. Attendee & Application Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs py-2">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
            Applicant
          </span>
          <div className="font-semibold text-zinc-950 text-sm">{attendeeName}</div>
          {attendeeEmail && (
            <div className="text-zinc-500 font-mono text-xs">{attendeeEmail}</div>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold font-mono">
            Status
          </span>
          <div className="font-semibold text-amber-700 text-sm">
            {isWaitlist ? "Waitlisted" : "Pending Host Approval"}
          </div>
          <div className="text-zinc-400 text-xs">Updates will sync automatically</div>
        </div>
      </div>

      {/* 05. Team Registration Link (if applicable) */}
      {team && (
        <div className="space-y-2 text-xs pt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-900">
              Team: {team.name}
            </span>
            <span className="font-mono text-xs font-bold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200">
              {team.code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/events/${encodeURIComponent(event.slug || event.id)}/rsvp?team=${team.code}`
                  : ""
              }
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-mono text-zinc-700 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/events/${encodeURIComponent(event.slug || event.id)}/rsvp?team=${team.code}`;
                navigator.clipboard.writeText(link);
                setCopiedTeamLink(true);
                setTimeout(() => setCopiedTeamLink(false), 2000);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition shrink-0 cursor-pointer shadow-2xs"
            >
              {copiedTeamLink ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      {/* 06. Clean Bottom Action Row */}
      <div className="pt-6 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href={`/events/${encodeURIComponent(event.slug || event.id)}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full h-11 px-6 text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition active:scale-[0.98] shadow-xs cursor-pointer"
        >
          <span>Back to Event Details</span>
          <ArrowRightIcon size={14} />
        </Link>

        {onCancelRSVP && (
          <button
            type="button"
            onClick={onCancelRSVP}
            disabled={isCancelling}
            className="text-xs text-zinc-400 hover:text-rose-600 transition disabled:opacity-50 cursor-pointer"
          >
            {isCancelling ? "Requesting cancellation..." : "Request cancellation"}
          </button>
        )}
      </div>
    </div>
  );
};
