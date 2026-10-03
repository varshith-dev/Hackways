"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import DashboardArtwork from "@/components/ui/DashboardArtwork";
import { useRouter, useSearchParams } from "next/navigation";
import Logo3D from "@/components/ui/Logo3D";
import { useAuth } from "@/components/auth/AuthProvider";
import { MetricCard } from "../kpi/components/MetricCard";
import { webAppHref } from "@/lib/webAppUrl";
import {
  getManagedUsers,
  getUserTabKpis,
  ManagedUser,
  UserFilterState,
  saveUserOverride,
} from "./data/userData";
import {
  UsersGroupIcon,
  TicketIcon,
  LockIcon,
  ShieldCheckIcon,
  QrCodeIcon,
  BarChartIcon,
  UserIcon,
  FilterIcon,
  RefreshCwIcon,
} from "@/components/icons/hugeicons";
import {
  ArrowUpRight,
  Download,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Mail,
  Phone,
  Send,
  ExternalLink,
} from "lucide-react";

export type UserNavSection =
  | "all-users"
  | "segments"
  | "activity"
  | "verification"
  | "events-tickets"
  | "orders-payments"
  | "communication"
  | "reports"
  | "restrictions"
  | "search";

interface SubTabConfig {
  id: string;
  label: string;
}

interface NavCategory {
  title: string;
  items: {
    id: UserNavSection;
    label: string;
    icon: React.ReactNode;
    subTabs: SubTabConfig[];
  }[];
}

const USER_NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Users & Cohorts",
    items: [
      {
        id: "all-users",
        label: "All Users",
        icon: <UsersGroupIcon size={17} />,
        subTabs: [
          { id: "all", label: "All Users" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" },
          { id: "new", label: "New Users" },
          { id: "verified", label: "Verified" },
          { id: "unverified", label: "Unverified" },
          { id: "suspended", label: "Suspended" },
          { id: "banned", label: "Banned" },
        ],
      },
      {
        id: "segments",
        label: "User Segments",
        icon: <BarChartIcon size={17} />,
        subTabs: [
          { id: "all-segments", label: "All Segments" },
          { id: "active-users", label: "Active Users" },
          { id: "inactive-users", label: "Inactive Users" },
          { id: "returning-users", label: "Returning Users" },
          { id: "high-value", label: "High-Value Users" },
          { id: "frequent-attendees", label: "Frequent Attendees" },
        ],
      },
      {
        id: "activity",
        label: "User Activity",
        icon: <RefreshCwIcon size={17} />,
        subTabs: [
          { id: "all-activity", label: "All Activity" },
          { id: "login-activity", label: "Login Activity" },
          { id: "event-activity", label: "Event Activity" },
          { id: "ticket-activity", label: "Ticket Activity" },
          { id: "payment-activity", label: "Payment Activity" },
        ],
      },
      {
        id: "verification",
        label: "User Verification",
        icon: <ShieldCheckIcon size={17} />,
        subTabs: [
          { id: "all-verif", label: "All Status" },
          { id: "verified-only", label: "Verified" },
          { id: "pending-verif", label: "Pending Review" },
          { id: "unverified-only", label: "Unverified" },
        ],
      },
    ],
  },
  {
    title: "Commerce & Access",
    items: [
      {
        id: "events-tickets",
        label: "Events & Tickets",
        icon: <TicketIcon size={17} />,
        subTabs: [
          { id: "registered-events", label: "Registered Events" },
          { id: "attended-events", label: "Attended Events" },
          { id: "all-passes", label: "All Passes" },
          { id: "cancelled-passes", label: "Cancelled Passes" },
        ],
      },
      {
        id: "orders-payments",
        label: "Orders & Payments",
        icon: <LockIcon size={17} />,
        subTabs: [
          { id: "all-orders", label: "All Orders" },
          { id: "successful-orders", label: "Successful" },
          { id: "refunded-orders", label: "Refunds" },
        ],
      },
    ],
  },
  {
    title: "Engagement & Governance",
    items: [
      {
        id: "communication",
        label: "User Communication",
        icon: <UsersGroupIcon size={17} />,
        subTabs: [
          { id: "overview-comm", label: "Dispatch Overview" },
          { id: "email-channel", label: "Email" },
          { id: "push-channel", label: "Push Notification" },
          { id: "whatsapp-channel", label: "WhatsApp" },
        ],
      },
      {
        id: "reports",
        label: "User Reports",
        icon: <FilterIcon size={17} />,
        subTabs: [
          { id: "open-reports", label: "Open Reports" },
          { id: "under-review", label: "Under Review" },
          { id: "resolved-reports", label: "Resolved" },
        ],
      },
      {
        id: "restrictions",
        label: "Restrictions & Access",
        icon: <LockIcon size={17} />,
        subTabs: [
          { id: "all-restrictions", label: "Access Controls" },
          { id: "suspended-users", label: "Suspensions" },
          { id: "banned-users", label: "Bans" },
        ],
      },
      {
        id: "search",
        label: "User Search",
        icon: <UserIcon size={17} />,
        subTabs: [
          { id: "quick-search", label: "Search Index" },
          { id: "saved-queries", label: "Saved Filters" },
        ],
      },
    ],
  },
];

export default function UserManagementView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const tabParam = searchParams.get("tab") as UserNavSection | null;
  const subTabParam = searchParams.get("subtab");

  const [activeTab, setActiveTab] = useState<UserNavSection>(tabParam || "all-users");
  const [activeSubTab, setActiveSubTab] = useState<string>(subTabParam || "");
  const [dataVersion, setDataVersion] = useState(0);

  const [filters, setFilters] = useState<UserFilterState>({
    status: "all",
    verification: "all",
    accountType: "all",
    eventId: "all",
    searchQuery: "",
    dateRange: "30d",
  });

  const allNavItems = useMemo(() => {
    return USER_NAV_CATEGORIES.flatMap((c) => c.items);
  }, []);

  const currentNavItem = useMemo(() => {
    return allNavItems.find((i) => i.id === activeTab) || allNavItems[0];
  }, [activeTab, allNavItems]);

  useEffect(() => {
    if (tabParam && allNavItems.some((i) => i.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, allNavItems]);

  useEffect(() => {
    if (!subTabParam || !currentNavItem.subTabs.some((st) => st.id === subTabParam)) {
      setActiveSubTab(currentNavItem.subTabs[0]?.id || "");
    } else {
      setActiveSubTab(subTabParam);
    }
  }, [currentNavItem, subTabParam]);

  const handleTabChange = (tabId: UserNavSection) => {
    setActiveTab(tabId);
    const target = allNavItems.find((i) => i.id === tabId);
    const firstSub = target?.subTabs[0]?.id || "";
    setActiveSubTab(firstSub);
    router.push(`/console/users?tab=${tabId}&subtab=${firstSub}`);
  };

  const handleSubTabChange = (subId: string) => {
    setActiveSubTab(subId);
    router.push(`/console/users?tab=${activeTab}&subtab=${subId}`);
  };

  const data = useMemo(() => {
    // Incorporate activeSubTab into filter if applicable
    const activeFilters: Partial<UserFilterState> = { ...filters };
    if (activeTab === "all-users") {
      if (activeSubTab === "active") activeFilters.status = "ACTIVE";
      if (activeSubTab === "inactive") activeFilters.status = "INACTIVE";
      if (activeSubTab === "suspended") activeFilters.status = "SUSPENDED";
      if (activeSubTab === "banned") activeFilters.status = "BANNED";
      if (activeSubTab === "verified") activeFilters.verification = "VERIFIED";
      if (activeSubTab === "unverified") activeFilters.verification = "UNVERIFIED";
    }
    return getManagedUsers(activeFilters);
  }, [filters, activeTab, activeSubTab, dataVersion]);

  const kpiMetrics = useMemo(() => {
    return getUserTabKpis(activeTab, data.users, data.allUsers);
  }, [activeTab, data]);

  const handleExportCsv = () => {
    let csv = "data:text/csv;charset=utf-8,ID,Name,Email,Phone,Status,Verification,AccountType,JoinedDate,EventsAttended,TotalSpend\n";
    data.users.forEach((u) => {
      csv += `"${u.id}","${u.name}","${u.email}","${u.phone}","${u.accountStatus}","${u.verificationStatus}","${u.accountType}","${u.joinedDate}",${u.eventsAttendedCount},${u.totalSpend}\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.href = encoded;
    link.download = `hackways_users_${activeTab}_${activeSubTab}.csv`;
    link.click();
  };

  return (
    <div className="h-screen bg-white text-zinc-900 flex flex-col font-body antialiased overflow-hidden selection:bg-zinc-900 selection:text-white">
      {/* 1. TOP HEADER BAR */}
      <header className="h-16 shrink-0 border-b border-zinc-200 bg-white px-4 sm:px-6 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center group py-1" aria-label="Hackways Home">
            <Logo3D />
          </Link>
          <span className="text-zinc-300">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase font-heading">
              Console
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-xs font-bold text-zinc-950 font-heading">
              User Management
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={user?.role === "admin" ? "/console/super-admin/overview" : "/console/organizer/overview"}
            className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-4 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>{user?.role === "admin" ? "Back to Super Admin" : "Back to Organizer"}</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>

      {/* 2. MAIN SPLIT LAYOUT: FIXED LEFT SIDEBAR + FULL CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white py-4 px-3 flex flex-col justify-between h-full overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            {USER_NAV_CATEGORIES.map((cat) => (
              <div key={cat.title} className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-heading">
                  {cat.title}
                </div>
                <nav className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition text-left cursor-pointer ${
                          isActive
                            ? "text-zinc-950 font-semibold bg-zinc-100"
                            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 font-normal"
                        }`}
                      >
                        <span className={isActive ? "text-zinc-950" : "text-zinc-400"}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT MAIN CANVAS */}
        <main className="flex-1 overflow-y-auto bg-white p-6 sm:p-8 lg:p-10 space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-zinc-950 font-heading tracking-tight">
                  {currentNavItem.label}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700">
                  {data.users.length} {data.users.length === 1 ? "User" : "Users"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Inspect accounts, telemetry traces, access permissions, and financial ledgers.
              </p>
            </div>

            {/* Global Multi-dimensional Capsule Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input capsule */}
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search user, email, phone..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  className="text-xs bg-white border border-zinc-200 rounded-full pl-8 pr-4 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 w-48 sm:w-56 shadow-2xs"
                />
              </div>

              {/* Status Filter Capsule */}
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>

              {/* Verification Filter Capsule */}
              <select
                value={filters.verification}
                onChange={(e) => setFilters((prev) => ({ ...prev, verification: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="pending">Pending</option>
              </select>

              {/* Account Type Filter Capsule */}
              <select
                value={filters.accountType}
                onChange={(e) => setFilters((prev) => ({ ...prev, accountType: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Roles</option>
                <option value="attendee">Attendee</option>
                <option value="organizer">Organizer</option>
                <option value="vip">VIP</option>
              </select>

              {/* Event Filter Capsule */}
              <select
                value={filters.eventId}
                onChange={(e) => setFilters((prev) => ({ ...prev, eventId: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Events ({data.events.length})</option>
                {data.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              {/* Export CSV Capsule Button */}
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Download size={12} />
                <span>CSV</span>
              </button>

              {/* Print Report Capsule Button */}
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Printer size={12} />
                <span>Report</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs: Clean Underline Tab Navigation */}
          <div className="flex items-center gap-6 border-b border-zinc-200 overflow-x-auto no-scrollbar pt-1">
            {currentNavItem.subTabs.map((sub) => {
              const isSubActive = activeSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubTabChange(sub.id)}
                  className={`pb-3 text-xs transition relative whitespace-nowrap cursor-pointer ${
                    isSubActive ? "text-zinc-950 font-semibold" : "text-zinc-500 hover:text-zinc-800 font-normal"
                  }`}
                >
                  <span>{sub.label}</span>
                  {isSubActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. DEDICATED 4 KPIS FOR THIS TAB */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 border-y border-zinc-200 py-3 my-4">
            {kpiMetrics.map((kpi) => (
              <MetricCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                isPositive={kpi.isPositive}
                subtext={kpi.subtext}
              />
            ))}
          </div>

          {/* 4. MAIN CONTENT: USER TABLE OR TAILORED MODULE VIEWS */}
          {data.users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto select-none">
              <div className="mb-3"><DashboardArtwork kind="users" /></div>
              <h3 className="text-sm font-bold text-zinc-950 font-heading">No User Accounts Found</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                No user records match your active filter criteria. Registered attendees, ticket buyers, and organizers will display here automatically.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={webAppHref("/create")}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Create First Event</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* USER TABLE (FULL COMPREHENSIVE VIEW) */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/60 text-zinc-500 font-semibold">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-4">Events</th>
                        <th className="py-3 px-4">Passes</th>
                        <th className="py-3 px-4">Total Spend</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-800">
                      {data.users.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => router.push(`/console/users/${encodeURIComponent(user.id)}`)}
                          className="hover:bg-zinc-50/80 transition cursor-pointer group"
                        >
                          {/* Name & Avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {user.avatar && <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-8 h-8 rounded-full border border-zinc-200 object-cover bg-zinc-100 shrink-0"
                              />}
                              <div>
                                <p className="font-semibold text-zinc-950 group-hover:text-zinc-900 transition">
                                  {user.name}
                                </p>
                                <p className="text-[11px] text-zinc-400">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Account Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                user.accountStatus === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : user.accountStatus === "BANNED"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {user.accountStatus}
                            </span>
                          </td>

                          {/* Verification Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                user.verificationStatus === "VERIFIED"
                                  ? "bg-zinc-100 text-zinc-900"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              <ShieldCheckIcon size={11} />
                              {user.verificationStatus}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4 font-medium text-zinc-700">
                            {user.accountType}
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-4 text-zinc-500 tabular-nums">
                            {new Date(user.joinedDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          {/* Events Attended */}
                          <td className="py-3 px-4 tabular-nums font-semibold text-zinc-950">
                            {user.eventsAttendedCount}
                          </td>

                          {/* Tickets Purchased */}
                          <td className="py-3 px-4 tabular-nums font-semibold text-zinc-950">
                            {user.ticketsPurchasedCount}
                          </td>

                          {/* Total Spend */}
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">
                            ₹{user.totalSpend.toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/console/users/${encodeURIComponent(user.id)}`);
                              }}
                              className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Inspect</span>
                              <ExternalLink size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
