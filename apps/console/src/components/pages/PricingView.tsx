"use client";

import React from "react";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";
import { CheckIcon, ArrowRightIcon } from "@/components/icons/hugeicons";
import { webAppHref } from "@/lib/webAppUrl";

const FREE_FEATURES = [
  "Unlimited free RSVPs",
  "Live capacity and an ordered waitlist",
  "Door check-in from any browser",
  "Your own community page",
];

const PAID_FEATURES = [
  "Everything in Free events",
  "Secure ticket checkout for attendees",
  "Automatic payouts to your account",
  "Tax and GST handled on every ticket",
  "The fee is paid by your attendee, not you",
];

export function PricingView() {
  return (
    <PublicSiteLayout>
      <div className="py-20 sm:py-28 bg-white text-zinc-900">
        <div className="mx-auto max-w-4xl px-6">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950">
              Pricing
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-500">
              Free events are always free. Ticketed events cost you nothing to host —
              the fee is paid by your attendee at checkout, not deducted from you.
            </p>
          </div>

          {/* 2 plans */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free events */}
            <div className="rounded-2xl border border-zinc-200/80 p-8 flex flex-col justify-between hover:border-zinc-300 transition">
              <div>
                <h2 className="font-heading text-lg font-bold text-zinc-950">Free events</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  For meetups, hackathons, and community gatherings with no ticket price.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-extrabold text-zinc-950">₹0</span>
                  <span className="text-xs text-zinc-500">forever</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs sm:text-sm text-zinc-600">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <CheckIcon size={14} className="text-zinc-900 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 pt-6 border-t border-zinc-100">
                <Link
                  href={webAppHref("/create")}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
                >
                  <span>Host a free event</span>
                  <ArrowRightIcon size={13} />
                </Link>
              </div>
            </div>

            {/* Ticketed events */}
            <div className="rounded-2xl border-2 border-zinc-900 bg-white p-8 flex flex-col justify-between shadow-lg">
              <div>
                <h2 className="font-heading text-lg font-bold text-zinc-950">Ticketed events</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  For events where attendees pay to get in.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-extrabold text-zinc-950">
                    ₹0<sup className="text-base align-super">*</sup>
                  </span>
                  <span className="text-xs text-zinc-500">to you</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  *A 5% fee, tax and GST included, is added to the ticket price and paid by
                  your attendee at checkout. You receive 100% of the price you set.
                </p>

                <ul className="mt-8 space-y-3 text-xs sm:text-sm text-zinc-600">
                  {PAID_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <CheckIcon size={14} className="text-zinc-900 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 pt-6 border-t border-zinc-100">
                <Link
                  href={webAppHref("/create")}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-zinc-950 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition"
                >
                  <span>Host a ticketed event</span>
                  <ArrowRightIcon size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Simple FAQ */}
          <div className="mt-24 pt-16 border-t border-zinc-200 max-w-2xl mx-auto">
            <h2 className="font-heading text-xl font-bold text-zinc-950 text-center mb-8">
              Common questions
            </h2>
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-medium text-zinc-950">Are free events really free?</h3>
                <p className="text-zinc-600 mt-1">
                  Yes. Free events have zero platform fees and zero convenience fees. No
                  card is required to publish one.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-950">Who pays the 5% fee on ticketed events?</h3>
                <p className="text-zinc-600 mt-1">
                  Your attendee does, added on top of your ticket price at checkout. You
                  are paid out the full price you set — nothing is deducted on your side.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-950">Does that 5% include tax?</h3>
                <p className="text-zinc-600 mt-1">
                  Yes. Tax and GST on the fee are calculated and collected automatically —
                  there is nothing extra for you to file on the fee itself.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-950">How does gate check-in work?</h3>
                <p className="text-zinc-600 mt-1">
                  You and your door staff open the host console on any phone or tablet
                  browser to scan attendee QR passes. No extra hardware needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicSiteLayout>
  );
}

export default PricingView;
