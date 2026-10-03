"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getAllOrders } from "@/lib/api";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";

export default function MobileOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [orderToRefund, setOrderToRefund] = useState<any | null>(null);

  useEffect(() => {
    setOrders(getAllOrders());
  }, []);

  const handleRefund = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "REFUNDED" } : o))
    );
    setOrderToRefund(null);
    showToast("Order refunded.");
  };

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.userName && o.userName.toLowerCase().includes(q)) ||
      (o.userEmail && o.userEmail.toLowerCase().includes(q))
    );
  });

  const totalGross = orders
    .filter((o) => o.status !== "REFUNDED")
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="orders"
        title="Orders & Sales"
        subtitle="Settled transactions & tickets"
      />

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-[600px] mx-auto w-full pb-20">
        {/* Sales Summary Bar */}
        <div className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-1">
          <div className="text-xs text-[#707077] font-medium">Settled Ticket Sales</div>
          <div className="text-2xl font-semibold text-[#202022] tracking-tight tabular-nums">
            ₹{totalGross.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#707077]">{orders.length} orders total</div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[#707077]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer or order ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#dedee2] text-xs text-[#202022] focus:outline-none focus:border-[#202022]"
          />
        </div>

        {/* Modal: Confirm Refund */}
        {orderToRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white border border-[#dedee2] rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-semibold text-[#202022]">Refund Ticket Order</h3>
              <p className="text-xs text-[#707077]">
                Are you sure you want to refund this order of ₹{orderToRefund.amount?.toLocaleString()} to {orderToRefund.userName || "the buyer"}?
              </p>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOrderToRefund(null)}
                  className="px-3 py-1.5 text-xs text-[#707077] hover:text-[#202022]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRefund(orderToRefund.id)}
                  className="px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition whitespace-nowrap"
                >
                  Confirm Refund
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Feed */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white border border-[#dedee2] text-xs text-[#707077]">
              No orders found.
            </div>
          ) : (
            filtered.map((o, idx) => {
              const isRefunded = o.status === "REFUNDED";

              return (
                <div
                  key={o.id || idx}
                  className="p-3.5 rounded-xl bg-white border border-[#dedee2] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-[#202022]">{o.userName || o.customerName || "Guest Pass"}</div>
                      <div className="text-[11px] text-[#707077] font-mono">{o.id || `ORD-${idx + 1}`}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold tabular-nums ${isRefunded ? "line-through text-[#707077]" : "text-[#202022]"}`}>
                        {o.amount ? `₹${o.amount.toLocaleString()}` : "Free"}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isRefunded ? "bg-[#f0f0f2] text-[#707077]" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {isRefunded ? "Refunded" : "Settled"}
                      </span>
                    </div>
                  </div>

                  {!isRefunded && (
                    <div className="pt-2 border-t border-[#dedee2] flex justify-end">
                      <button
                        onClick={() => setOrderToRefund(o)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#707077] hover:text-red-600 transition"
                      >
                        <RotateCcw size={11} />
                        <span>Refund</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
