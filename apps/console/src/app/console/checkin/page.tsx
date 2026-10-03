"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  QrCodeIcon,
  SearchIcon,
} from "@/components/icons/hugeicons";
import {
  getStoredEvents,
  getEventAttendees,
  getAllAttendees,
  checkInAttendee,
  StoredAttendee,
} from "@/lib/api";
import { EventItem } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { webAppHref } from "@/lib/webAppUrl";

export default function CheckinDashboard() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketInput, setTicketInput] = useState("");
  const [attendees, setAttendees] = useState<StoredAttendee[]>([]);
  const [lastScanResult, setLastScanResult] = useState<{
    status: "VALID" | "ALREADY_USED" | "INVALID";
    attendee?: StoredAttendee;
    message?: string;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    const loadedEvents = getStoredEvents();
    setEvents(loadedEvents);
    if (loadedEvents.length > 0) {
      setSelectedEventId(loadedEvents[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      setAttendees(getEventAttendees(selectedEventId));
    } else {
      setAttendees(getAllAttendees());
    }
  }, [selectedEventId]);

  const refreshAttendees = () => {
    if (selectedEventId) {
      setAttendees(getEventAttendees(selectedEventId));
    } else {
      setAttendees(getAllAttendees());
    }
  };

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const totalTickets = attendees.length;
  const remainingCount = Math.max(0, totalTickets - checkedInCount);
  const attendanceRate = totalTickets > 0 ? ((checkedInCount / totalTickets) * 100).toFixed(1) : "0.0";

  const handleProcessCheckIn = (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed) {
      showToast("Please enter a ticket code.");
      return;
    }

    const result = checkInAttendee(trimmed, selectedEventId || undefined);
    if (result.success && result.attendee) {
      setLastScanResult({
        status: "VALID",
        attendee: result.attendee,
        message: result.message,
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast(result.message);
      setTicketInput("");
      refreshAttendees();
    } else if (result.attendee) {
      setLastScanResult({
        status: "ALREADY_USED",
        attendee: result.attendee,
        message: result.message,
        timestamp: result.attendee.checkedInAt || "Earlier",
      });
      showToast(result.message);
    } else {
      setLastScanResult({
        status: "INVALID",
        message: result.message,
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast(result.message);
    }
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ticketCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Compact Event Selector Bar */}
      {events.length > 0 && (
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
          <span className="text-xs font-semibold text-zinc-700">Check-In Terminal</span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-white border border-zinc-200 rounded-md px-3 py-1 text-xs text-zinc-900 font-medium focus:outline-none focus:border-zinc-500"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Attendance Counter Banner */}
      <div className="grid grid-cols-3 gap-4 border border-zinc-200 rounded-xl p-4 bg-zinc-50 text-center">
        <div>
          <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 tabular-nums">
            {checkedInCount}
          </div>
          <div className="text-xs text-zinc-600 font-medium mt-0.5">Checked In</div>
        </div>
        <div className="border-x border-zinc-200">
          <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 tabular-nums">
            {remainingCount}
          </div>
          <div className="text-xs text-zinc-600 font-medium mt-0.5">Remaining</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-extrabold text-zinc-950 tabular-nums">
            {attendanceRate}%
          </div>
          <div className="text-xs text-zinc-600 font-medium mt-0.5">Attendance</div>
        </div>
      </div>

      {/* 3. Ticket Scanner & Direct Code Entry */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 flex flex-col items-center text-center space-y-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-950 font-heading">
            Scan / Enter Ticket Code
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Type ticket code or scan QR code to validate guest pass.
          </p>
        </div>

        {/* Code Entry Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessCheckIn(ticketInput);
          }}
          className="w-full max-w-md flex items-center gap-2"
        >
          <div className="relative flex-1">
            <QrCodeIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
              placeholder="e.g. HKW-84920-GEN"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 pl-10 pr-4 py-2.5 text-sm font-mono text-zinc-900 focus:outline-none focus:bg-white focus:border-zinc-950 uppercase"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
          >
            Check In
          </button>
        </form>

        {/* Scan Result Feedback */}
        {lastScanResult && (
          <div
            className={`w-full max-w-md rounded-xl p-4 border text-left transition animate-fadeIn ${
              lastScanResult.status === "VALID"
                ? "bg-zinc-50 border-zinc-900 text-zinc-950"
                : lastScanResult.status === "ALREADY_USED"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : "bg-red-50 border-red-300 text-red-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                  lastScanResult.status === "VALID"
                    ? "bg-zinc-950 text-white"
                    : lastScanResult.status === "ALREADY_USED"
                    ? "bg-amber-400 text-black font-mono"
                    : "bg-red-600 text-white font-mono"
                }`}
              >
                {lastScanResult.status === "VALID" ? "✓" : "!"}
              </div>

              <div>
                <div className="text-xs font-bold tracking-tight uppercase font-mono">
                  {lastScanResult.status === "VALID" && "ADMISSION GRANTED — VALID PASS"}
                  {lastScanResult.status === "ALREADY_USED" && "ALREADY CHECKED IN — DUPLICATE"}
                  {lastScanResult.status === "INVALID" && "INVALID TICKET CODE"}
                </div>
                {lastScanResult.attendee ? (
                  <div className="text-xs mt-0.5">
                    <span className="font-semibold">{lastScanResult.attendee.name}</span>
                    <span className="text-zinc-500 ml-1.5 font-mono text-[11px]">
                      ({lastScanResult.attendee.tierName})
                    </span>
                    {lastScanResult.status === "ALREADY_USED" && (
                      <div className="text-[11px] text-amber-800 font-mono mt-0.5">
                        Scanned at {lastScanResult.timestamp}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-red-700 mt-0.5">
                    {lastScanResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Guest Roster & Manual Check-in */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-950 font-heading">
            Guest List ({filteredAttendees.length})
          </h3>
          <div className="relative w-48 sm:w-64">
            <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, code..."
              className="w-full rounded-lg border border-zinc-200 pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {filteredAttendees.length > 0 ? (
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {filteredAttendees.map((att) => (
              <div
                key={att.id}
                className="py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-950 truncate">
                    {att.name}
                  </div>
                  <div className="text-zinc-500 text-[11px] flex items-center gap-2 truncate">
                    <span>{att.email}</span>
                    <span>•</span>
                    <span className="font-mono">{att.tierName}</span>
                    <span>•</span>
                    <span className="font-mono font-medium text-zinc-700">{att.ticketCode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {att.status === "CHECKED_IN" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
                      <span>Checked In</span>
                      {att.checkedInAt && <span className="font-mono">({att.checkedInAt})</span>}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleProcessCheckIn(att.ticketCode)}
                      className="rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white px-3 py-1 text-xs font-semibold transition"
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500 space-y-2">
            <p>No attendees found for this event roster.</p>
            {events.length === 0 && (
              <Link
                href={webAppHref("/create")}
                className="inline-block text-xs font-semibold text-zinc-900 underline underline-offset-4"
              >
                Create your first event drop
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
