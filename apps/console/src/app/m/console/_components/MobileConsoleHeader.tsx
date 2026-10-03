"use client";

import React, { useState } from "react";
import Link from "next/link";
import { webAppHref } from "@/lib/webAppUrl";
import {
  Menu,
  X,
  CalendarDays,
  Users,
  ShoppingBag,
  QrCode,
  TrendingUp,
  Megaphone,
  Wallet,
  Shield,
  Settings,
  Plus,
  ExternalLink,
} from "lucide-react";

export type ConsoleTab =
  | "events"
  | "channels"
  | "orders"
  | "checkin"
  | "kpi"
  | "marketing"
  | "finance"
  | "team"
  | "settings";

interface MobileConsoleHeaderProps {
  currentTab: ConsoleTab;
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  hideTabs?: boolean;
}

const TABS: { id: ConsoleTab; name: string; shortName: string; href: string; icon: React.ReactNode }[] = [
  { id: "events", name: "Events", shortName: "Events", href: "/m/console", icon: <CalendarDays size={18} /> },
  { id: "channels", name: "Communities", shortName: "Communities", href: "/m/console/channels", icon: <Users size={18} /> },
  { id: "orders", name: "Orders & Sales", shortName: "Orders", href: "/m/console/orders", icon: <ShoppingBag size={18} /> },
  { id: "checkin", name: "Door Check-in", shortName: "Check-in", href: "/m/console/checkin", icon: <QrCode size={18} /> },
  { id: "kpi", name: "Analytics", shortName: "Analytics", href: "/m/console/kpi", icon: <TrendingUp size={18} /> },
  { id: "finance", name: "Payouts & Balance", shortName: "Payouts", href: "/m/console/finance", icon: <Wallet size={18} /> },
  { id: "marketing", name: "Promotions", shortName: "Marketing", href: "/m/console/marketing", icon: <Megaphone size={18} /> },
  { id: "team", name: "Team & Roles", shortName: "Team", href: "/m/console/team", icon: <Shield size={18} /> },
  { id: "settings", name: "Settings", shortName: "Settings", href: "/m/console/settings", icon: <Settings size={18} /> },
];

export default function MobileConsoleHeader({
  currentTab,
  title,
  subtitle,
  rightAction,
  hideTabs = false,
}: MobileConsoleHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = React.useRef<HTMLElement | null>(null);
  const activeTabRef = React.useRef<HTMLAnchorElement | null>(null);

  React.useEffect(() => {
    // Smoothly center the active tab strictly within the horizontal nav container (no window scroll jump)
    if (navRef.current && activeTabRef.current) {
      const container = navRef.current;
      const tab = activeTabRef.current;
      const targetLeft = tab.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    }
  }, [currentTab]);

  return (
    <>
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#dedee2]">
        <header className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center text-[#202022] hover:bg-[#f0f0f2] active:scale-95 transition"
              aria-label="Open navigation sidebar"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-[#202022] leading-tight tracking-tight">
                {title}
              </h1>
              {subtitle && <p className="text-[11px] text-[#707077] leading-tight">{subtitle}</p>}
            </div>
          </div>

          {rightAction ? (
            <div className="flex items-center gap-2">{rightAction}</div>
          ) : (
            <div className="w-6" />
          )}
        </header>

        {/* Horizontal Nav Bar with all dashboards */}
        {!hideTabs && (
          <nav
            ref={navRef}
            aria-label="Console tabs"
            className="border-t border-[#dedee2] px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white overscroll-x-contain touch-pan-x"
          >
            {TABS.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  scroll={false}
                  ref={isActive ? activeTabRef : undefined}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors active:scale-95 duration-150 ${
                    isActive
                      ? "bg-[#202022] text-white"
                      : "text-[#707077] hover:text-[#202022] hover:bg-[#f0f0f2]"
                  }`}
                >
                  {item.shortName}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Slide-over Sidebar Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#dedee2] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#202022] text-white flex items-center justify-center font-bold text-xs">
                  T
                </div>
                <div>
                  <span className="font-semibold text-sm text-[#202022] block leading-tight">
                    Organizer Hub
                  </span>
                  <span className="text-[10px] text-[#707077]">Navigation Sidebar</span>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-[#707077] hover:text-[#202022] rounded-lg hover:bg-[#f0f0f2] transition"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs Header */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707077]">
                Console Tabs
              </span>
            </div>

            {/* Tab Links */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {TABS.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#202022] text-white"
                        : "text-[#202022] hover:bg-[#f0f0f2]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? "text-white" : "text-[#707077]"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Quick Actions Shortcuts */}
            <div className="p-3 border-t border-[#dedee2] bg-[#fafafa] space-y-1">
              <Link
                href={webAppHref("/create")}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#202022] hover:bg-[#f0f0f2] transition"
              >
                <Plus size={15} className="text-[#707077]" />
                <span>Create Event</span>
              </Link>
              <Link
                href="/m/console/channels/create"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#202022] hover:bg-[#f0f0f2] transition"
              >
                <Plus size={15} className="text-[#707077]" />
                <span>Create Community</span>
              </Link>
              <Link
                href="/m/console/marketing/create"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#202022] hover:bg-[#f0f0f2] transition"
              >
                <Plus size={15} className="text-[#707077]" />
                <span>Add Promo Code</span>
              </Link>
              <Link
                href="/m/console/team/invite"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#202022] hover:bg-[#f0f0f2] transition"
              >
                <Plus size={15} className="text-[#707077]" />
                <span>Invite Teammate</span>
              </Link>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#dedee2] space-y-2">
              <Link
                href="/console?view=desktop"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between text-xs text-[#707077] hover:text-[#202022] transition"
              >
                <span>Desktop Console</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
