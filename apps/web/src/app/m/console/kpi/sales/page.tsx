"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, CreditCard, ChevronRight } from "lucide-react";
import { getAllOrders, getPlatformMetrics } from "@/lib/api";
import AnalyticsChart from "../_components/AnalyticsChart";

export default function MobileSalesDetailPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalGmv: 0,
    totalOrders: 0,
    netRevenue: 0,
    platformFee: 0,
  });

  useEffect(() => {
    setOrders(getAllOrders());
    setMetrics(getPlatformMetrics());
  }, []);

  const avgOrder = orders.length > 0 ? Math.round(metrics.totalGmv / orders.length) : 0;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 py-3.5 flex items-center justify-between">
        <Link
          href="/m/console/kpi"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition"
        >
          <ArrowLeft size={16} />
          <span>Analytics</span>
        </Link>
        <span className="text-xs font-bold text-zinc-950">Sales & Revenue</span>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-5 pb-16 max-w-md mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Sales & Revenue</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Detailed breakdown of gross volume, fees, and payout availability.
          </p>
        </div>

        {/* Interactive Chart */}
        <AnalyticsChart period="7d" />

        {/* Financial Stat Summary Rows */}
        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-2">
          <div className="flex items-center justify-between py-3 px-3">
            <span className="text-xs text-zinc-500 font-medium">Gross Sales (GMV)</span>
            <span className="text-sm font-bold text-zinc-950 tabular-nums">
              ₹{metrics.totalGmv.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 px-3">
            <span className="text-xs text-zinc-500 font-medium">Platform Fee</span>
            <span className="text-sm font-semibold text-zinc-500 tabular-nums">
              ₹{metrics.platformFee.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 px-3">
            <span className="text-xs text-zinc-500 font-medium">Average Order Value</span>
            <span className="text-sm font-semibold text-zinc-950 tabular-nums">
              ₹{avgOrder.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 px-3">
            <span className="text-xs font-bold text-zinc-950">Net Payout Available</span>
            <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
              ₹{metrics.netRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payout Action Link */}
        <Link
          href="/m/console/finance"
          className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 transition"
        >
          <div className="flex items-center gap-3">
            <Wallet size={18} className="text-zinc-400" />
            <div>
              <span className="text-xs font-bold block">Payout Center</span>
              <span className="text-[11px] text-zinc-400">Withdraw available balance to bank</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-400" />
        </Link>

        {/* Transactions List */}
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
            Recent Sales Transactions
          </h2>
          {orders.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-100">
              No sales recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 10).map((o) => (
                <div
                  key={o.id}
                  className="p-3 rounded-xl border border-zinc-100 bg-white flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-zinc-900 block truncate">
                      {o.customerEmail || "Guest Buyer"}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {o.id} • {new Date(o.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right ml-3">
                    <span className="font-bold text-zinc-950 block tabular-nums">
                      ₹{(o.amount || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {o.status || "CONFIRMED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
