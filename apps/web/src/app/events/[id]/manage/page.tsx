"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { getEvent, saveEvent, deleteEvent, getEventAttendees, StoredAttendee } from "@/lib/api";
import { EventItem, TicketTier } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

export default function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<StoredAttendee[]>([]);
  const [activeTab, setActiveTab] = useState<"guests" | "edit">("guests");
  const [filter, setFilter] = useState<"all" | "confirmed" | "waitlist">("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Instantly route to the primary full-stack event command center using slug
  useEffect(() => {
    let active = true;
    getEvent(id).then((ev) => {
      if (!active) return;
      const target = ev?.slug || id;
      router.replace(`/console/events/${encodeURIComponent(target)}/overview`);
    }).catch(() => {
      if (!active) return;
      router.replace(`/console/events/${encodeURIComponent(id)}/overview`);
    });
    return () => { active = false; };
  }, [id, router]);

  // Edit State
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [editSquareBannerUrl, setEditSquareBannerUrl] = useState("");
  const [editTiers, setEditTiers] = useState<TicketTier[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete event modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteEvent = () => {
    if (!event) return;
    if (deleteConfirmName.trim() !== event.title.trim()) {
      showToast("Event name does not match. Please enter exact event title.");
      return;
    }
    setIsDeleting(true);
    deleteEvent(event.id, "Deleted by organizer via Event Manage");
    showToast(`Event "${event.title}" deleted. Historical records archived for Super Admin.`);
    setIsDeleteModalOpen(false);
    router.push("/console/organizer/events");
  };

  const loadData = () => {
    getEvent(id).then((ev) => {
      if (ev) {
        setEvent(ev);
        setEditTitle(ev.title);
        setEditDescription(ev.description || "");
        setEditLocation(ev.location || "");
        setEditStartTime(ev.start_time || "");
        setEditBannerUrl(ev.banner_url || "");
        setEditSquareBannerUrl(ev.square_banner_url || "");
        setEditTiers(ev.tiers || []);
      }
      setAttendees(getEventAttendees(id));
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/events/${id}`);
      showToast("Event link copied to clipboard.");
    }
  };

  const handleExportCSV = () => {
    if (attendees.length === 0) {
      showToast("No attendees to export.");
      return;
    }
    const csvHeader = "ID,Name,Email,Tier,Status,Registered At,Ticket Code\n";
    const csvRows = attendees
      .map(
        (a) =>
          `"${a.id}","${a.name}","${a.email}","${a.tierName}","${a.status}","${a.registeredAt}","${a.ticketCode}"`
      )
      .join("\n");
    const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event-${id}-attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!editTitle.trim()) {
      showToast("Please enter an event title.");
      return;
    }

    setIsSaving(true);
    try {
      const totalCap = editTiers.reduce((sum, t) => sum + (Number(t.total_capacity) || 0), 0);
      const updatedEvent: EventItem = {
        ...event,
        title: editTitle.trim(),
        description: editDescription.trim(),
        location: editLocation.trim(),
        start_time: editStartTime.trim() || event.start_time,
        banner_url: editBannerUrl.trim() || undefined,
        square_banner_url: editSquareBannerUrl.trim() || undefined,
        tiers: editTiers,
        total_capacity: totalCap,
      };

      saveEvent(updatedEvent);
      setEvent(updatedEvent);
      showToast("Event changes saved.");
      setActiveTab("guests");
    } catch (err) {
      console.error(err);
      showToast("Failed to save event changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAttendees = attendees.filter((a) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "confirmed" && (a.status === "CONFIRMED" || a.status === "CHECKED_IN")) ||
      (filter === "waitlist" && a.status === "WAITLIST");

    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.ticketCode.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const confirmedCount = attendees.filter(
    (a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN"
  ).length;
  const waitlistCount = attendees.filter((a) => a.status === "WAITLIST").length;
  const totalCapacity = event?.total_capacity || 0;
  const remainingCapacity = Math.max(0, totalCapacity - confirmedCount);

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-[#fafafa] font-body text-zinc-900">
        <AppHeader theme="light" />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-zinc-400">
          Loading event management...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] font-body text-zinc-900 pb-20 selection:bg-zinc-900 selection:text-white">
      <AppHeader theme="light" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/console/organizer/events"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Events</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition shadow-2xs cursor-pointer"
            >
              Copy Link
            </button>
            <Link
              href={`/events/${id}`}
              className="rounded-full bg-zinc-950 text-white px-4 py-1.5 text-xs font-semibold hover:bg-zinc-800 transition shadow-xs"
            >
              Public Page
            </Link>
          </div>
        </div>

        {/* Event Header Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="capitalize">{event.status.toLowerCase()}</span>
                <span>•</span>
                <span>{event.time_display || event.start_time || "Date to be announced"}</span>
              </div>
              <h1 className="text-2xl font-bold font-heading text-zinc-950 tracking-tight">
                {event.title}
              </h1>
              <p className="text-xs text-zinc-500">
                {event.location || "Location to be announced"}
              </p>
            </div>

            {/* Segmented Tab Controls */}
            <div className="inline-flex rounded-full bg-zinc-100 p-1 border border-zinc-200/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("guests")}
                className={`rounded-full px-4 py-1 text-xs font-medium transition ${
                  activeTab === "guests"
                    ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Guest Roster
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`rounded-full px-4 py-1 text-xs font-medium transition ${
                  activeTab === "edit"
                    ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Edit Details
              </button>
            </div>
          </div>

          {/* Authentic Real Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-100">
            <div>
              <div className="text-[11px] font-medium text-zinc-500">Total Capacity</div>
              <div className="text-xl font-bold font-heading text-zinc-950 mt-0.5 tabular-nums">
                {totalCapacity}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{event.tiers.length} tier{event.tiers.length > 1 ? "s" : ""}</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-zinc-500">Confirmed RSVPs</div>
              <div className="text-xl font-bold font-heading text-zinc-950 mt-0.5 tabular-nums">
                {confirmedCount}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">attendees</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-zinc-500">Waitlist</div>
              <div className="text-xl font-bold font-heading text-zinc-950 mt-0.5 tabular-nums">
                {waitlistCount}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">in queue</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-zinc-500">Remaining Spots</div>
              <div className="text-xl font-bold font-heading text-zinc-950 mt-0.5 tabular-nums">
                {remainingCapacity}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">available</div>
            </div>
          </div>
        </div>

        {/* View 1: Guest Roster */}
        {activeTab === "guests" && (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === "all"
                      ? "bg-zinc-950 text-white font-semibold"
                      : "text-zinc-600 hover:text-zinc-950 bg-zinc-100"
                  }`}
                >
                  All ({attendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("confirmed")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === "confirmed"
                      ? "bg-zinc-950 text-white font-semibold"
                      : "text-zinc-600 hover:text-zinc-950 bg-zinc-100"
                  }`}
                >
                  Confirmed ({confirmedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("waitlist")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === "waitlist"
                      ? "bg-zinc-950 text-white font-semibold"
                      : "text-zinc-600 hover:text-zinc-950 bg-zinc-100"
                  }`}
                >
                  Waitlist ({waitlistCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search attendee by name or email..."
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition w-full sm:w-64"
                />
                {attendees.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition shrink-0"
                  >
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {/* Attendees Table or Honest Zero State */}
            {filteredAttendees.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-zinc-950 font-heading">
                  {attendees.length === 0 ? "No attendees registered yet" : "No matching attendees"}
                </div>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {attendees.length === 0
                    ? "Share your public event link with your audience to start accepting registrations."
                    : "Try adjusting your search or filter terms."}
                </p>
                {attendees.length === 0 && (
                  <div className="pt-2">
                    <button
                      onClick={handleCopyLink}
                      className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 px-5 py-1.5 text-xs font-semibold transition"
                    >
                      Copy Event Link
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Attendee</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredAttendees.map((att) => (
                      <tr key={att.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-950">{att.name}</div>
                          <div className="text-zinc-500 text-[11px]">{att.email}</div>
                        </td>
                        <td className="py-3 px-4 text-zinc-700 font-medium">
                          {att.tierName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              att.status === "CONFIRMED" || att.status === "CHECKED_IN"
                                ? "bg-zinc-100 text-zinc-900"
                                : att.status === "CANCELLED" || att.status === "REFUNDED"
                                ? "bg-zinc-100 text-zinc-500 line-through"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                          {att.ticketCode}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-[11px]">
                          {new Date(att.registeredAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View 2: Edit Event Details */}
        {activeTab === "edit" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
            <form onSubmit={handleSaveChanges} className="space-y-6">
              <div className="space-y-1 pb-4 border-b border-zinc-100">
                <h2 className="text-base font-bold font-heading text-zinc-950">
                  Edit Event Setup
                </h2>
                <p className="text-xs text-zinc-500">
                  Update event name, venue, schedule, and ticket tiers.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 font-heading">
                  Event Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Event overview, agenda, or prerequisites..."
                  className="w-full rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition resize-y"
                />
              </div>

              {/* Location & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Venue name, address, or Virtual"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Start Date & Time
                  </label>
                  <input
                    type="text"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    placeholder="e.g. 2026-10-15T10:00:00Z"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
              </div>

              {/* Banners: 16:9 and 1:1 (Rule Enforced) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-700">
                      16:9 Landscape Banner URL
                    </label>
                    <span className="text-[10px] text-zinc-400">Hero & Featured</span>
                  </div>
                  <input
                    type="url"
                    value={editBannerUrl}
                    onChange={(e) => setEditBannerUrl(e.target.value)}
                    placeholder="https://... 16:9 image link"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-700">
                      1:1 Square Banner URL
                    </label>
                    <span className="text-[10px] text-zinc-400">Poster & Cards</span>
                  </div>
                  <input
                    type="url"
                    value={editSquareBannerUrl}
                    onChange={(e) => setEditSquareBannerUrl(e.target.value)}
                    placeholder="https://... 1:1 image link"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
              </div>

              {/* Ticket Tiers */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 font-heading">
                    Admission Tiers
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newTier: TicketTier = {
                        id: `tier_${Date.now()}`,
                        event_id: id,
                        name: `Tier ${editTiers.length + 1}`,
                        total_capacity: 50,
                        remaining_capacity: 50,
                        price_cents: 0,
                      };
                      setEditTiers([...editTiers, newTier]);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-950 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Add Tier</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editTiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const updated = [...editTiers];
                          updated[idx] = { ...tier, name: e.target.value };
                          setEditTiers(updated);
                        }}
                        placeholder="Tier Name"
                        className="flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-500">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={Math.round((tier.price_cents || 0) / 100)}
                            onChange={(e) => {
                              const updated = [...editTiers];
                              updated[idx] = {
                                ...tier,
                                price_cents: Math.max(0, Number(e.target.value)) * 100,
                              };
                              setEditTiers(updated);
                            }}
                            className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-500">Cap</span>
                          <input
                            type="number"
                            min="1"
                            value={tier.total_capacity}
                            onChange={(e) => {
                              const updated = [...editTiers];
                              const newCap = Math.max(1, Number(e.target.value));
                              updated[idx] = {
                                ...tier,
                                total_capacity: newCap,
                                remaining_capacity: newCap,
                              };
                              setEditTiers(updated);
                            }}
                            className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900"
                          />
                        </div>

                        {editTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditTiers(editTiers.filter((_, i) => i !== idx))}
                            className="text-zinc-400 hover:text-red-600 p-1 transition"
                            aria-label="Delete tier"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("guests")}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 px-6 py-2 text-xs font-semibold shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="rounded-xl border border-red-200/80 bg-red-50/20 p-5 mt-6 space-y-3">
              <div>
                <h3 className="text-xs font-bold font-heading text-red-950 uppercase tracking-wider">
                  Danger Zone
                </h3>
                <p className="text-xs text-zinc-600 mt-1">
                  Permanently remove this event from your host dashboard. Records including payment transactions and attendee manifests will be archived and retained by Super Admin for platform compliance.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setDeleteConfirmName("");
                  }}
                  className="rounded-full border border-red-300 bg-white text-red-600 hover:bg-red-50 px-4 py-1.5 text-xs font-semibold shadow-2xs transition"
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal */}
        {isDeleteModalOpen && event && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-heading text-zinc-950 tracking-tight">
                  Delete Event
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-body">
                  This will delete <span className="font-bold text-zinc-900 font-heading">"{event.title}"</span> from your host dashboard. Active listings and attendee rosters will be removed from your view, but all payment records, ticket logs, and compliance manifests will be archived and retained by Super Admin.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-zinc-700 block font-heading">
                  To confirm, type <span className="font-mono font-bold text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded select-all">{event.title}</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={`Type "${event.title}"`}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmName("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 rounded-full transition font-heading"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmName.trim() !== event.title.trim() || isDeleting}
                  onClick={handleConfirmDeleteEvent}
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-full transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed font-heading"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete Event"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
