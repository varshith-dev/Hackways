"use client";

import React, { useState, useEffect } from "react";
import PublicSiteLayout from "@/components/layout/PublicSiteLayout";

export default function CookiePolicyPage() {
  const [telemetry, setTelemetry] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const pref = localStorage.getItem("hackways_telemetry");
    if (pref !== null) setTelemetry(pref === "true");
  }, []);

  const handleToggle = (val: boolean) => {
    setTelemetry(val);
    localStorage.setItem("hackways_telemetry", String(val));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PublicSiteLayout>
      <div className="py-20 sm:py-28 bg-white text-zinc-900">
        <div className="mx-auto max-w-2xl px-6">
          {/* Header with Halftone Cookie Asset */}
          <div className="mb-6">
            <img
              src="/cookie-policy-ht-png.png"
              alt="Cookie Policy"
              className="h-14 w-auto sm:h-16 object-contain select-none"
            />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Cookies & Privacy
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            Last updated September 2026
          </p>

          <div className="mt-12 space-y-10 text-sm leading-relaxed text-zinc-700">
            <section>
              <h2 className="font-heading text-base font-semibold text-zinc-950 mb-2">
                No tracking pixels. No ad cookies.
              </h2>
              <p>
                We do not use third-party marketing cookies, Google Analytics, or social media tracking pixels. We don&apos;t follow you around the web, and we don&apos;t sell browsing data to anyone.
              </p>
            </section>

            <section>
              <h2 className="font-heading text-base font-semibold text-zinc-950 mb-2">
                What we store
              </h2>
              <p className="mb-3 text-zinc-600">
                We only store what is strictly required to run the platform:
              </p>
              <ul className="space-y-3 text-zinc-600 pl-4 border-l border-zinc-200">
                <li>
                  <strong className="text-zinc-900 font-medium">Session token:</strong> Keeps you signed in securely to your account.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Security token:</strong> Protects form submissions from cross-site forgery.
                </li>
                <li>
                  <strong className="text-zinc-900 font-medium">Live connection state:</strong> Maintains real-time seat counts during active drops without reloading.
                </li>
              </ul>
            </section>

            <section className="pt-8 border-t border-zinc-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading text-base font-semibold text-zinc-950">
                    Anonymous error diagnostics
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Helps us catch server disconnects and dropped registrations during high-concurrency drops.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(!telemetry)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                    telemetry ? "bg-zinc-950" : "bg-zinc-200"
                  }`}
                  aria-label="Toggle anonymous diagnostics"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-0.5 ml-0.5 ${
                      telemetry ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {saved && (
                <p className="text-xs text-zinc-500 mt-2">Saved.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </PublicSiteLayout>
  );
}
