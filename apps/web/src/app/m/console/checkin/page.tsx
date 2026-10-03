"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Camera,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  getStoredEvents,
  getEventAttendees,
  getAllAttendees,
  checkInAttendee,
  StoredAttendee,
} from "@/lib/api";
import { EventItem } from "@/lib/types";
import CameraScanner from "@/components/events/CameraScanner";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";

export default function MobileCheckinPage() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [attendees, setAttendees] = useState<StoredAttendee[]>([]);
  const [ticketInput, setTicketInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    status: "VALID" | "ALREADY_USED" | "INVALID";
    attendee?: StoredAttendee;
    message?: string;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    const loaded = getStoredEvents().filter((e) => e.status !== "DELETED");
    setEvents(loaded);
    if (loaded.length > 0) {
      setSelectedEventId(loaded[0].id);
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

  const handleProcessCode = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      showToast("Enter a ticket code.");
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

  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const totalTickets = attendees.length;
  const attendanceRate = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ticketCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="checkin"
        title="Check-in"
        subtitle="Organizer Hub"
        rightAction={
          <button
            onClick={() => setIsCameraActive((prev) => !prev)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-900 text-xs font-semibold whitespace-nowrap shrink-0 hover:bg-zinc-200 transition active:scale-95"
          >
            <Camera size={14} />
            <span className="whitespace-nowrap">{isCameraActive ? "Close" : "Scan"}</span>
          </button>
        }
      />

      {/* Main Content */}
      <main className="max-w-[600px] mx-auto w-full p-4 space-y-7 font-sans pb-20">
        {/* Event Selector */}
        {events.length > 0 && (
          <div>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setLastScanResult(null);
              }}
              className="w-full bg-transparent border-0 border-b border-[#dedee2] py-2 text-sm font-medium text-[#202022] focus:outline-none focus:border-b-[#202022] transition"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Counter Hero: Minimal, clean, matching CreationForm */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#202022] leading-tight">
            Door Check-in
          </h1>
          <p className="mt-1 text-sm text-[#707077]">
            {checkedInCount} of {totalTickets} guests checked in ({attendanceRate}%)
          </p>

          {/* Minimal 3px Progress Line */}
          <div className="w-full h-1 mt-3.5 rounded-full bg-[#dedee2] overflow-hidden">
            <div
              className="h-full bg-[#202022] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            />
          </div>
        </div>

        {/* Camera Scanner Toggle / Scanner View */}
        {isCameraActive && (
          <div className="overflow-hidden rounded-xl border border-[#dedee2]">
            <CameraScanner
              open={isCameraActive}
              onClose={() => setIsCameraActive(false)}
              onDetect={(code) => {
                handleProcessCode(code);
                setIsCameraActive(false);
              }}
              result={lastScanResult?.attendee?.ticketCode || ""}
            />
          </div>
        )}

        {/* Ticket Code Validation: Clean border-bottom input matching CreationForm */}
        <div>
          <label className="block text-sm font-medium text-[#202022] mb-1">
            Validate ticket
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessCode(ticketInput);
            }}
            className="flex items-center gap-3 pt-1"
          >
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
              placeholder="e.g. HKW-58195"
              className="flex-1 bg-transparent border-0 border-b border-[#dedee2] py-2 text-sm text-[#202022] placeholder:text-[#707077] focus:outline-none focus:border-b-[#202022] transition"
            />
            <button
              type="button"
              onClick={() => setIsCameraActive((prev) => !prev)}
              className="p-2 text-[#707077] hover:text-[#202022] transition"
              aria-label="Scan with camera"
            >
              <Camera size={18} strokeWidth={1.5} />
            </button>
            <button
              type="submit"
              disabled={!ticketInput.trim()}
              className="px-5 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 active:scale-95 transition disabled:opacity-30 shrink-0 whitespace-nowrap"
            >
              Check in
            </button>
          </form>
        </div>

        {/* Scan Result Feedback Card */}
        {lastScanResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1 animate-in fade-in duration-150 ${
              lastScanResult.status === "VALID"
                ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                : lastScanResult.status === "ALREADY_USED"
                ? "bg-amber-50/80 border-amber-300 text-amber-950"
                : "bg-red-50/80 border-red-300 text-red-950"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {lastScanResult.status === "VALID" ? (
                <CheckCircle2 size={15} className="text-emerald-600" />
              ) : (
                <AlertCircle size={15} className="text-amber-600" />
              )}
              <span>{lastScanResult.message}</span>
            </div>

            {lastScanResult.attendee && (
              <div className="text-[11px] pt-1 border-t border-current/10">
                <span className="font-medium">{lastScanResult.attendee.name}</span> •{" "}
                <span>{lastScanResult.attendee.ticketCode}</span>
              </div>
            )}
          </div>
        )}

        {/* Attendee Roster Search & Borderless Flat List */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#202022]">
              Guest manifest <span className="text-[#707077] font-normal">({filteredAttendees.length})</span>
            </h2>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-0 top-2.5 text-[#707077]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or ticket code..."
              className="w-full bg-transparent border-0 border-b border-[#dedee2] pl-6 py-2 text-sm text-[#202022] placeholder:text-[#707077] focus:outline-none focus:border-b-[#202022] transition"
            />
          </div>

          <div className="divide-y divide-[#dedee2]">
            {filteredAttendees.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#707077]">
                No matching guests found.
              </div>
            ) : (
              filteredAttendees.slice(0, 25).map((att) => {
                const isChecked = att.status === "CHECKED_IN";
                return (
                  <div
                    key={att.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#202022] truncate">{att.name}</p>
                      <p className="text-xs text-[#707077] mt-0.5">{att.ticketCode}</p>
                    </div>

                    {isChecked ? (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                        Admitted
                      </span>
                    ) : (
                      <button
                        onClick={() => handleProcessCode(att.ticketCode)}
                        className="px-3.5 py-1.5 rounded-full border border-[#c4c4c9] bg-white text-xs font-medium text-[#202022] hover:border-[#202022] active:scale-95 transition shrink-0 whitespace-nowrap"
                      >
                        Check in
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
