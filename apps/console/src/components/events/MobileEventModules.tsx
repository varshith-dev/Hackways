"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Ticket,
  Users,
  Plus,
  ShoppingBag,
  Camera,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  getEvent,
  getEventAttendees,
  getAllOrders,
  checkInAttendee,
  saveEvent,
  StoredAttendee,
} from "@/lib/api";
import { EventItem, TicketTier } from "@/lib/types";
import CameraScanner from "@/components/events/CameraScanner";

/* -------------------------------------------------------------------------- */
/* 1. MOBILE EVENT CHECK-IN TAB                                               */
/* -------------------------------------------------------------------------- */
export function MobileEventCheckinTab({ eventId, event }: { eventId: string; event: EventItem | null }) {
  const { showToast } = useToast();
  const [attendees, setAttendees] = useState<StoredAttendee[]>([]);
  const [search, setSearch] = useState("");
  const [code, setCode] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: "VALID" | "ALREADY_USED" | "INVALID";
    message: string;
    attendee?: StoredAttendee;
  } | null>(null);

  const refresh = () => {
    setAttendees(getEventAttendees(eventId));
  };

  useEffect(() => {
    refresh();
  }, [eventId]);

  const handleCheckIn = (codeToScan: string) => {
    const trimmed = codeToScan.trim().toUpperCase();
    if (!trimmed) {
      showToast("Please enter a ticket code.");
      return;
    }
    const res = checkInAttendee(trimmed, eventId);
    if (res.success && res.attendee) {
      setScanResult({ status: "VALID", message: res.message, attendee: res.attendee });
      showToast(res.message);
      setCode("");
      refresh();
    } else if (res.attendee) {
      setScanResult({ status: "ALREADY_USED", message: res.message, attendee: res.attendee });
      showToast(res.message);
    } else {
      setScanResult({ status: "INVALID", message: res.message });
      showToast(res.message);
    }
  };

  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const total = attendees.length;
  const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  const filtered = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.ticketCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[600px] mx-auto py-2 px-1 space-y-7 font-sans">
      {/* Heading matching CreationForm.module.css */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#202022] leading-tight">
          Door Check-in
        </h1>
        <p className="mt-1 text-sm text-[#707077]">
          {checkedInCount} of {total} guests checked in ({rate}%)
        </p>

        {/* Minimal 3px Progress Line */}
        <div className="w-full h-1 mt-3.5 rounded-full bg-[#dedee2] overflow-hidden">
          <div
            className="h-full bg-[#202022] rounded-full transition-all duration-300"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* Ticket Code Entry: Clean border-bottom input matching CreationForm */}
      <div>
        <label className="block text-sm font-medium text-[#202022] mb-1">
          Validate ticket
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheckIn(code);
          }}
          className="flex items-center gap-3 pt-1"
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. HKW-58195"
            className="flex-1 bg-transparent border-0 border-b border-[#dedee2] py-2 text-sm text-[#202022] placeholder:text-[#707077] focus:outline-none focus:border-b-[#202022] transition"
          />
          <button
            type="button"
            onClick={() => setIsCameraActive(!isCameraActive)}
            className="p-2 text-[#707077] hover:text-[#202022] transition"
            aria-label="Scan with camera"
          >
            <Camera size={18} strokeWidth={1.5} />
          </button>
          <button
            type="submit"
            disabled={!code.trim()}
            className="px-5 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 active:scale-95 transition disabled:opacity-30 shrink-0"
          >
            Check in
          </button>
        </form>

        {isCameraActive && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#dedee2]">
            <CameraScanner
              open={isCameraActive}
              onClose={() => setIsCameraActive(false)}
              onDetect={(scannedCode: string) => {
                handleCheckIn(scannedCode);
                setIsCameraActive(false);
              }}
              result={scanResult?.attendee?.ticketCode || ""}
            />
          </div>
        )}
      </div>

      {/* Result feedback */}
      {scanResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
            scanResult.status === "VALID"
              ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
              : scanResult.status === "ALREADY_USED"
              ? "bg-amber-50/80 border-amber-300 text-amber-950"
              : "bg-red-50/80 border-red-300 text-red-950"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {scanResult.status === "VALID" ? (
              <CheckCircle2 size={15} className="text-emerald-600" />
            ) : (
              <AlertCircle size={15} className="text-amber-600" />
            )}
            <span>{scanResult.message}</span>
          </div>
          {scanResult.attendee && (
            <div className="text-[11px] pt-1 border-t border-current/10">
              <span className="font-medium">{scanResult.attendee.name}</span> •{" "}
              <span>{scanResult.attendee.ticketCode}</span>
            </div>
          )}
        </div>
      )}

      {/* Guest Manifest List: Clean border-bottom search + divide-y rows */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#202022]">
            Guest manifest <span className="text-[#707077] font-normal">({filtered.length})</span>
          </h2>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-0 top-2.5 text-[#707077]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ticket code..."
            className="w-full bg-transparent border-0 border-b border-[#dedee2] pl-6 py-2 text-sm text-[#202022] placeholder:text-[#707077] focus:outline-none focus:border-b-[#202022] transition"
          />
        </div>

        <div className="divide-y divide-[#dedee2]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#707077]">
              No matching guests found.
            </div>
          ) : (
            filtered.map((att) => (
              <div
                key={att.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#202022] truncate">{att.name}</p>
                  <p className="text-xs text-[#707077] mt-0.5">{att.ticketCode}</p>
                </div>
                {att.status === "CHECKED_IN" ? (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                    Admitted
                  </span>
                ) : (
                  <button
                    onClick={() => handleCheckIn(att.ticketCode)}
                    className="px-3.5 py-1.5 rounded-full border border-[#c4c4c9] bg-white text-xs font-medium text-[#202022] hover:border-[#202022] active:scale-95 transition shrink-0"
                  >
                    Check in
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. MOBILE EVENT TICKETS TAB                                                */
/* -------------------------------------------------------------------------- */
export function MobileEventTicketsTab({ eventId, event }: { eventId: string; event: EventItem | null }) {
  const { showToast } = useToast();
  const [tiers, setTiers] = useState<TicketTier[]>(event?.tiers || []);
  const [showAddTier, setShowAddTier] = useState(false);
  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState("0");
  const [tierCap, setTierCap] = useState("50");

  useEffect(() => {
    if (event?.tiers) setTiers(event.tiers);
  }, [event]);

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) {
      showToast("Please enter a tier name.");
      return;
    }
    const newTier: TicketTier = {
      id: `tier_${Date.now()}`,
      event_id: eventId,
      name: tierName.trim(),
      price_cents: Math.max(0, Number(tierPrice) || 0) * 100,
      total_capacity: Math.max(1, Number(tierCap) || 50),
      remaining_capacity: Math.max(1, Number(tierCap) || 50),
    };
    const updated = [...tiers, newTier];
    setTiers(updated);
    if (event) {
      saveEvent({ ...event, tiers: updated });
    }
    setTierName("");
    setShowAddTier(false);
    showToast(`Tier "${newTier.name}" added successfully.`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-950 font-heading">Ticketing Tiers</h2>
          <p className="text-xs text-zinc-500">Manage admission capacities and prices</p>
        </div>
        <button
          onClick={() => setShowAddTier(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
        >
          <Plus size={13} />
          <span>Add Tier</span>
        </button>
      </div>

      {/* Add Tier Modal */}
      {showAddTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 font-heading">New Admission Tier</h3>
            <form onSubmit={handleAddTier} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Tier Name</label>
                <input
                  type="text"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="e.g. VIP Pass, Early Bird"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-950"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={tierCap}
                    onChange={(e) => setTierCap(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-950"
                    required
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTier(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Cards Feed */}
      <div className="space-y-3">
        {tiers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 bg-white text-xs text-zinc-500">
            No ticket tiers configured. Tap &quot;Add Tier&quot; to configure event admission.
          </div>
        ) : (
          tiers.map((t) => {
            const sold = Math.max(0, (t.total_capacity || 0) - (t.remaining_capacity ?? t.total_capacity ?? 0));
            const pct = Math.min(100, Math.round((sold / (t.total_capacity || 1)) * 100));
            const price = t.price_cents ? t.price_cents / 100 : 0;

            return (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-zinc-950">{t.name}</h3>
                    <div className="text-[11px] font-semibold text-zinc-600">
                      {price === 0 ? "Free Pass" : `₹${price.toLocaleString()}`}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-bold">
                    {sold} / {t.total_capacity} sold
                  </span>
                </div>

                <div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. MOBILE EVENT ATTENDEES TAB                                              */
/* -------------------------------------------------------------------------- */
export function MobileEventAttendeesTab({ eventId }: { eventId: string }) {
  const [attendees, setAttendees] = useState<StoredAttendee[]>([]);
  const [filter, setFilter] = useState<"all" | "confirmed" | "checked_in" | "waitlist">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAttendees(getEventAttendees(eventId));
  }, [eventId]);

  const filtered = attendees.filter((a) => {
    if (filter === "confirmed" && a.status !== "CONFIRMED" && a.status !== "CHECKED_IN") return false;
    if (filter === "checked_in" && a.status !== "CHECKED_IN") return false;
    if (filter === "waitlist" && a.status !== "WAITLIST") return false;
    if (
      search.trim() &&
      !a.name.toLowerCase().includes(search.toLowerCase()) &&
      !a.email.toLowerCase().includes(search.toLowerCase()) &&
      !a.ticketCode.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-zinc-950 font-heading">Attendee Manifest</h2>
        <p className="text-xs text-zinc-500">Registered guests, tickets, and check-in statuses</p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "all", label: `All (${attendees.length})` },
          { id: "confirmed", label: "Confirmed" },
          { id: "checked_in", label: "Checked In" },
          { id: "waitlist", label: "Waitlist" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f.id
                ? "bg-zinc-950 text-white font-semibold"
                : "bg-white border border-zinc-200 text-zinc-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or code..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs focus:outline-none focus:border-zinc-950"
        />
      </div>

      {/* Cards list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-zinc-200 text-xs text-zinc-500">
            No matching attendees found.
          </div>
        ) : (
          filtered.map((att) => (
            <div
              key={att.id}
              className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-950 truncate">{att.name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{att.email}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    att.status === "CHECKED_IN"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : att.status === "CONFIRMED"
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {att.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-100">
                <span>{att.tierName || "General Pass"}</span>
                <span className="font-mono font-medium text-zinc-600">{att.ticketCode}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. MOBILE EVENT ORDERS TAB                                                 */
/* -------------------------------------------------------------------------- */
export function MobileEventOrdersTab({ eventId }: { eventId: string }) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const all = getAllOrders();
    setOrders(all.filter((o: any) => o.eventId === eventId));
  }, [eventId]);

  const gross = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="p-4 space-y-4">
      {/* Sales Summary Card */}
      <div className="p-4 rounded-2xl bg-zinc-950 text-white shadow-md space-y-1">
        <div className="text-xs text-zinc-400">Total Ticket Orders</div>
        <div className="text-2xl font-extrabold tracking-tight tabular-nums">
          ₹{gross.toLocaleString()}
        </div>
        <div className="text-[11px] text-zinc-400">{orders.length} orders settled</div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
          Orders Ledger
        </h3>
        {orders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-zinc-200 text-xs text-zinc-500">
            No orders for this event yet.
          </div>
        ) : (
          orders.map((o, idx) => (
            <div
              key={o.id || idx}
              className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-zinc-950">{o.userName || o.customerName || "Pass Purchase"}</div>
                <div className="text-[11px] font-mono text-zinc-400">{o.id || `ORD-${idx + 1}`}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-zinc-950 tabular-nums">
                  ₹{(o.amount || 0).toLocaleString()}
                </div>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Settled
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. MOBILE EVENT GENERIC MODULE FALLBACK                                    */
/* -------------------------------------------------------------------------- */
export function MobileEventGenericModuleTab({
  eventId,
  event,
  tab,
}: {
  eventId: string;
  event: EventItem | null;
  tab: string;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto">
          <Ticket size={22} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-950 capitalize">{tab} Module</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Configured for {event?.title || "this drop"}. Advanced settings can also be edited from desktop.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-2">
          <Link
            href={`/mobile/events/${encodeURIComponent(eventId)}/overview`}
            className="px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-semibold"
          >
            Back to Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
