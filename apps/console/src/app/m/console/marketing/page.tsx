"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Copy,
  Plus,
  Check,
  Tag,
  Calendar,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getStoredEvents } from "@/lib/api";
import { EventItem } from "@/lib/types";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";

export interface ExtendedPromoCode {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountPct?: number;
  eventId?: string;
  eventName?: string;
  limit?: number;
  usedCount: number;
  maxDiscount?: number;
  minOrderValue?: number;
  restrictedToEmail?: string;
  validUntil?: string;
  created_at?: string;
}

const DEFAULT_PROMOS: ExtendedPromoCode[] = [
  { id: "pr_1", code: "EARLY20", discountType: "percentage", discountValue: 20, discountPct: 20, usedCount: 18, limit: 50 },
  { id: "pr_2", code: "SAVE10", discountType: "percentage", discountValue: 10, discountPct: 10, usedCount: 42, limit: 100 },
  { id: "pr_3", code: "VIPPASS", discountType: "percentage", discountValue: 30, discountPct: 30, usedCount: 5, limit: 10, restrictedToEmail: "vip@guest.com" },
];

export default function MobileMarketingPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"promos" | "links">("promos");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [promos, setPromos] = useState<ExtendedPromoCode[]>(DEFAULT_PROMOS);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadPromos = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hackways_promo_codes");
      if (stored) {
        try {
          setPromos(JSON.parse(stored));
        } catch {
          setPromos(DEFAULT_PROMOS);
        }
      } else {
        localStorage.setItem("hackways_promo_codes", JSON.stringify(DEFAULT_PROMOS));
        setPromos(DEFAULT_PROMOS);
      }
    }
  };

  useEffect(() => {
    setEvents(getStoredEvents().filter((e) => e.status !== "DELETED"));
    loadPromos();
    window.addEventListener("hackways_promos_updated", loadPromos);
    return () => window.removeEventListener("hackways_promos_updated", loadPromos);
  }, []);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      showToast(`${label} copied.`);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="marketing"
        title="Promotions"
        subtitle="Discounts & referral campaigns"
        rightAction={
          <Link
            href="/m/console/marketing/create"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202022] text-white text-xs font-medium whitespace-nowrap shrink-0 hover:opacity-90 transition active:scale-95"
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Add Promo</span>
          </Link>
        }
      />

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-[600px] mx-auto w-full pb-20">
        {/* Tab Pills */}
        <div className="flex items-center gap-2 border-b border-[#dedee2] pb-2">
          <button
            onClick={() => setActiveTab("promos")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap shrink-0 ${
              activeTab === "promos"
                ? "bg-[#202022] text-white"
                : "bg-white border border-[#dedee2] text-[#707077] hover:text-[#202022]"
            }`}
          >
            Promo Codes ({promos.length})
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap shrink-0 ${
              activeTab === "links"
                ? "bg-[#202022] text-white"
                : "bg-white border border-[#dedee2] text-[#707077] hover:text-[#202022]"
            }`}
          >
            Event Links
          </button>
        </div>

        {/* Tab 1: Promo Codes (Clean Capsule Cards, No Progress Bars) */}
        {activeTab === "promos" && (
          <div className="space-y-3">
            {promos.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <Tag size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">No promo codes yet</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Create discount codes for events, influencers, or VIPs.
                  </p>
                </div>
                <Link
                  href="/m/console/marketing/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
                >
                  <Plus size={14} />
                  <span>Create Promo Code</span>
                </Link>
              </div>
            ) : (
              promos.map((p) => {
                const discountLabel =
                  p.discountType === "fixed"
                    ? `₹${p.discountValue} off`
                    : `${p.discountValue || p.discountPct}% off`;

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-zinc-100 font-mono font-bold text-xs text-zinc-950 tracking-wider">
                          {p.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          {discountLabel}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(p.code, "Promo Code")}
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition"
                        aria-label="Copy code"
                      >
                        {copiedCode === p.code ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>

                    {/* Capsule Tags for Event Scope, Limits & Restrictions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {/* Event Scope */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-medium">
                        <Calendar size={11} className="text-zinc-400" />
                        <span>{p.eventName || "All Events"}</span>
                      </span>

                      {/* Usage Capsule */}
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-medium">
                        {p.usedCount} of {p.limit && p.limit < 999999 ? p.limit : "∞"} used
                      </span>

                      {/* Specific Audience / Restrictions */}
                      {p.restrictedToEmail && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-medium">
                          <Lock size={10} className="text-amber-600" />
                          <span>{p.restrictedToEmail}</span>
                        </span>
                      )}

                      {/* Expiry Capsule */}
                      {p.validUntil && (
                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[11px]">
                          Exp: {p.validUntil}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Shareable Event Links */}
        {activeTab === "links" && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white border border-zinc-200 text-xs text-zinc-500">
                No events found.
              </div>
            ) : (
              events.map((ev) => {
                const link = typeof window !== "undefined" ? `${window.location.origin}/events/${ev.id}` : `/events/${ev.id}`;
                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-950 truncate max-w-[200px]">
                        {ev.title}
                      </h3>
                      <button
                        onClick={() => handleCopy(link, "Event Link")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition"
                      >
                        {copiedCode === link ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono truncate bg-zinc-50 p-2 rounded-xl">
                      {link}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
