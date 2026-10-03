"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getStoredEvents } from "@/lib/api";
import { EventItem } from "@/lib/types";

export interface ExtendedTeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "Door Scanner" | "Event Manager" | "Co-Host" | "Finance";
  assignedEventId?: string;
  assignedEventTitle?: string;
  status: "ACTIVE" | "PENDING";
  note?: string;
  invitedAt: string;
}

const ROLES = [
  { id: "Door Scanner", label: "Door Scanner" },
  { id: "Event Manager", label: "Event Manager" },
  { id: "Co-Host", label: "Co-Host" },
  { id: "Finance", label: "Finance" },
] as const;

export default function MobileInviteTeamPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ExtendedTeamMember["role"]>("Door Scanner");
  const [eventScope, setEventScope] = useState<"all" | "specific">("all");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const list = getStoredEvents().filter((e) => e.status !== "DELETED");
    setEvents(list);
    if (list.length > 0) {
      setSelectedEventId(list[0].id);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast("Please enter an email address.");
      return;
    }

    setSubmitting(true);
    const chosenEvent = eventScope === "specific" ? events.find((ev) => ev.id === selectedEventId) : undefined;
    const computedName =
      name.trim() ||
      email
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newMember: ExtendedTeamMember = {
      id: `tm_${Date.now()}`,
      name: computedName,
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      role,
      assignedEventId: chosenEvent ? chosenEvent.id : undefined,
      assignedEventTitle: chosenEvent ? chosenEvent.title : "All Events",
      status: "PENDING",
      note: note.trim() || undefined,
      invitedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hackways_organizer_team");
      const currentList: ExtendedTeamMember[] = stored
        ? JSON.parse(stored)
        : [
            {
              id: "tm_1",
              name: "Alex Rivera",
              email: "alex@hackways.dev",
              role: "Co-Host",
              status: "ACTIVE",
              assignedEventTitle: "All Events",
              invitedAt: new Date().toISOString(),
            },
            {
              id: "tm_2",
              name: "Sarah Chen",
              email: "sarah@hackways.dev",
              role: "Event Manager",
              status: "ACTIVE",
              assignedEventTitle: "All Events",
              invitedAt: new Date().toISOString(),
            },
            {
              id: "tm_3",
              name: "Marcus Brody",
              email: "marcus@ops.hackways.dev",
              role: "Door Scanner",
              status: "ACTIVE",
              assignedEventTitle: "All Events",
              phone: "+91 98765 43210",
              invitedAt: new Date().toISOString(),
            },
          ];

      const updated = [newMember, ...currentList];
      localStorage.setItem("hackways_organizer_team", JSON.stringify(updated));
      window.dispatchEvent(new Event("hackways_team_updated"));
    }

    showToast(`Invitation sent to ${newMember.email}.`);
    router.push("/m/console/team");
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 py-3.5 flex items-center justify-between">
        <Link
          href="/m/console/team"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition"
        >
          <ArrowLeft size={16} />
          <span>Team</span>
        </Link>
        <span className="text-xs font-bold text-zinc-950">Invite Teammate</span>
        <div className="w-10" />
      </header>

      {/* Main Content: iOS / Linear Clean Divider Rows */}
      <main className="p-4 max-w-md mx-auto w-full space-y-6 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hero Email Input */}
          <div className="py-6 px-1 text-center border-b border-zinc-100">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">
              Teammate Email
            </span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@domain.com"
              className="w-full text-center text-xl sm:text-2xl font-bold text-zinc-950 placeholder:text-zinc-300 bg-transparent outline-none"
              required
            />
            <p className="text-[11px] text-zinc-400 mt-2">
              They will receive an invitation to access this organizer console
            </p>
          </div>

          {/* Group 1: Personal Details */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Details
            </div>
            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
              {/* Full Name */}
              <div className="py-3.5 px-1 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-800 shrink-0">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional (e.g. Jordan Smith)"
                  className="w-full text-right text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
                />
              </div>

              {/* Phone */}
              <div className="py-3.5 px-1 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-800 shrink-0">Phone</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional (for gate sync)"
                  className="w-full text-right text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Role & Permissions */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Role & Permissions
            </div>
            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
              {/* Role Selector */}
              <div className="py-3 px-1 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => {
                    const isSelected = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition active:scale-95 whitespace-nowrap shrink-0 ${
                          isSelected
                            ? "bg-zinc-950 text-white shadow-xs"
                            : "bg-zinc-100 text-zinc-600 hover:text-zinc-950"
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-400">
                  {role === "Door Scanner" && "Check-in and scan tickets at the door only."}
                  {role === "Event Manager" && "Manage event details, tickets, and attendees."}
                  {role === "Co-Host" && "Full administrative control across all settings."}
                  {role === "Finance" && "View sales ledger, invoices, and payouts."}
                </p>
              </div>

              {/* Event Scope */}
              <div className="py-3 px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">Coverage</span>
                <div className="flex bg-zinc-100 p-0.5 rounded-full">
                  <button
                    type="button"
                    onClick={() => setEventScope("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      eventScope === "all"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    All Events
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventScope("specific")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      eventScope === "specific"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Specific
                  </button>
                </div>
              </div>

              {/* Specific Event dropdown if selected */}
              {eventScope === "specific" && (
                <div className="py-3 px-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Assigned Event</span>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="max-w-[200px] text-xs font-medium text-zinc-900 bg-transparent text-right outline-none cursor-pointer"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Group 3: Note */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Invitation Note
            </div>
            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
              <div className="py-3 px-1">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Welcome to the team! You will be at Gate A."
                  className="w-full text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Primary Action Button: Big Capsule */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full py-3.5 px-6 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Sending Invite...</span>
                </>
              ) : (
                <span>Send Invitation</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
