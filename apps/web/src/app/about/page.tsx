import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";
import { ArrowRightIcon } from "@/components/icons/hugeicons";

export const metadata: Metadata = {
  title: "About — Hackways",
  description: "Why we built Hackways: honest capacity management and zero-friction event ticketing.",
};

export default function AboutPage() {
  return (
    <PublicSiteLayout>
      <div className="py-20 sm:py-28 bg-white text-zinc-900">
        <div className="mx-auto max-w-2xl px-6">
          {/* Header with Halftone Info Asset */}
          <div className="mb-6">
            <img
              src="/info.png"
              alt="About Hackways"
              className="h-14 w-auto sm:h-16 object-contain select-none"
            />
          </div>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-zinc-950">
            About Hackways
          </h1>

          <div className="mt-10 space-y-8 text-sm sm:text-base leading-relaxed text-zinc-700">
            <p className="text-base sm:text-lg text-zinc-900 font-medium leading-relaxed">
              We built Hackways because registering for high-demand events online is broken. Traditional ticketing sites crash when registrations open, lock attendees into fake waiting rooms, and frequently oversell venues.
            </p>

            <p>
              Hackways is engineered from the ground up for high-concurrency event drops: hackathons, developer conferences, tech summits, and cultural gatherings.
            </p>

            <div className="pt-6 border-t border-zinc-200">
              <h2 className="font-heading text-lg font-bold text-zinc-950 mb-3">
                How it works
              </h2>
              <ul className="space-y-4 text-sm text-zinc-600">
                <li>
                  <strong className="text-zinc-900 font-medium">Atomic capacity locks:</strong> Every admission spot is claimed through an atomic decrement in our Go core. Capacity can never drop below zero, mathematically eliminating oversold rooms and duplicate tickets.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Live seat streams:</strong> When spots are claimed or released, the remaining counter updates across all active browser windows in real time via Server-Sent Events. What you see is true availability.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Three-second RSVPs:</strong> Attendees don&apos;t need to make complex accounts or navigate multi-page checkout funnels. Name and email are all that&apos;s needed to generate a cryptographic pass and QR badge.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Free for community events:</strong> We believe developer meetups, student hackathons, and open workshops are essential to tech culture. We never charge convenience fees or platform percentages on free events.
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-zinc-200">
              <h2 className="font-heading text-lg font-bold text-zinc-950 mb-3">
                The team
              </h2>
              <p>
                Hackways is built by software engineers who got tired of watching hackathons and tech meetups fail on registration day. We care deeply about distributed concurrency, simple interfaces, and respecting people&apos;s time.
              </p>
            </div>

            <div className="pt-8 border-t border-zinc-200 flex items-center gap-4">
              <Link
                href="/create"
                className="rounded-full bg-zinc-950 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition"
              >
                Host an Event
              </Link>
              <Link
                href="/home"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition inline-flex items-center gap-1.5"
              >
                <span>Explore drops</span>
                <ArrowRightIcon size={13} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicSiteLayout>
  );
}
