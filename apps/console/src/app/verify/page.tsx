import React from "react";
import Link from "next/link";
import { serverStore } from "@/lib/serverStore";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { webAppHref } from "@/lib/webAppUrl";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; id?: string; success?: string }>;
}) {
  const { token, id, success } = await searchParams;

  let isVerified = success === "true";
  let userEmail = "";

  if (token && !isVerified) {
    let user = id ? serverStore.getUserById(id) : null;
    if (!user) {
      user = serverStore.getUserByVerificationToken(token);
    }
    if (user && (user.verificationToken === token || user.verificationStatus === "PENDING")) {
      serverStore.updateUserVerification(user.id, "VERIFIED");
      isVerified = true;
      userEmail = user.email;
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-body">
      <AppHeader theme="light" transparent={false} />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-xs text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold font-heading text-zinc-950">
              {isVerified ? "Account Verified Successfully!" : "Account Verification"}
            </h1>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              {isVerified
                ? `Your account ${userEmail ? `(${userEmail}) ` : ""}is now fully verified. You can host drops, reserve tickets, and access organizer dashboards.`
                : "Your verification request is being processed or the link has already been verified."}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/console/organizer/events"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-zinc-950 text-white font-semibold text-xs hover:bg-zinc-800 transition"
            >
              Open Console
            </Link>
            <Link
              href={webAppHref("/events")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 transition"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
