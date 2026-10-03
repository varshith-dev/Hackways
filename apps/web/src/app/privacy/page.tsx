import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Hackways",
  description:
    "How Hackways collects, uses, and protects personal data for event ticketing.",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicSiteLayout>
      <article className="py-16 sm:py-24 bg-white text-zinc-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header with Halftone Lock Asset */}
          <header className="border-b border-zinc-200/80 pb-8 mb-10">
            <div className="mb-6">
              <img
                src="/privacy-lock-png.png"
                alt="Privacy Lock"
                className="h-14 w-auto sm:h-16 object-contain select-none"
              />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500">
              Last updated September 2026
            </p>
          </header>

          {/* Legal Body */}
          <div className="space-y-10 text-sm sm:text-base leading-relaxed text-zinc-700">
            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                1. Overview
              </h2>
              <p>
                Hackways Inc. (&quot;Hackways,&quot; &quot;we,&quot; &quot;our&quot;) provides an event infrastructure and instant RSVP platform. This Privacy Policy explains what personal information we collect, how we process it, and your rights under applicable data protection legislation, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                2. Information We Collect
              </h2>
              <p className="mb-3">
                We adhere to strict data minimization. We only collect information necessary to issue passes and operate event capacity:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600">
                <li>
                  <strong className="text-zinc-900 font-medium">Attendee Information:</strong> Full name and email address provided during ticket reservation.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Organizer Information:</strong> Name, work email, and authentication credentials for event hosts.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Technical Data:</strong> IP address, browser type, and transaction timestamps necessary to prevent botting, enforce rate limits, and maintain capacity integrity.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                3. Purpose and Legal Basis
              </h2>
              <p className="mb-3">
                We process your personal information under the following legal bases:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-600">
                <li>
                  <strong className="text-zinc-900 font-medium">Contract Performance:</strong> To issue digital passes, generate admission QR codes, and record event RSVPs.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Legitimate Interests:</strong> To protect our platform from automated ticket hoarding, fraud, and race conditions.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Legal Obligation:</strong> To maintain transaction records required by financial and tax regulations.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                4. Zero Data Selling
              </h2>
              <p>
                We do not sell, rent, or trade personal data to third parties, data brokers, or advertising networks. Attendee information is never monetized.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                5. Data Retention
              </h2>
              <p>
                We retain personal data only as long as required to fulfill the purposes outlined in this policy. Concurrency logs are purged within 7 days. Attendee records are maintained until 90 days after the event concludes, unless you request earlier deletion.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                6. Security
              </h2>
              <p>
                All network communication is encrypted using TLS 1.3. Ticket tokens and check-in signatures are cryptographically signed to prevent duplication and unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                7. Your Rights
              </h2>
              <p className="mb-3">
                You have the right to request access to, rectification of, or erasure of your personal data. You may also request a copy of your data in a structured, commonly used format.
              </p>
              <p>
                To exercise any of these rights, contact us at <a href="mailto:privacy@hackways.io" className="text-zinc-950 underline font-medium">privacy@hackways.io</a>.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-950 mb-3">
                8. Contact
              </h2>
              <p>
                For questions regarding this policy, email <a href="mailto:privacy@hackways.io" className="text-zinc-950 underline font-medium">privacy@hackways.io</a>.
              </p>
            </section>
          </div>
        </div>
      </article>
    </PublicSiteLayout>
  );
}
