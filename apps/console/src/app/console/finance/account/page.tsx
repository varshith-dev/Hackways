"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

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

export default function FinanceAccountPage() {
  const { showToast } = useToast();
  const [bankForm, setBankForm] = useState<BankDetails>(DEFAULT_BANK_DETAILS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hackways_payout_bank");
      if (saved) {
        try {
          setBankForm(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("hackways_payout_bank", JSON.stringify(bankForm));
    }
    showToast("Payout bank details updated.");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-zinc-950">
          Payout Account
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Configure where ticket sales revenue will be deposited.
        </p>
      </div>

      {/* Account Settings Card */}
      <div className="p-6 rounded-lg border border-zinc-200 bg-white shadow-2xs">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Account Holder Name</label>
            <input
              type="text"
              value={bankForm.holderName}
              onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })}
              required
              className="w-full h-8 px-3 text-xs bg-white rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Bank Name</label>
              <input
                type="text"
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                required
                className="w-full h-8 px-3 text-xs bg-white rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">IFSC Code</label>
              <input
                type="text"
                value={bankForm.ifsc}
                onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                required
                className="w-full h-8 px-3 text-xs bg-white rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-900 font-mono uppercase"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Account Number</label>
            <input
              type="text"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              required
              className="w-full h-8 px-3 text-xs bg-white rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-900 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">UPI ID (Optional)</label>
            <input
              type="text"
              value={bankForm.upiId}
              onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
              placeholder="name@okhdfcbank"
              className="w-full h-8 px-3 text-xs bg-white rounded-md border border-zinc-200 focus:outline-none focus:border-zinc-900 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-md bg-zinc-950 text-white hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
            >
              Save Payout Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
