"use client";

import React, { useState } from "react";
import Link from "next/link";
import { EventItem } from "@/lib/types";
import { UserTicket, StoredAttendee } from "@/lib/api";
import { EventPassQRCode } from "./EventPassQRCode";
import {
  CalendarIcon,
  MapPinIcon,
  TicketIcon,
  ArrowRightIcon,
} from "@/components/icons/hugeicons";

import { downloadTicketPdf } from "@/lib/generateTicketPdf";

interface HorizontalEventPassProps {
  event: EventItem;
  ticket?: UserTicket | null;
  attendee?: StoredAttendee | null;
  sequenceNo?: number;
  onCancelRSVP?: () => void;
  isCancelling?: boolean;
  onRegisterAnother?: () => void;
}

export const HorizontalEventPass: React.FC<HorizontalEventPassProps> = ({
  event,
  ticket,
  attendee,
  sequenceNo = 1,
  onCancelRSVP,
  isCancelling = false,
  onRegisterAnother,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const attendeeName = attendee?.name || ticket?.user_name || "Guest Attendee";
  const attendeeEmail = attendee?.email || ticket?.user_email || "";
  const ticketCode = attendee?.ticketCode || ticket?.ticket_code || `HKW-${event.id.slice(-6).toUpperCase()}`;
  const tierName = attendee?.tierName || ticket?.tier_name || "General Admission";
  const isPaid = Boolean((ticket?.price_cents && ticket.price_cents > 0) || (attendee?.priceFormatted && !attendee.priceFormatted.includes("0") && attendee.priceFormatted !== "FREE"));
  const priceDisplay = attendee?.priceFormatted || (ticket?.price_cents ? `₹${ticket.price_cents / 100}` : "");

  const formattedBookingDate = attendee?.registeredAt
    ? new Date(attendee.registeredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : ticket?.created_at
    ? new Date(ticket.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Sep 20, 2026";

  const qrTarget = typeof window !== "undefined"
    ? `${window.location.origin}/console/checkin?code=${encodeURIComponent(ticketCode)}`
    : `https://hackways.com/checkin?code=${ticketCode}`;

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadTicketPdf({
        eventTitle: event.title,
        ticketCode,
        tierName,
        attendeeName,
        attendeeEmail,
        timeDisplay: event.time_display || event.start_time || "Date to be announced",
        location: event.location || "Venue announced after RSVP",
        city: event.city,
        qrTarget,
        priceFormatted: isPaid ? priceDisplay : undefined,
        channelName: event.channel_name,
      });
    } catch {
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Header: Clean, Typography-First Header without Banned Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 font-heading">
            My Ticket
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 font-body">
            Show this QR code at the entrance for event admission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="inline-flex items-center justify-center gap-1.5 rounded-full h-9 px-4 text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isGeneratingPdf ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center rounded-full h-9 px-4 text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition active:scale-[0.98] shadow-2xs cursor-pointer"
          >
            {copiedLink ? "Link Copied" : "Share"}
          </button>
        </div>
      </div>

      {/* Modern Event Admission Pass */}
      <div
        id="printable-event-pass"
        className="relative bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden flex flex-col md:flex-row text-zinc-900 print:border-zinc-300 print:shadow-none"
      >
        {/* Left Section: Event & Attendee Details */}
        <div className="flex-1 p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                Admission Pass
              </span>

              {event.channel_name && (
                <div className="text-xs font-medium text-zinc-500 truncate max-w-[180px]">
                  {event.channel_name}
                </div>
              )}
            </div>

            {/* Event Name */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 font-heading leading-snug">
                {event.title}
              </h2>
            </div>

            {/* Event Metadata (Date, Time, Location) */}
            <div className="space-y-2 pt-1 text-xs sm:text-sm text-zinc-600">
              {(event.time_display || event.start_time) && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
                    <CalendarIcon size={14} />
                  </div>
                  <span className="font-medium text-zinc-900">
                    {event.time_display || event.start_time}
                  </span>
                </div>
              )}

              {event.location && event.location.trim() && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPinIcon size={14} />
                  </div>
                  <span className="font-medium text-zinc-900">
                    {event.location}
                    {event.city ? `, ${event.city}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Attendee Info Section */}
          <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
                Attendee
              </span>
              <div className="font-semibold text-zinc-950 text-sm">
                {attendeeName}
              </div>
              {attendeeEmail && (
                <div className="text-zinc-500 font-mono text-[11px] truncate mt-0.5">
                  {attendeeEmail}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
                Ticket Reference
              </span>
              <div className="font-mono font-bold text-zinc-950 text-sm">
                {ticketCode}
              </div>
              <div className="text-zinc-400 text-[11px] mt-0.5">
                Issued {formattedBookingDate}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Scannable Stub */}
        <div className="w-full md:w-64 bg-zinc-50/60 p-6 flex flex-col items-center justify-center text-center space-y-3 border-t md:border-t-0 md:border-l md:border-dashed border-zinc-200">
          <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs">
            <EventPassQRCode value={qrTarget} size={145} />
          </div>

          <div className="space-y-0.5">
            <div className="font-mono font-bold text-xs tracking-wider text-zinc-900">
              {ticketCode}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">
              Valid for Admission
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs print:hidden">
        <div className="flex items-center gap-3 text-zinc-500">
          <Link
            href={`/events/${event.id}`}
            className="hover:text-zinc-950 font-medium transition flex items-center gap-1"
          >
            <span>Back to event</span>
            <ArrowRightIcon size={12} />
          </Link>
          <span>•</span>
          <Link href="/profile" className="hover:text-zinc-950 font-medium transition">
            My Passes
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {onRegisterAnother && (
            <button
              type="button"
              onClick={onRegisterAnother}
              className="text-zinc-600 hover:text-zinc-950 font-medium transition cursor-pointer"
            >
              Register another attendee
            </button>
          )}

          {onCancelRSVP && (
            <button
              type="button"
              onClick={onCancelRSVP}
              disabled={isCancelling}
              className="text-zinc-400 hover:text-rose-600 transition disabled:opacity-50 cursor-pointer"
            >
              {isCancelling ? "Requesting cancellation..." : "Request cancellation"}
            </button>
          )}
        </div>
      </div>

      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 12mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, .print\\:hidden {
            display: none !important;
          }
          #printable-event-pass {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 1px solid #d4d4d8 !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
