"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAllOrders, StoredOrder } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import DashboardArtwork from "@/components/ui/DashboardArtwork";

export default function FinanceTransactionsPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setOrders(getAllOrders());
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filterType === "ALL" || o.status === filterType;
    const matchesSearch =
      !searchQuery.trim() ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            Transactions
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit-ready ledger of all ticket orders, platform fees, and net payouts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => showToast(`Exported ${filteredOrders.length} transactions to CSV.`)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 transition shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          Export CSV
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {["ALL", "CONFIRMED", "REFUNDED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterType(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                filterType === st
                  ? "bg-zinc-950 text-white font-semibold shadow-2xs"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by order ID, buyer, or event..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 h-8 px-3 text-xs bg-white rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      {/* Orders Table or Empty State */}
      {filteredOrders.length > 0 ? (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Buyer</th>
                <th className="py-2.5 px-3">Event</th>
                <th className="py-2.5 px-3">Gross</th>
                <th className="py-2.5 px-3">Platform Fee</th>
                <th className="py-2.5 px-3">Net Earnings</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((ord) => {
                const fee = Math.round(ord.amount * 0.048);
                const net = ord.amount - fee;
                return (
                  <tr key={ord.id} className="hover:bg-zinc-50/60 transition">
                    <td className="py-3 px-3 font-mono font-medium text-zinc-900">{ord.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-950">{ord.buyerName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{ord.buyerEmail}</div>
                    </td>
                    <td className="py-3 px-3 text-zinc-700 font-medium">{ord.eventName}</td>
                    <td className="py-3 px-3 font-mono text-zinc-900">₹{ord.amount.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-zinc-500">-₹{fee.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono font-bold text-zinc-950">₹{net.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === "CONFIRMED"
                            ? "bg-zinc-900 text-white"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 rounded-lg border border-zinc-200 bg-white text-center space-y-3 shadow-2xs">
          <DashboardArtwork kind="revenue" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-zinc-900">No transactions found</h4>
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
  );
}
