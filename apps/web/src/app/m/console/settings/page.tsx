"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Bell,
  Shield,
  Monitor,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import MobileConsoleHeader from "../_components/MobileConsoleHeader";

export default function MobileSettingsPage() {
  const { showToast } = useToast();
  const [orgName, setOrgName] = useState("Developer Hub");
  const [email, setEmail] = useState("organizer@hackways.dev");
  const [website, setWebsite] = useState("https://hackways.dev");
  const [notifyRsvps, setNotifyRsvps] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("hackways_org_name");
      if (savedName) setOrgName(savedName);
      const savedEmail = localStorage.getItem("hackways_org_email");
      if (savedEmail) setEmail(savedEmail);
      const saved2fa = localStorage.getItem("hackways_org_2fa");
      if (saved2fa) setTwoFactor(saved2fa === "true");
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("hackways_org_name", orgName);
      localStorage.setItem("hackways_org_email", email);
    }
    showToast("Organization details saved.");
  };

  const handleToggle2fa = () => {
    const next = !twoFactor;
    setTwoFactor(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("hackways_org_2fa", String(next));
    }
    showToast(next ? "Two-Factor Authentication enabled." : "Two-Factor Authentication disabled.");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] min-h-screen font-sans">
      {/* Universal Sidebar Navigation Header */}
      <MobileConsoleHeader
        currentTab="settings"
        title="Settings"
        subtitle="Host profile & preferences"
      />

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-[600px] mx-auto w-full pb-20">
        {/* Section 1: Profile Form */}
        <section className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-4">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-[#707077]" />
            <h2 className="text-xs font-semibold text-[#202022] uppercase tracking-wider">
              Profile Details
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#707077]">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 border border-[#dedee2] rounded-lg text-xs text-[#202022] focus:outline-none focus:border-[#202022]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#707077]">Support Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#dedee2] rounded-lg text-xs text-[#202022] focus:outline-none focus:border-[#202022]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#707077]">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-[#dedee2] rounded-lg text-xs text-[#202022] focus:outline-none focus:border-[#202022]"
              />
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#202022] text-white text-xs font-medium hover:opacity-90 transition whitespace-nowrap"
              >
                Save Profile
              </button>
            </div>
          </form>
        </section>

        {/* Section 2: Notifications */}
        <section className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#707077]" />
            <h2 className="text-xs font-semibold text-[#202022] uppercase tracking-wider">
              Notification Alerts
            </h2>
          </div>

          <div className="divide-y divide-[#dedee2]">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#202022]">RSVP Alerts</div>
                <div className="text-[11px] text-[#707077]">Get notified when a guest confirms a ticket</div>
              </div>
              <input
                type="checkbox"
                checked={notifyRsvps}
                onChange={(e) => {
                  setNotifyRsvps(e.target.checked);
                  showToast(e.target.checked ? "RSVP alerts enabled." : "RSVP alerts muted.");
                }}
                className="w-4 h-4 rounded text-[#202022] accent-[#202022] cursor-pointer"
              />
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#202022]">Daily Digest</div>
                <div className="text-[11px] text-[#707077]">Summary email of attendance and ticket sales</div>
              </div>
              <input
                type="checkbox"
                checked={notifyDaily}
                onChange={(e) => {
                  setNotifyDaily(e.target.checked);
                  showToast(e.target.checked ? "Daily digest enabled." : "Daily digest muted.");
                }}
                className="w-4 h-4 rounded text-[#202022] accent-[#202022] cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Security */}
        <section className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#707077]" />
            <h2 className="text-xs font-semibold text-[#202022] uppercase tracking-wider">
              Account Security
            </h2>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-xs font-semibold text-[#202022]">Two-Factor Authentication</div>
              <div className="text-[11px] text-[#707077]">Require an authenticator code to access payouts</div>
            </div>
            <button
              onClick={handleToggle2fa}
              className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                twoFactor
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-[#f0f0f2] text-[#202022] hover:bg-[#dedee2]"
              }`}
            >
              {twoFactor ? "Enabled" : "Enable"}
            </button>
          </div>
        </section>

        {/* Section 4: Desktop View Option */}
        <section className="p-4 rounded-xl bg-white border border-[#dedee2] space-y-2">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-[#707077]" />
            <h2 className="text-xs font-semibold text-[#202022] uppercase tracking-wider">
              Desktop Mode
            </h2>
          </div>
          <p className="text-xs text-[#707077]">
            Need advanced multi-column spreadsheets or full screen configuration?
          </p>
          <div className="pt-1">
            <Link
              href="/console/organizer/settings?view=desktop"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#202022] underline"
            >
              Switch to Desktop Dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
