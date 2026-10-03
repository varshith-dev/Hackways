"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAllOrders, getPlatformMetrics, StoredOrder } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import DashboardArtwork from "@/components/ui/DashboardArtwork";
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  BarChartIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "@/components/icons/hugeicons";

interface BankDetails {
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
}

const DEFAULT_BANK_DETAILS: BankDetails = {
  holderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  upiId: "",
};

export default function FinanceOverviewPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [metrics, setMetrics] = useState({
    totalGmv: 0,
    totalOrders: 0,
    netRevenue: 0,
    platformFee: 0,
  });

  const [bankDetails, setBankDetails] = useState<BankDetails>(DEFAULT_BANK_DETAILS);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    const loadedOrders = getAllOrders();
    setOrders(loadedOrders);
    const m = getPlatformMetrics();
    setMetrics({
      totalGmv: m.totalGmv,
      totalOrders: m.totalOrders,
      netRevenue: m.netRevenue,
      platformFee: m.platformFee,
    });

    if (typeof window !== "undefined") {
      const savedBank = localStorage.getItem("hackways_payout_bank");
      if (savedBank) {
        try {
          const parsed = JSON.parse(savedBank);
          setBankDetails(parsed);
        } catch {}
      }
    }
  }, []);

  const gatewayFee = Math.round(metrics.totalGmv * 0.018);
  const netPayout = Math.max(0, Math.round(metrics.totalGmv - metrics.platformFee - gatewayFee));

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount) || netPayout;
    if (amount <= 0 || amount > netPayout) {
      showToast("Invalid withdrawal amount.");
      return;
    }
    setIsWithdrawModalOpen(false);
    showToast("Transfers are unavailable. No payment provider is connected.");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            Payouts
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track ticket earnings, automatic bank transfers, and statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (netPayout <= 0) {
                showToast("No settled funds currently available to withdraw.");
                return;
              }
              setWithdrawAmount(String(netPayout));
              setIsWithdrawModalOpen(true);
            }}
            disabled
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-950 transition shadow-2xs cursor-pointer"
          >
            Withdraw Funds
          </button>
          <Link
            href="/console/finance/account"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 transition shadow-2xs"
          >
            Bank Account
          </Link>
        </div>
      </div>

      {/* 2. Primary KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-4 sm:p-5 rounded-lg border border-zinc-200 bg-white space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Available to withdraw</span>
            <span className="inline-flex items-center text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">
              Not connected
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 font-mono">
            Unavailable
          </div>
          <p className="text-[11px] text-zinc-400">
            A connected payment provider is required to verify settled funds.
          </p>
        </div>

        {/* Gross Sales */}
        <div className="p-4 sm:p-5 rounded-lg border border-zinc-200 bg-white space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Gross ticket volume</span>
            <span className="text-[11px] font-medium text-zinc-400">Lifetime</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 font-mono">
            ₹{metrics.totalGmv.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-400">
            Across {metrics.totalOrders} ticket {metrics.totalOrders === 1 ? "order" : "orders"}
          </p>
        </div>

        {/* Platform Deductions */}
        <div className="p-4 sm:p-5 rounded-lg border border-zinc-200 bg-white space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Estimated platform & gateway fee</span>
            <span className="text-[11px] font-medium text-zinc-400">Estimate</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 font-mono">
            ₹{(Math.round(metrics.platformFee) + gatewayFee).toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-400">
            Based on 3% platform + 1.8% gateway; not a settlement statement
          </p>
        </div>
      </div>

      {/* 3. Main Split Section: Recent Transactions & Account Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left 2 Cols: Recent Transactions */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-900">Recent Transactions</h3>
            {orders.length > 0 && (
              <Link
                href="/console/finance/transactions"
                className="text-[11px] font-medium text-zinc-600 hover:text-zinc-950 transition inline-flex items-center gap-1"
              >
                <span>View all transactions</span>
                <ArrowRightIcon size={12} strokeWidth={2} />
              </Link>
            )}
          </div>

          {orders.length > 0 ? (
            <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Attendee</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3 text-right">Estimated Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.slice(0, 5).map((ord) => {
                    const fee = Math.round(ord.amount * 0.048);
                    const net = ord.amount - fee;
                    return (
                      <tr key={ord.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-2.5 px-3 font-mono font-medium text-zinc-900">{ord.id}</td>
                        <td className="py-2.5 px-3 text-zinc-950 font-medium">{ord.buyerName}</td>
                        <td className="py-2.5 px-3 text-zinc-600 truncate max-w-[140px]">{ord.eventName}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-950 text-right">
                          ₹{net.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-lg border border-zinc-200 bg-white text-center space-y-3 shadow-2xs">
              <DashboardArtwork kind="revenue" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-900">No ticket sales recorded yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  When guests buy tickets for your event drops, their payment breakdowns and your net earnings will appear here.
                </p>
              </div>
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-2xs"
              >
                Create an Event Drop
              </Link>
            </div>
          )}
        </div>

        {/* Right 1 Col: Payout Destination Card */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-950">Payout Account</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {bankDetails.accountNumber ? "Saved locally" : "Not configured"}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-zinc-900">{bankDetails.bankName || "No payout account saved"}</div>
              <div className="text-zinc-500 font-mono text-[11px]">
                Account: {bankDetails.accountNumber ? `•••• ${bankDetails.accountNumber.slice(-4)}` : "Not provided"}
              </div>
              <div className="text-zinc-500 font-mono text-[11px]">
                IFSC: {bankDetails.ifsc || "Not provided"}
              </div>
              <div className="text-zinc-500 text-[11px]">
                Holder: {bankDetails.holderName || "Not provided"}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <Link
                href="/console/finance/account"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition inline-flex items-center gap-1"
              >
                <span>Manage details</span>
                <ArrowRightIcon size={12} strokeWidth={2} />
              </Link>
              <span className="text-[11px] text-zinc-400">Direct NEFT/UPI</span>
            </div>
          </div>

          {/* Payout Policy Details */}
          <div className="p-4 rounded-lg border border-zinc-200/80 bg-zinc-50/50 space-y-2 text-xs">
            <h4 className="font-semibold text-zinc-900">Settlement Policy</h4>
            <ul className="space-y-1.5 text-zinc-500 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-zinc-400">•</span>
                <span>Automated payouts are not connected.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-zinc-400">•</span>
                <span>Settlement timing is unavailable.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-zinc-400">•</span>
                <span>Transfer methods and fees are unavailable.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* WITHDRAW FUNDS MODAL                                               */}
      {/* ------------------------------------------------------------------ */}
      {isWithdrawModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsWithdrawModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Withdraw Funds</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Transfer available revenue to your bank account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-900">Amount to withdraw</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                  <input
                    type="number"
                    max={netPayout}
                    min={1}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    className="w-full h-9 pl-7 pr-3 text-sm font-mono font-bold bg-white rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                  <span>Available: ₹{netPayout.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(netPayout))}
                    className="text-zinc-700 underline font-medium hover:text-zinc-950 cursor-pointer"
                  >
                    Withdraw All
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs space-y-1">
                <div className="text-zinc-500">Destination Account</div>
                <div className="font-semibold text-zinc-900">
                  {bankDetails.bankName} •••• {bankDetails.accountNumber.slice(-4)}
                </div>
                <div className="text-[11px] text-zinc-400">Disburses within 24 hours</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
