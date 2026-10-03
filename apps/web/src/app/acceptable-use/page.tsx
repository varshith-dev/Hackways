import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — Hackways",
  description: "Rules regarding prohibited behaviors, bot prevention, and security on Hackways.",
};

export default function AcceptableUsePolicyPage() {
  return (
    <PublicSiteLayout>
      <article className="py-16 sm:py-24 bg-white text-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header with Halftone Acceptable Use Asset */}
          <header className="border-b border-zinc-200/80 pb-8 mb-10">
            <div className="mb-6">
              <img
                src="/acceptanceofuse-hftone-png.png"
                alt="Acceptable Use"
                className="h-14 w-auto sm:h-16 object-contain select-none"
              />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
              Acceptable Use Policy
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500">
              Last updated September 2026
            </p>
          </header>

          {/* Content */}
          <div className="space-y-10 text-sm sm:text-base leading-relaxed text-zinc-700">
            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                1. Purpose
              </h2>
              <p>
                Hackways is designed for fair, zero-friction event access. This Acceptable Use Policy outlines prohibited actions across our website, APIs, check-in scanners, and ticketing endpoints.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                2. Automated Botting and Concurrency Abuse
              </h2>
              <p className="mb-3">
                You may not manipulate our concurrency locks or bypass rate limiters. Prohibited actions include:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600">
                <li>Deploying automated scripts, bots, or headless browsers to mass-claim passes during drops.</li>
                <li>Rotating proxies or forging IP headers to defeat rate-limiting token buckets.</li>
                <li>Sending abusive traffic intended to disrupt real-time Server-Sent Events (SSE) capacity streams.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                3. Prohibited Content and Events
              </h2>
              <p className="mb-3">
                Organizers may not use Hackways to host or sell admissions for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600">
                <li>Fraudulent or non-existent events designed to collect personal data or misappropriate payments.</li>
                <li>Unlicensed secondary ticket sales or scalping schemes.</li>
                <li>Events that incite violence, promote hate speech, or facilitate unlawful activities.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                4. Infrastructure and Security
              </h2>
              <p className="mb-3">
                Users may not:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600">
                <li>Attempt to forge cryptographic ticket tokens or falsify gate check-in signatures.</li>
                <li>Decompile, reverse engineer, or probe non-public API endpoints without written authorization.</li>
                <li>Scrape attendee lists or organizer rosters.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                5. Responsible Security Disclosure
              </h2>
              <p>
                Security researchers reporting vulnerabilities in good faith are granted safe harbor provided they report findings directly to <a href="mailto:security@hackways.io" className="text-zinc-950 underline font-medium">security@hackways.io</a> without accessing or modifying user data, and allow reasonable time for remediation prior to disclosure.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                6. Enforcement
              </h2>
              <p>
                Violations of this policy may result in ticket revocation, immediate account termination, IP blocking, and referral to relevant authorities.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                7. Reporting Violations
              </h2>
              <p>
                To report a violation, email <a href="mailto:security@hackways.io" className="text-zinc-950 underline font-medium">security@hackways.io</a>.
              </p>
            </section>
          </div>
        </div>
      </article>
    </PublicSiteLayout>
  );
}
