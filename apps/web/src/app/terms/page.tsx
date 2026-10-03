import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Hackways",
  description: "Terms and conditions governing the use of the Hackways event platform.",
};

export default function TermsOfServicePage() {
  return (
    <PublicSiteLayout>
      <article className="py-16 sm:py-24 bg-white text-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header with Halftone Terms Asset */}
          <header className="border-b border-zinc-200/80 pb-8 mb-10">
            <div className="mb-6">
              <img
                src="/tc-hlftone-png.png"
                alt="Terms of Service"
                className="h-14 w-auto sm:h-16 object-contain select-none"
              />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500">
              Last updated September 2026
            </p>
          </header>

          {/* Legal Content */}
          <div className="space-y-10 text-sm sm:text-base leading-relaxed text-zinc-700">
            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                1. Agreement to Terms
              </h2>
              <p>
                By creating an account, hosting an event drop, or claiming a ticket pass on Hackways, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the platform.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                2. Host Responsibilities
              </h2>
              <p className="mb-3">
                Event hosts are responsible for the accuracy of event descriptions, venue capacity limits, dates, and local compliance. Hosts warrant that:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600">
                <li>They hold all necessary permits and licenses for their physical or virtual event.</li>
                <li>They will not misrepresent capacity limits or schedule fraudulent releases.</li>
                <li>They will honor confirmed digital passes presented at gate check-in.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                3. Attendee Passes and Anti-Scalping
              </h2>
              <p>
                Passes issued through Hackways are revocable personal permits. Reselling, auctioning, or transferring passes for commercial gain above face value is prohibited. Tickets identified on secondary ticket broker marketplaces may be cancelled without refund.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                4. Concurrency and Capacity Locks
              </h2>
              <p>
                Hackways enforces atomic seat reservation logic to ensure capacity counts do not oversell. Users agree not to utilize automated scripts, headless browsers, or bot networks to hoard tickets or circumvent rate limits.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                5. Fees and Payments
              </h2>
              <p>
                Free community events carry a 0% platform fee. For paid event drops, fees are assessed per transaction as outlined on our <Link href="/pricing" className="text-zinc-950 underline font-medium">Pricing Page</Link>. In the event of event cancellation by the host, the host is responsible for issuing refunds to purchasers.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                6. Intellectual Property
              </h2>
              <p>
                The Hackways name, logo, software code, and design systems are the intellectual property of Hackways Inc. Event hosts retain ownership of all event branding, logos, and descriptions uploaded to their event listings.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                7. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms, execute bot attacks, or engage in abusive conduct.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                8. Limitation of Liability
              </h2>
              <p>
                Hackways is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind. Hackways is not liable for indirect, consequential, or punitive damages resulting from venue disputes, event postponements, or third-party connectivity disruptions.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                9. Governing Law
              </h2>
              <p>
                These Terms are governed by the laws of the State of Delaware, without regard to conflict of law rules.
              </p>
            </section>
          </div>
        </div>
      </article>
    </PublicSiteLayout>
  );
}
