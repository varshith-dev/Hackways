"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getAllOrders, getPlatformMetrics } from "@/lib/api";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";

export default function MobileFinancePage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalGmv: 0,
    totalOrders: 0,
    netRevenue: 0,
    platformFee: 0,
  });

  const [bankDetails] = useState({
    holderName: "Alex Rivera",
    bankName: "HDFC Bank",
    accountNumber: "•••• 9412",
    ifsc: "HDFC0001824",
  });

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    setOrders(getAllOrders());
    setMetrics(getPlatformMetrics());
  }, []);

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      showToast("Enter a valid amount.");
      return;
    }
    if (amount > metrics.netRevenue) {
      showToast("Amount exceeds available balance.");
      return;
    }
    setIsWithdrawOpen(false);
    setWithdrawAmount("");
    showToast(`Withdrawal of ₹${amount.toLocaleString()} initiated.`);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="finance"
        title="Payouts & Balance"
        subtitle="Earnings & bank settlements"
        rightAction={
          <button
            onClick={() => setIsWithdrawOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202022] text-white text-xs font-medium whitespace-nowrap shrink-0 hover:opacity-90 transition active:scale-95"
          >
            <span>Withdraw</span>
          </button>
        }
      />

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-[600px] mx-auto w-full pb-20">
        {/* Payout Hero Card */}
        <div className="p-5 rounded-xl bg-white border border-[#dedee2] space-y-3">
          <div className="text-xs text-[#707077] font-medium">Available Balance</div>
          <div className="text-3xl font-semibold text-[#202022] tracking-tight tabular-nums">
            ₹{metrics.netRevenue.toLocaleString()}
          </div>

          <button
            onClick={() => {
              setWithdrawAmount(String(metrics.netRevenue));
              setIsWithdrawOpen(true);
            }}
            className="w-full py-2.5 rounded-lg bg-[#202022] text-white text-xs font-medium hover:opacity-90 transition active:scale-[0.99] whitespace-nowrap"
          >
            Withdraw to Bank
          </button>
        </div>

        {/* Modal: Withdraw */}
        {isWithdrawOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white border border-[#dedee2] rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-[#202022]">Withdraw Balance</h3>
              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#707077]">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={metrics.netRevenue}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dedee2] rounded-lg text-sm font-semibold text-[#202022] focus:outline-none focus:border-[#202022]"
                    required
                  />
                </div>
                <div className="p-3 rounded-lg bg-[#fafafa] border border-[#dedee2] text-xs text-[#707077] space-y-0.5">
                  <div className="font-semibold text-[#202022]">{bankDetails.bankName}</div>
                  <div>Account: {bankDetails.accountNumber}</div>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawOpen(false)}
                    className="px-3 py-1.5 text-xs text-[#707077] hover:text-[#202022]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 transition whitespace-nowrap"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bank Account Card */}
        <section className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-3">
          <h2 className="text-xs font-semibold text-[#707077] uppercase tracking-wider">
            Linked Bank Account
          </h2>

          <div className="p-3 rounded-lg bg-[#fafafa] border border-[#dedee2] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#dedee2] flex items-center justify-center text-[#707077] shrink-0">
                <Building2 size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#202022]">{bankDetails.bankName}</div>
                <div className="text-[11px] font-mono text-[#707077]">{bankDetails.accountNumber}</div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-[#707077]">{bankDetails.holderName}</span>
          </div>
        </section>

        {/* Transactions Feed */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[#707077] uppercase tracking-wider px-1">
            Recent Activity
          </h2>

          {orders.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-white border border-[#dedee2] text-xs text-[#707077]">
              No transactions yet.
            </div>
          ) : (
            orders.slice(0, 10).map((o, idx) => (
              <div
                key={o.id || idx}
                className="p-3.5 rounded-xl bg-white border border-[#dedee2] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-[#202022]">{o.userName || o.customerName || "Ticket Order"}</div>
                  <div className="text-[11px] text-[#707077] font-mono">{o.id || `ORD-${idx + 1}`}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#202022] tabular-nums">
                    {o.amount ? `₹${o.amount.toLocaleString()}` : "Free"}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
