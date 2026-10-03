"use client";

import React, { useState, useEffect } from "react";
import DashboardArtwork from "@/components/ui/DashboardArtwork";

export default function FinancePayoutsPage() {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hackways_payout_bank");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.bankName) setBankName(parsed.bankName);
          if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
        } catch {}
      }
    }
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            Payout Transfers
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Payout transfer records will appear when a payment provider is connected.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-950 transition shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          Instant Transfer
        </button>
      </div>

      {/* Scheduled Sweep Banner */}
      <div className="p-5 rounded-lg border border-zinc-200 bg-white space-y-4 shadow-2xs">
        <div>
          <h3 className="text-xs font-bold text-zinc-950">Automated Daily Transfers</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Automated transfers are not connected. No payout schedule is available.
          </p>
        </div>

        <div className="border border-zinc-100 rounded-md bg-zinc-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-zinc-900">Next Scheduled Sweep</div>
            <div className="text-zinc-500 mt-0.5">{bankName && accountNumber ? `Saved destination: ${bankName} (•••• ${accountNumber.slice(-4)})` : "No payout account saved"}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-mono text-zinc-950">Unavailable</div>
            <div className="text-[11px] text-zinc-500 font-medium">Settlement balance not connected</div>
          </div>
        </div>
      </div>

      {/* Transfer History Table */}
      <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-zinc-200/80">
          <h4 className="text-xs font-semibold text-zinc-900">Transfer History</h4>
        </div>

          <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
            <DashboardArtwork kind="revenue" />
            <p className="font-semibold text-zinc-700">Transfer history unavailable</p>
            <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
              A connected payment provider is required to retrieve transfer records.
            </p>
          </div>
      </div>
    </div>
  );
}
