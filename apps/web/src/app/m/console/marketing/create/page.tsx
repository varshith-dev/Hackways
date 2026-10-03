"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Percent } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getStoredEvents } from "@/lib/api";
import { EventItem } from "@/lib/types";
import { ExtendedPromoCode } from "../page";

export default function MobileCreatePromoPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("20");
  const [eventScope, setEventScope] = useState<"all" | "specific">("all");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [limitType, setLimitType] = useState<"unlimited" | "custom">("custom");
  const [limit, setLimit] = useState("50");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [restrictedEmail, setRestrictedEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
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
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      showToast("Please enter a promo code.");
      return;
    }
    const val = Number(discountValue);
    if (!val || val <= 0) {
      showToast("Please enter a valid discount amount.");
      return;
    }

    setSubmitting(true);
    const chosenEvent = eventScope === "specific" ? events.find((ev) => ev.id === selectedEventId) : undefined;

    const newPromo: ExtendedPromoCode = {
      id: `pr_${Date.now()}`,
      code: cleanCode,
      discountType,
      discountValue: val,
      discountPct: discountType === "percentage" ? val : undefined,
      eventId: chosenEvent ? chosenEvent.id : undefined,
      eventName: chosenEvent ? chosenEvent.title : "All Events",
      limit: limitType === "unlimited" ? 999999 : Number(limit) || 50,
      usedCount: 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      minOrderValue: minOrder ? Number(minOrder) : undefined,
      restrictedToEmail: restrictedEmail.trim() || undefined,
      validUntil: validUntil || undefined,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hackways_promo_codes");
      const currentList: ExtendedPromoCode[] = stored
        ? JSON.parse(stored)
        : [
            { id: "pr_1", code: "EARLY20", discountType: "percentage", discountValue: 20, discountPct: 20, usedCount: 18, limit: 50 },
            { id: "pr_2", code: "SAVE10", discountType: "percentage", discountValue: 10, discountPct: 10, usedCount: 42, limit: 100 },
            { id: "pr_3", code: "VIPPASS", discountType: "percentage", discountValue: 30, discountPct: 30, usedCount: 5, limit: 10 },
          ];

      const updated = [newPromo, ...currentList];
      localStorage.setItem("hackways_promo_codes", JSON.stringify(updated));
      window.dispatchEvent(new Event("hackways_promos_updated"));
    }

    showToast(`Promo code "${cleanCode}" created.`);
    router.push("/m/console/marketing");
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 py-3.5 flex items-center justify-between">
        <Link
          href="/m/console/marketing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition"
        >
          <ArrowLeft size={16} />
          <span>Promotions</span>
        </Link>
        <span className="text-xs font-bold text-zinc-950">New Promo</span>
        <div className="w-10" />
      </header>

      {/* Main Content: iOS / Linear Clean Divider Rows (Zero Card Boxes) */}
      <main className="p-4 max-w-md mx-auto w-full space-y-6 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hero Code Display Input */}
          <div className="py-6 px-2 text-center border-b border-zinc-100">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">
              Promo Code
            </span>
            <input
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              placeholder="FLASH25"
              className="w-full text-center text-3xl sm:text-4xl font-mono font-black tracking-widest text-zinc-950 placeholder:text-zinc-200 bg-transparent outline-none uppercase"
              required
            />
            <p className="text-[11px] text-zinc-400 mt-2">
              Guests enter this code during checkout
            </p>
          </div>

          {/* Group 1: Discount Value & Format */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Discount
            </div>
            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
              {/* Value Row */}
              <div className="py-3.5 px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">
                  {discountType === "percentage" ? "Percentage Off" : "Discount Amount"}
                </span>
                <div className="flex items-center gap-1">
                  {discountType === "fixed" && <span className="text-xs font-bold text-zinc-400">₹</span>}
                  <input
                    type="number"
                    min="1"
                    max={discountType === "percentage" ? 100 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="20"
                    className="w-20 text-right text-sm font-bold text-zinc-950 outline-none bg-transparent tabular-nums"
                    required
                  />
                  {discountType === "percentage" && <span className="text-xs font-bold text-zinc-400">%</span>}
                </div>
              </div>

              {/* Type Switcher Row */}
              <div className="py-3 px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">Type</span>
                <div className="flex bg-zinc-100 p-0.5 rounded-full">
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      discountType === "percentage"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Percent (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      discountType === "fixed"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Fixed (₹)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Scope & Redemptions */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Application & Limit
            </div>
            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
              {/* Applies to Row */}
              <div className="py-3 px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">Scope</span>
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

              {/* Specific Event Selector if selected */}
              {eventScope === "specific" && (
                <div className="py-3 px-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Select Event</span>
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

              {/* Usage Limit Row */}
              <div className="py-3 px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">Limit</span>
                <div className="flex bg-zinc-100 p-0.5 rounded-full">
                  <button
                    type="button"
                    onClick={() => setLimitType("custom")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      limitType === "custom"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Capped
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitType("unlimited")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      limitType === "unlimited"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
              </div>

              {limitType === "custom" && (
                <div className="py-3.5 px-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Max Redemptions</span>
                  <input
                    type="number"
                    min="1"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="50"
                    className="w-20 text-right text-sm font-bold text-zinc-950 outline-none bg-transparent tabular-nums"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Group 3: Optional Eligibility */}
          <div className="space-y-1">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Optional Restrictions
            </div>
            <div className="divide-y divide-zinc-100 border-t border-b border-zinc-100 bg-white">
              {/* Restricted Email */}
              <div className="py-3.5 px-1 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-800 shrink-0">Recipient</span>
                <input
                  type="text"
                  value={restrictedEmail}
                  onChange={(e) => setRestrictedEmail(e.target.value)}
                  placeholder="Any guest (or name@email.com)"
                  className="w-full text-right text-xs font-medium text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
                />
              </div>

              {/* Expiry Date */}
              <div className="py-3.5 px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800">Expires</span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="text-xs font-medium text-zinc-900 outline-none bg-transparent text-right"
                />
              </div>
            </div>
          </div>

          {/* Bottom Capsule Action */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !code.trim() || !discountValue}
              className="w-full py-3.5 px-6 rounded-full bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Creating Promo...</span>
                </>
              ) : (
                <span>Create Promo Code</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
