"use client";

import React, { useState, useEffect } from "react";
import { getPlatformMetrics } from "@/lib/api";

export default function FinanceTaxPage() {
  const [totalGmv, setTotalGmv] = useState(0);

  useEffect(() => {
    const m = getPlatformMetrics();
    setTotalGmv(m.totalGmv);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">
            Tax & GST
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            GST compliance summaries and accounting invoices for ticket revenue.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 transition shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          Download Statement (PDF)
        </button>
      </div>

      {/* Tax Breakdown Card */}
      <div className="p-6 rounded-lg border border-zinc-200 bg-white shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-zinc-950">Tax Invoice Assessment</h3>

        <div className="space-y-3 text-xs divide-y divide-zinc-100">
          <div className="flex items-center justify-between pt-1">
            <span className="text-zinc-600">Total Taxable Value</span>
            <span className="font-mono font-bold text-zinc-950 text-sm">
              Unavailable
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <div>
              <span className="text-zinc-600">Recorded GST</span>
            </div>
            <span className="font-mono text-zinc-800 text-sm">
              Unavailable
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 font-bold text-base">
            <span>Recorded Ticket Revenue</span>
            <span className="font-mono text-zinc-950">
              ₹{totalGmv.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">Tax records are not connected</span>
          <button
            type="button"
            disabled
            className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 underline transition cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
