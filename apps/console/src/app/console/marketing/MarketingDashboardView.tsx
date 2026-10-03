"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo3D from "@/components/ui/Logo3D";
import { useAuth } from "@/components/auth/AuthProvider";
import { MetricCard } from "../kpi/components/MetricCard";
import {
  AreaChart,
  BarChart,
  DonutChart,
  FunnelChart,
  ProgressMeter,
} from "../kpi/components/AnalyticsCharts";
import {
  MarketingModule,
  MarketingSubTab,
  MARKETING_NAV_SECTIONS,
  getMarketingState,
  getMarketingKpis,
  saveStoredCampaign,
  saveStoredPromo,
  MarketingCampaign,
  PromoCodeItem,
  MarketingFilterState,
} from "./data/marketingData";
import { ShortLinkTracker } from "@/lib/types";
import { webAppHref } from "@/lib/webAppUrl";
import {
  BarChartIcon,
  TicketIcon,
  UsersGroupIcon,
  LockIcon,
  UserIcon,
  QrCodeIcon,
  FilterIcon,
  RefreshCwIcon,
  PresentationIcon,
  ZapIcon,
  ShieldCheckIcon,
} from "@/components/icons/hugeicons";
import {
  ArrowUpRight,
  Download,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag,
  Radio,
  Share2,
  Mail,
  Smartphone,
  Check,
  Calendar,
  Layers,
  Sparkles,
  X,
  Globe,
  BarChart2,
  Copy,
  Link as LinkIcon,
  Trash2,
  Monitor,
  Tablet,
  Activity,
} from "lucide-react";

export interface NavCategory {
  title: string;
  items: {
    id: MarketingModule;
    label: string;
    icon: React.ReactNode;
    subTabs: MarketingSubTab[];
  }[];
}

export const MARKETING_NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Campaigns & Growth",
    items: [
      {
        id: "overview",
        label: "Overview",
        icon: <BarChartIcon size={17} />,
        subTabs: [
          { id: "overview", label: "Overview" },
          { id: "performance", label: "Performance" },
          { id: "acquisition", label: "Acquisition" },
          { id: "conversion", label: "Conversion" },
          { id: "revenue", label: "Revenue" },
          { id: "campaign-activity", label: "Activity" },
        ],
      },
      {
        id: "campaigns",
        label: "Campaigns",
        icon: <ZapIcon size={17} />,
        subTabs: [
          { id: "all-campaigns", label: "All Campaigns" },
          { id: "active", label: "Active" },
          { id: "scheduled", label: "Scheduled" },
          { id: "drafts", label: "Drafts" },
          { id: "completed", label: "Completed" },
          { id: "paused", label: "Paused" },
        ],
      },
      {
        id: "builder",
        label: "Campaign Builder",
        icon: <Plus size={17} />,
        subTabs: [
          { id: "details", label: "Campaign Details" },
          { id: "audience", label: "Audience Target" },
          { id: "channel", label: "Channel Delivery" },
          { id: "content", label: "Creative & Banners" },
          { id: "schedule", label: "Schedule & Launch" },
        ],
      },
    ],
  },
  {
    title: "Acquisition & Audience",
    items: [
      {
        id: "acquisition",
        label: "Acquisition",
        icon: <RefreshCwIcon size={17} />,
        subTabs: [
          { id: "traffic", label: "Traffic" },
          { id: "sources", label: "Sources" },
          { id: "social", label: "Social" },
          { id: "referrals", label: "Referrals" },
          { id: "affiliates", label: "Affiliates" },
        ],
      },
      {
        id: "audience",
        label: "Audiences",
        icon: <UsersGroupIcon size={17} />,
        subTabs: [
          { id: "all-audiences", label: "Audiences" },
          { id: "segments", label: "Segments" },
          { id: "retargeting", label: "Retargeting" },
        ],
      },
      {
        id: "promotions",
        label: "Promotions",
        icon: <TicketIcon size={17} />,
        subTabs: [
          { id: "promo-codes", label: "Promo Codes" },
          { id: "coupons", label: "Coupons" },
          { id: "discounts", label: "Discounts" },
        ],
      },
      {
        id: "custom-urls",
        label: "URL & Custom Marketing",
        icon: <LinkIcon size={17} />,
        subTabs: [
          { id: "all-links", label: "All Tracking URLs" },
          { id: "create", label: "Create Custom Link" },
          { id: "traffic", label: "Traffic Analytics" },
        ],
      },
    ],
  },
  {
    title: "Channels & Conversion",
    items: [
      {
        id: "communications",
        label: "Communications",
        icon: <Send size={17} />,
        subTabs: [
          { id: "email", label: "Email" },
          { id: "push", label: "Push" },
          { id: "whatsapp", label: "WhatsApp" },
        ],
      },
      {
        id: "conversion",
        label: "Conversion",
        icon: <FilterIcon size={17} />,
        subTabs: [
          { id: "funnel", label: "Funnel" },
          { id: "checkout", label: "Checkout & Payment" },
          { id: "dropoff", label: "Drop-off Analysis" },
        ],
      },
      {
        id: "automation",
        label: "Automation",
        icon: <Sparkles size={17} />,
        subTabs: [
          { id: "automations", label: "Workflows" },
          { id: "triggers", label: "Triggers" },
          { id: "activity", label: "Activity Stream" },
        ],
      },
    ],
  },
  {
    title: "Attribution & Intelligence",
    items: [
      {
        id: "ab-testing",
        label: "A/B Testing",
        icon: <Layers size={17} />,
        subTabs: [
          { id: "experiments", label: "Experiments" },
          { id: "active", label: "Active Tests" },
          { id: "results", label: "Results & Winners" },
        ],
      },
      {
        id: "attribution",
        label: "Attribution",
        icon: <ShieldCheckIcon size={17} />,
        subTabs: [
          { id: "overview", label: "Attribution Model" },
          { id: "first-touch", label: "First Touch" },
          { id: "last-touch", label: "Last Touch" },
          { id: "multi-touch", label: "Multi-Touch" },
        ],
      },
      {
        id: "roi",
        label: "ROI & Spend",
        icon: <LockIcon size={17} />,
        subTabs: [
          { id: "overall-roi", label: "Overall ROI" },
          { id: "campaign-roi", label: "Campaign ROI" },
          { id: "channel-roi", label: "Channel ROI" },
        ],
      },
      {
        id: "reports",
        label: "Reports",
        icon: <Download size={17} />,
        subTabs: [
          { id: "campaign-reports", label: "Campaigns" },
          { id: "acquisition-reports", label: "Acquisition" },
          { id: "revenue-reports", label: "Revenue" },
          { id: "export", label: "Exported Reports" },
        ],
      },
    ],
  },
];

export default function MarketingDashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const moduleParam = searchParams.get("tab") as MarketingModule | null;
  const subTabParam = searchParams.get("subtab");

  const [activeModule, setActiveModule] = useState<MarketingModule>(moduleParam || "overview");
  const [activeSubTab, setActiveSubTab] = useState<string>(subTabParam || "overview");
  const [dataVersion, setDataVersion] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // Multi-dimensional Filter State
  const [filters, setFilters] = useState<MarketingFilterState>({
    eventId: "all",
    organizer: "all",
    community: "all",
    dateRange: "30d",
    searchQuery: "",
    channel: "all",
  });

  // Builder form states
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignType, setNewCampaignType] = useState<MarketingCampaign["type"]>("Event Promotion");
  const [newCampaignAudience, setNewCampaignAudience] = useState("All Registered Attendees");
  const [newCampaignChannel, setNewCampaignChannel] = useState<MarketingCampaign["channel"]>("Multi-channel");
  const [newCampaignSpend, setNewCampaignSpend] = useState("");

  // Promo code form states
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoType, setNewPromoType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [newPromoValue, setNewPromoValue] = useState("");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState("");
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Broadcast compose state
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("all-attendees");
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [composing, setComposing] = useState(false);


  // Campaign Builder Platform Scope
  const [campaignScope, setCampaignScope] = useState<"PLATFORM" | "EVENT">("PLATFORM");
  const [campaignPlatformDest, setCampaignPlatformDest] = useState<string>("/");

  // Custom URLs & Tracking Links State
  const [shortLinks, setShortLinks] = useState<ShortLinkTracker[]>([]);
  const [telemetryStats, setTelemetryStats] = useState<any>(null);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkSlug, setNewLinkSlug] = useState("");
  const [newLinkDest, setNewLinkDest] = useState("/");
  const [newLinkScope, setNewLinkScope] = useState<"PLATFORM" | "EVENT">("PLATFORM");
  const [newLinkEventId, setNewLinkEventId] = useState("");
  const [newLinkUtmSource, setNewLinkUtmSource] = useState("twitter");
  const [newLinkUtmMedium, setNewLinkUtmMedium] = useState("social");
  const [newLinkUtmCampaign, setNewLinkUtmCampaign] = useState("");
  const [linkSearch, setLinkSearch] = useState("");

  const state = useMemo(() => {
    return getMarketingState(filters);
  }, [dataVersion, filters]);

  // Live synchronization with server store & storage updates
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/events").then((r) => r.json()).catch(() => ({ events: [] })),
      fetch("/api/v1/orders").then((r) => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/v1/attendees").then((r) => r.json()).catch(() => ({ attendees: [] })),
      fetch("/api/v1/short-links").then((r) => r.json()).catch(() => ({ short_links: [] })),
      fetch("/api/v1/analytics/track").then((r) => r.json()).catch(() => ({ stats: null })),
    ]).then(([eventsData, ordersData, attendeesData, linksData, telemetryData]) => {
      if (eventsData.events && Array.isArray(eventsData.events)) {
        localStorage.setItem("hackways_events_v7", JSON.stringify(eventsData.events));
      }
      if (ordersData.orders && Array.isArray(ordersData.orders)) {
        localStorage.setItem("hackways_orders_v7", JSON.stringify(ordersData.orders));
      }
      if (attendeesData.attendees && Array.isArray(attendeesData.attendees)) {
        localStorage.setItem("hackways_attendees_v7", JSON.stringify(attendeesData.attendees));
      }
      if (linksData.short_links && Array.isArray(linksData.short_links)) {
        setShortLinks(linksData.short_links);
      }
      if (telemetryData.stats) {
        setTelemetryStats(telemetryData.stats);
      }
      setDataVersion((v) => v + 1);
    });

    const handleDataChange = () => {
      fetch("/api/v1/short-links").then(r => r.json()).then(d => { if (d.short_links) setShortLinks(d.short_links); }).catch(() => {});
      fetch("/api/v1/analytics/track").then(r => r.json()).then(d => { if (d.stats) setTelemetryStats(d.stats); }).catch(() => {});
      setDataVersion((v) => v + 1);
    };
    window.addEventListener("hackways_events_updated", handleDataChange);
    window.addEventListener("hackways_orders_updated", handleDataChange);
    window.addEventListener("hackways_attendees_updated", handleDataChange);
    window.addEventListener("hackways_tickets_updated", handleDataChange);
    window.addEventListener("storage", handleDataChange);

    return () => {
      window.removeEventListener("hackways_events_updated", handleDataChange);
      window.removeEventListener("hackways_orders_updated", handleDataChange);
      window.removeEventListener("hackways_attendees_updated", handleDataChange);
      window.removeEventListener("hackways_tickets_updated", handleDataChange);
      window.removeEventListener("storage", handleDataChange);
    };
  }, []);


  const allNavItems = useMemo(() => {
    return MARKETING_NAV_CATEGORIES.flatMap((c) => c.items);
  }, []);

  const currentNavSection = useMemo(() => {
    return allNavItems.find((s) => s.id === activeModule) || allNavItems[0];
  }, [activeModule, allNavItems]);

  useEffect(() => {
    if (moduleParam && allNavItems.some((s) => s.id === moduleParam)) {
      setActiveModule(moduleParam);
    }
  }, [moduleParam, allNavItems]);

  useEffect(() => {
    if (!subTabParam || !currentNavSection.subTabs.some((st) => st.id === subTabParam)) {
      setActiveSubTab(currentNavSection.subTabs[0]?.id || "overview");
    } else {
      setActiveSubTab(subTabParam);
    }
  }, [currentNavSection, subTabParam]);

  const handleModuleChange = (mod: MarketingModule) => {
    setActiveModule(mod);
    const target = allNavItems.find((s) => s.id === mod);
    const firstSub = target?.subTabs[0]?.id || "overview";
    setActiveSubTab(firstSub);
    router.replace(`/console/marketing?tab=${mod}&subtab=${firstSub}`, { scroll: false });
  };

  const handleSubTabChange = (subId: string) => {
    setActiveSubTab(subId);
    router.replace(`/console/marketing?tab=${activeModule}&subtab=${subId}`, { scroll: false });
  };

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleCreateShortLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim()) { notify("Please enter a link title"); return; }
    
    let dest = newLinkDest.trim();
    if (newLinkScope === "EVENT" && newLinkEventId) {
      dest = `/events/${newLinkEventId}`;
    }
    if (!dest) dest = "/";

    try {
      const res = await fetch("/api/v1/short-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLinkTitle.trim(),
          code: newLinkSlug.trim() || undefined,
          destination_url: dest,
          scope: newLinkScope,
          event_id: newLinkScope === "EVENT" ? newLinkEventId : undefined,
          utm_source: newLinkUtmSource.trim() || undefined,
          utm_medium: newLinkUtmMedium.trim() || undefined,
          utm_campaign: newLinkUtmCampaign.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.short_link) {
        setShortLinks((prev) => [data.short_link, ...prev]);
        notify(`Short link created: /l/${data.short_link.code}`);
        setNewLinkTitle("");
        setNewLinkSlug("");
        setNewLinkUtmCampaign("");
        handleSubTabChange("all-links");
      }
    } catch {
      notify("Failed to create short link");
    }
  };

  const handleDeleteShortLink = async (idOrCode: string) => {
    try {
      await fetch(`/api/v1/short-links?id=${idOrCode}`, { method: "DELETE" });
      setShortLinks((prev) => prev.filter((l) => l.id !== idOrCode && l.code !== idOrCode));
      notify("Tracking link removed");
    } catch {
      notify("Failed to delete link");
    }
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    const campaign: MarketingCampaign = {
      id: `cmp_${Date.now()}`,
      name: newCampaignName.trim(),
      type: newCampaignType,
      status: "ACTIVE",
      audience: newCampaignAudience,
      channel: newCampaignChannel,
      eventId: campaignScope === "PLATFORM" ? "platform" : filters.eventId || state.primaryEvent.id,
      eventName: campaignScope === "PLATFORM" ? `Platform: ${campaignPlatformDest}` : state.allEvents.find(e => e.id === filters.eventId)?.title || state.primaryEvent.title,
      banner_url: state.primaryEvent.banner_url,
      square_banner_url: state.primaryEvent.square_banner_url,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      reach: 0,
      impressions: 0,
      clicks: 0,
      registrations: 0,
      ticketsSold: 0,
      revenue: 0,
      spend: Number(newCampaignSpend) || 0,
      conversionRate: "0.0%",
      roas: "—",
    };

    saveStoredCampaign(campaign);
    setNewCampaignName("");
    setNewCampaignSpend("");
    notify("Campaign launched successfully");
    setDataVersion((v) => v + 1);
    handleModuleChange("campaigns");
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;

    const promo: PromoCodeItem = {
      code: newPromoCode.trim().toUpperCase(),
      discountType: newPromoType,
      discountValue: Number(newPromoValue) || 10,
      usageCount: 0,
      maxUses: Number(newPromoMaxUses) || 50,
      eventName: state.primaryEvent.title,
      status: "ACTIVE",
      revenueGenerated: 0,
      discountGiven: 0,
    };

    saveStoredPromo(promo);
    setNewPromoCode("");
    setShowPromoModal(false);
    notify(`Promo code ${promo.code} activated`);
    setDataVersion((v) => v + 1);
  };

  const handleExportCsv = () => {
    const rows = [
      ["Campaign Name", "Type", "Status", "Channel", "Reach", "Clicks", "Tickets Sold", "Revenue", "Spend"],
      ...state.campaigns.map((c) => [
        c.name,
        c.type,
        c.status,
        c.channel,
        c.reach.toString(),
        c.clicks.toString(),
        c.ticketsSold.toString(),
        c.revenue.toString(),
        c.spend.toString(),
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `marketing_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Marketing CSV report exported");
  };

  const kpis = useMemo(() => {
    return getMarketingKpis(activeModule, activeSubTab, state);
  }, [activeModule, activeSubTab, state]);

  // Filtered campaigns for display
  const displayedCampaigns = useMemo(() => {
    return state.campaigns.filter((c) => {
      if (activeSubTab === "active" && c.status !== "ACTIVE") return false;
      if (activeSubTab === "scheduled" && c.status !== "SCHEDULED") return false;
      if (activeSubTab === "drafts" && c.status !== "DRAFT") return false;
      if (activeSubTab === "completed" && c.status !== "COMPLETED") return false;
      if (activeSubTab === "paused" && c.status !== "PAUSED") return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.audience.toLowerCase().includes(q)) return false;
      }
      if (filters.channel !== "all" && c.channel !== filters.channel) return false;
      return true;
    });
  }, [state.campaigns, activeSubTab, filters]);

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
              Marketing Suite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleModuleChange("builder")}
            className="text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 px-4 py-1.5 rounded-full transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus size={13} />
            <span>New Campaign</span>
          </button>

          <Link
            href={user?.role === "admin" ? "/console/super-admin/overview" : "/console/organizer/overview"}
            className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-4 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>{user?.role === "admin" ? "Back to Super Admin" : "Back to Organizer"}</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>

      {/* TOAST FEEDBACK */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 bg-zinc-950 text-white px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. MAIN SPLIT LAYOUT: FIXED LEFT SIDEBAR + FULL CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT MARKETING NAVIGATION SIDEBAR (MATCHING USER MANAGEMENT CATEGORIES) */}
        <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white py-4 px-3 flex flex-col justify-between h-full overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            {MARKETING_NAV_CATEGORIES.map((cat) => (
              <div key={cat.title} className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-heading">
                  {cat.title}
                </div>
                <nav className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleModuleChange(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition text-left cursor-pointer ${
                          isActive
                            ? "text-zinc-950 font-semibold bg-zinc-100"
                            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 font-normal"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={isActive ? "text-zinc-950" : "text-zinc-400"}>
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.id === "campaigns" && state.campaigns.length > 0 && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {state.campaigns.length}
                          </span>
                        )}
                        {item.id === "promotions" && state.promoCodes.length > 0 && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {state.promoCodes.length}
                          </span>
                        )}
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
          {/* Top Control Bar with Multi-Dimensional Capsule Filters */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-zinc-950 font-heading tracking-tight">
                  {currentNavSection.label}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700">
                  {filters.eventId === "all" ? "All Platform Events" : state.primaryEvent.title}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeModule === "overview" && "Performance snapshot across campaigns, traffic, and conversion funnel."}
                {activeModule === "campaigns" && "Manage and monitor all your marketing campaigns in one place."}
                {activeModule === "builder" && "Configure and launch a new multi-channel promotional campaign."}
                {activeModule === "acquisition" && "Track traffic sources, referrals, and affiliate-driven conversions."}
                {activeModule === "audience" && "Segment your audience and create targeted cohorts for campaigns."}
                {activeModule === "promotions" && "Create and track promo codes, coupons, and discount campaigns."}
                {activeModule === "communications" && "Manage broadcast messages across Email, WhatsApp, and Push channels."}
                {activeModule === "conversion" && "Analyse drop-off at each stage of the registration and checkout funnel."}
                {activeModule === "automation" && "Configure automated workflows triggered by attendee and ticket events."}
                {activeModule === "ab-testing" && "Run split tests on CTAs, pricing, and page layouts to optimise conversion."}
                {activeModule === "attribution" && "Understand which channels and touches are driving your ticket sales."}
                {activeModule === "roi" && "Measure marketing return on spend and ROAS across all campaigns."}
                {activeModule === "reports" && "Export detailed reports for campaigns, acquisition, and revenue."}
              </p>
            </div>

            {/* Global Multi-dimensional Capsule Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input capsule */}
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search campaigns, sources..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                  className="text-xs bg-white border border-zinc-200 rounded-full pl-8 pr-4 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 w-44 sm:w-52 shadow-2xs"
                />
              </div>

              {/* Event Filter Capsule */}
              <select
                value={filters.eventId}
                onChange={(e) => setFilters((prev) => ({ ...prev, eventId: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Events ({state.allEvents.length})</option>
                {state.allEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              {/* Community / Organiser Filter Capsule */}
              <select
                value={filters.organizer}
                onChange={(e) => setFilters((prev) => ({ ...prev, organizer: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Organisers</option>
                {state.organizers.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>

              {/* Date Range Filter Capsule */}
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value as any }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>

              {/* Channel Filter Capsule */}
              <select
                value={filters.channel}
                onChange={(e) => setFilters((prev) => ({ ...prev, channel: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Channels</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="Social">Social</option>
                <option value="Multi-channel">Multi-channel</option>
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

              {/* Quick Action Capsule — per-module primary action */}
              {activeModule === "campaigns" && (
                <button
                  onClick={() => handleModuleChange("builder")}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>New Campaign</span>
                </button>
              )}
              {activeModule === "promotions" && (
                <button
                  onClick={() => setShowPromoModal(true)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>Add Promo Code</span>
                </button>
              )}
              {activeModule === "audience" && (
                <button
                  onClick={() => notify("Segment builder coming soon — configure via Campaign Builder for now")}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>New Segment</span>
                </button>
              )}
              {activeModule === "communications" && (
                <button
                  onClick={() => notify("Broadcast composer launching — choose channel and message below")}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Send size={13} />
                  <span>Send Broadcast</span>
                </button>
              )}
              {activeModule === "automation" && (
                <button
                  onClick={() => notify("Workflow builder — connect triggers and channel actions")}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>New Workflow</span>
                </button>
              )}
              {activeModule === "reports" && (
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download size={13} />
                  <span>Export All</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tabs: hidden for builder (step indicator replaces it) */}
          {activeModule !== "builder" && (
            <div className="flex items-center gap-6 border-b border-zinc-200 overflow-x-auto no-scrollbar pt-1">
              {currentNavSection.subTabs.map((sub) => {
                const isSubActive = activeSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSubTabChange(sub.id)}
                    className={`pb-3 text-xs transition relative whitespace-nowrap cursor-pointer ${
                      isSubActive
                        ? "text-zinc-950 font-semibold"
                        : "text-zinc-500 hover:text-zinc-800 font-normal"
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
          )}

          {/* KPI strip — hidden in builder (no campaign metrics needed when creating one) */}
          {activeModule !== "builder" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 border-y border-zinc-200 py-3 my-4">
              {kpis.map((kpi, idx) => (
                <MetricCard
                  key={idx}
                  label={kpi.label}
                  value={kpi.value}
                  delta={kpi.delta}
                  isPositive={kpi.isPositive}
                  subtext={kpi.subtext}
                  prefix={kpi.prefix}
                  suffix={kpi.suffix}
                />
              ))}
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 1: MARKETING OVERVIEW */}
          {/* ========================================== */}
          {activeModule === "overview" && (
            <div className="space-y-8">
              {/* Traffic & Reach Chart Strip */}
              <div className="border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Marketing Reach & Impressions</h3>
                    <p className="text-xs text-zinc-500">Connect an analytics integration to see traffic data</p>
                  </div>
                  <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-full">
                    {filters.dateRange === "7d" ? "Last 7 Days" : filters.dateRange === "90d" ? "Last 90 Days" : "Last 30 Days"}
                  </span>
                </div>
                {(() => {
                  const totalCampaignReach = state.campaigns.reduce((s, c) => s + (c.reach || 0), 0);
                  const totalCampaignImpressions = state.campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
                  const hasReachData = totalCampaignReach > 0 || totalCampaignImpressions > 0;

                  if (!hasReachData) {
                    return (
                      <div className="h-[180px] flex flex-col items-center justify-center text-zinc-300 gap-2">
                        <BarChart2 size={32} strokeWidth={1.2} />
                        <p className="text-xs text-zinc-500 font-medium">No traffic or reach data yet</p>
                        <p className="text-[11px] text-zinc-400">Connect Google Analytics / Meta Pixel or launch a campaign to track reach.</p>
                      </div>
                    );
                  }

                  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const counts = [0, 0, 0, 0, 0, 0, 0];
                  const now = new Date();
                  const labels: string[] = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    labels.push(days[d.getDay()]);
                  }
                  const dailyReach = Math.round(totalCampaignReach / 7);
                  for (let i = 0; i < 7; i++) {
                    counts[i] = dailyReach;
                  }
                  return (
                    <AreaChart
                      data={counts}
                      labels={labels}
                      height={180}
                      color="#18181b"
                      valueSuffix=" reach"
                    />
                  );
                })()}
              </div>

              {/* Conversion Funnel + Top Traffic Sources */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Funnel */}
                <div className="border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Conversion Funnel</h3>
                  {state.totalTickets > 0 ? (
                    <FunnelChart
                      stages={[
                        { step: "Tickets Purchased", count: state.totalTickets, rate: "100%" },
                        { step: "Checked In", count: state.attendees.filter(a => a.status === "CHECKED_IN").length, rate: state.totalTickets > 0 ? `${Math.round((state.attendees.filter(a => a.status === "CHECKED_IN").length / state.totalTickets) * 100)}%` : "0%" },
                      ]}
                    />
                  ) : (
                    <div className="h-[140px] flex flex-col items-center justify-center text-zinc-300 gap-2">
                      <TrendingUp size={28} strokeWidth={1.2} />
                      <p className="text-xs text-zinc-400">No conversions yet</p>
                    </div>
                  )}
                </div>

                {/* Top Sources */}
                <div className="border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Top Acquisition Sources</h3>
                  {state.trafficSources.length > 0 ? (
                    <div className="divide-y divide-zinc-100 text-xs">
                      {state.trafficSources.map((src, i) => (
                        <div key={i} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-950">{src.source}</p>
                            <p className="text-zinc-400 text-[11px]">{src.visitors.toLocaleString()} visitors</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-950">{src.ticketsSold} tickets</p>
                            <p className="text-emerald-600 font-semibold text-[11px]">{src.conversionRate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[140px] flex flex-col items-center justify-center text-zinc-300 gap-2">
                      <Globe size={28} strokeWidth={1.2} />
                      <p className="text-xs text-zinc-400">No source data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 2: CAMPAIGNS */}
          {/* ========================================== */}
          {activeModule === "campaigns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-bold text-zinc-950 font-heading">
                  All Marketing Campaigns ({displayedCampaigns.length})
                </h3>
                <button
                  onClick={() => handleModuleChange("builder")}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>New Campaign</span>
                </button>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Campaign Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Audience</th>
                      <th className="py-3 px-4">Reach</th>
                      <th className="py-3 px-4">Tickets</th>
                      <th className="py-3 px-4">Revenue</th>
                      <th className="py-3 px-4">ROAS</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {displayedCampaigns.length > 0 ? (
                      displayedCampaigns.map((cmp) => (
                        <tr key={cmp.id} className="hover:bg-zinc-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-zinc-950">{cmp.name}</div>
                            <div className="text-[11px] text-zinc-400">{cmp.eventName}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-600">{cmp.type}</td>
                          <td className="py-3 px-4 text-zinc-500">{cmp.channel}</td>
                          <td className="py-3 px-4 text-zinc-500">{cmp.audience}</td>
                          <td className="py-3 px-4 tabular-nums font-medium">{cmp.reach.toLocaleString()}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">{cmp.ticketsSold}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">₹{cmp.revenue.toLocaleString()}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-600">{cmp.roas}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                cmp.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : cmp.status === "SCHEDULED"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {cmp.status.toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-400">
                          <ZapIcon size={24} className="mx-auto mb-2 text-zinc-300" />
                          <p className="font-semibold text-zinc-600 text-xs">No marketing campaigns found</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {state.campaigns.length === 0
                              ? "Create your first campaign using the Campaign Builder to start promoting your events."
                              : "No campaigns match the current filter or search criteria."}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 3: CAMPAIGN BUILDER — 5-step wizard */}
          {/* ========================================== */}
          {activeModule === "builder" && (
            <div className="max-w-3xl space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-0">
                {currentNavSection.subTabs.map((sub, idx) => {
                  const stepIdx = currentNavSection.subTabs.findIndex(s => s.id === activeSubTab);
                  const done = idx < stepIdx;
                  const active = sub.id === activeSubTab;
                  return (
                    <React.Fragment key={sub.id}>
                      <button
                        onClick={() => handleSubTabChange(sub.id)}
                        className={`flex items-center gap-2 text-xs font-medium cursor-pointer transition ${
                          active ? "text-zinc-950" : done ? "text-emerald-600" : "text-zinc-400"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          active ? "bg-zinc-950 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {done ? <Check size={10} /> : idx + 1}
                        </span>
                        <span className="hidden sm:inline whitespace-nowrap">{sub.label}</span>
                      </button>
                      {idx < currentNavSection.subTabs.length - 1 && (
                        <span className="flex-1 h-px bg-zinc-200 mx-3" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <form onSubmit={handleCreateCampaign} className="border border-zinc-200 rounded-xl p-6 space-y-5 shadow-2xs text-xs">

                {/* STEP 1: Campaign Details */}
                {activeSubTab === "details" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Campaign Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Early Bird Flash Access"
                          value={newCampaignName}
                          onChange={(e) => setNewCampaignName(e.target.value)}
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">Type</label>
                        <select
                          value={newCampaignType}
                          onChange={(e) => setNewCampaignType(e.target.value as any)}
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                        >
                          <option value="Event Promotion">Event Promotion</option>
                          <option value="Ticket Sale">Ticket Sale</option>
                          <option value="Early Bird">Early Bird</option>
                          <option value="Last-Minute">Last-Minute</option>
                          <option value="Retargeting">Retargeting</option>
                          <option value="Referral">Referral</option>
                          <option value="Announcement">Announcement</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="font-semibold text-zinc-700 block mb-1.5">Campaign Target Scope</label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => setCampaignScope("PLATFORM")}
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            campaignScope === "PLATFORM"
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <div className="font-semibold text-xs">Platform-Wide</div>
                          <div className={`text-[11px] ${campaignScope === "PLATFORM" ? "text-zinc-300" : "text-zinc-400"}`}>
                            Homepage, Explore, or Custom Platform Page
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCampaignScope("EVENT")}
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            campaignScope === "EVENT"
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <div className="font-semibold text-xs">Specific Event</div>
                          <div className={`text-[11px] ${campaignScope === "EVENT" ? "text-zinc-300" : "text-zinc-400"}`}>
                            Target an individual event and its ticket tiers
                          </div>
                        </button>
                      </div>

                      {campaignScope === "EVENT" ? (
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1.5">Target Event</label>
                          {state.allEvents.length === 0 ? (
                            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-500 text-xs">
                              No events found in database. Select Platform-Wide or create an event in console first.
                            </div>
                          ) : (
                            <select
                              value={filters.eventId}
                              onChange={(e) => setFilters(prev => ({ ...prev, eventId: e.target.value }))}
                              className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                            >
                              {state.allEvents.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1.5">Platform Target Surface</label>
                          <select
                            value={campaignPlatformDest}
                            onChange={(e) => setCampaignPlatformDest(e.target.value)}
                            className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                          >
                            <option value="/">Platform Homepage (/)</option>
                            <option value="/home">Explore &amp; Discover Events (/home)</option>
                            <option value="/c/explore">Communities &amp; Channels (/c/explore)</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCampaignName.trim()) { notify("Enter a campaign name first"); return; }
                          handleSubTabChange("audience");
                        }}
                        className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Audience */}
                {activeSubTab === "audience" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Target Audience</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                          Target Segment / Description
                        </label>
                        <input
                          type="text"
                          value={newCampaignAudience}
                          onChange={(e) => setNewCampaignAudience(e.target.value)}
                          placeholder="e.g. All Registered Attendees, Community Members, Twitter Followers..."
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-900 bg-white"
                        />
                      </div>

                      {/* Dynamic tiers from the selected event only if configured */}
                      {state.primaryEvent?.tiers && state.primaryEvent.tiers.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-medium text-zinc-500">Or select from configured event tiers:</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setNewCampaignAudience("All Registered Attendees")}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                newCampaignAudience === "All Registered Attendees"
                                  ? "border-zinc-950 bg-zinc-950 text-white"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                              }`}
                            >
                              All Registered Attendees ({state.attendees.length})
                            </button>
                            {state.primaryEvent.tiers.map((t) => {
                              const count = state.attendees.filter(
                                (a) => a.tierId === t.id || a.tierName === t.name
                              ).length;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setNewCampaignAudience(`${t.name} Pass Holders`)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                                    newCampaignAudience === `${t.name} Pass Holders`
                                      ? "border-zinc-950 bg-zinc-950 text-white"
                                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                                  }`}
                                >
                                  {t.name} ({count})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button type="button" onClick={() => handleSubTabChange("details")} className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer">← Back</button>
                      <button type="button" onClick={() => handleSubTabChange("channel")} className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer">Next →</button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Channel */}
                {activeSubTab === "channel" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Channel</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { value: "Multi-channel", icon: <Layers size={18} />, desc: "Email + WA + Push" },
                        { value: "WhatsApp", icon: <Smartphone size={18} />, desc: "WhatsApp messages" },
                        { value: "Email", icon: <Mail size={18} />, desc: "Email blast" },
                        { value: "Push", icon: <Radio size={18} />, desc: "Web push" },
                        { value: "Social", icon: <Share2 size={18} />, desc: "Social posts" },
                      ] as { value: MarketingCampaign["channel"]; icon: React.ReactNode; desc: string }[]).map(ch => (
                        <button
                          key={ch.value}
                          type="button"
                          onClick={() => setNewCampaignChannel(ch.value)}
                          className={`p-4 rounded-lg border text-left space-y-2 transition cursor-pointer ${
                            newCampaignChannel === ch.value
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                          }`}
                        >
                          <div className={newCampaignChannel === ch.value ? "text-white" : "text-zinc-500"}>{ch.icon}</div>
                          <p className="font-semibold">{ch.value}</p>
                          <p className={`text-[11px] ${newCampaignChannel === ch.value ? "text-zinc-300" : "text-zinc-400"}`}>{ch.desc}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button type="button" onClick={() => handleSubTabChange("audience")} className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer">← Back</button>
                      <button type="button" onClick={() => handleSubTabChange("content")} className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer">Next →</button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Creative */}
                {activeSubTab === "content" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Creative &amp; Banners</h3>

                    {/* Message copy */}
                    <div className="space-y-3">
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">Headline</label>
                        <input
                          type="text"
                          placeholder="e.g. Spots are running out — grab yours now"
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">Body</label>
                        <textarea
                          rows={3}
                          placeholder="Write a short message..."
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900 resize-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">CTA Text</label>
                        <input
                          type="text"
                          placeholder="e.g. Register now"
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900"
                        />
                      </div>
                    </div>

                    {/* Banners */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                      {/* 16:9 */}
                      <div className="space-y-2">
                        <label className="font-semibold text-zinc-700 block">16:9 Banner</label>
                        {state.primaryEvent.banner_url ? (
                          <div className="aspect-video w-full rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                            <img
                              src={state.primaryEvent.banner_url}
                              alt="16:9 banner"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video w-full rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Download size={18} className="rotate-180" />
                            <p className="text-[11px]">No banner uploaded</p>
                            <p className="text-[10px] text-zinc-400">Go to Event Settings → Banners</p>
                          </div>
                        )}
                      </div>

                      {/* 1:1 */}
                      <div className="space-y-2">
                        <label className="font-semibold text-zinc-700 block">1:1 Square</label>
                        {state.primaryEvent.square_banner_url ? (
                          <div className="aspect-square w-36 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                            <img
                              src={state.primaryEvent.square_banner_url}
                              alt="1:1 banner"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square w-36 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Download size={16} className="rotate-180" />
                            <p className="text-[10px]">Not uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(!state.primaryEvent.banner_url || !state.primaryEvent.square_banner_url) && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        ⚠ Upload both banners in Event Settings before launching this campaign.
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button type="button" onClick={() => handleSubTabChange("channel")} className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer">← Back</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (campaignScope === "EVENT" && (!state.primaryEvent.banner_url || !state.primaryEvent.square_banner_url)) {
                            notify("Upload both banners in Event Settings first");
                            return;
                          }
                          handleSubTabChange("schedule");
                        }}
                        className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: Schedule & Launch */}
                {activeSubTab === "schedule" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Schedule &amp; Launch</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">Allocated Spend (₹)</label>
                        <input
                          type="number"
                          placeholder="2500"
                          value={newCampaignSpend}
                          onChange={(e) => setNewCampaignSpend(e.target.value)}
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-zinc-700 block mb-1.5">Launch Timing</label>
                        <select className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:border-zinc-900 cursor-pointer">
                          <option>Send immediately</option>
                          <option>Schedule for later</option>
                          <option>Save as draft</option>
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-2 text-[11px]">
                      <p className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] mb-2">Campaign Summary</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                        <div className="flex justify-between"><span className="text-zinc-500">Name</span><span className="font-semibold text-zinc-900 truncate ml-2">{newCampaignName || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Type</span><span className="font-semibold text-zinc-900">{newCampaignType}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Audience</span><span className="font-semibold text-zinc-900 truncate ml-2">{newCampaignAudience}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Channel</span><span className="font-semibold text-zinc-900">{newCampaignChannel}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Budget</span><span className="font-semibold text-zinc-900">₹{Number(newCampaignSpend || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Event</span><span className="font-semibold text-zinc-900 truncate ml-2">{state.primaryEvent.title}</span></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button type="button" onClick={() => handleSubTabChange("content")} className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer">← Back</button>
                      <button
                        type="submit"
                        className="px-6 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                      >
                        Launch Campaign
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModuleChange("campaigns")}
                        className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

              </form>
            </div>
          )}


          {/* ========================================== */}
          {/* MODULE 4: ACQUISITION */}
          {/* ========================================== */}
          {activeModule === "acquisition" && (
            <div className="space-y-6">
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Visitors</th>
                      <th className="py-3 px-4">Sessions</th>
                      <th className="py-3 px-4">Clicks</th>
                      <th className="py-3 px-4">Tickets Sold</th>
                      <th className="py-3 px-4">Revenue</th>
                      <th className="py-3 px-4">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {state.trafficSources.length > 0 ? (
                      state.trafficSources.map((src, i) => (
                        <tr key={i} className="hover:bg-zinc-50/70 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-950">{src.source}</td>
                          <td className="py-3 px-4 text-zinc-500">{src.category}</td>
                          <td className="py-3 px-4 tabular-nums">{src.visitors.toLocaleString()}</td>
                          <td className="py-3 px-4 tabular-nums">{src.sessions.toLocaleString()}</td>
                          <td className="py-3 px-4 tabular-nums">{src.clicks.toLocaleString()}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">{src.ticketsSold}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">₹{src.revenue.toLocaleString()}</td>
                          <td className="py-3 px-4 text-emerald-600 font-semibold">{src.conversionRate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-zinc-400">
                          <Globe size={22} className="mx-auto mb-2 text-zinc-300" />
                          <p className="font-semibold text-zinc-500 text-xs">No traffic data recorded yet</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Visitor telemetry and conversion paths will display here once attendees browse your events.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Referrals & Affiliates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Referrals */}
                <div className="border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Top Referrers</h3>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {state.referrals.length > 0 ? (
                      state.referrals.map((ref) => (
                        <div key={ref.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-950">{ref.referrerName}</p>
                            <p className="text-zinc-400 text-[11px] font-mono">{ref.code}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-950">{ref.ticketsSold} tickets sold</p>
                            <p className="text-zinc-500 text-[11px]">{ref.rewardValue}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-zinc-400">
                        <Share2 size={20} className="mx-auto mb-1.5 text-zinc-300" />
                        <p className="text-zinc-500 font-medium">No referrals yet</p>
                        <p className="text-[11px] text-zinc-400">Peer-to-peer referral links will track here once shared.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Affiliates */}
                <div className="border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Active Affiliates</h3>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {state.affiliates.length > 0 ? (
                      state.affiliates.map((aff) => (
                        <div key={aff.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-950">{aff.name}</p>
                            <p className="text-zinc-400 text-[11px] font-mono">Code: {aff.code}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-950">₹{aff.revenue.toLocaleString()}</p>
                            <p className="text-emerald-600 text-[11px] font-semibold">₹{aff.commission.toLocaleString()} commission</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-zinc-400">
                        <UsersGroupIcon size={20} className="mx-auto mb-1.5 text-zinc-300" />
                        <p className="text-zinc-500 font-medium">No affiliate partners yet</p>
                        <p className="text-[11px] text-zinc-400">Affiliate tracking codes will appear here once partner agreements are active.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 5: AUDIENCE */}
          {/* ========================================== */}
          {activeModule === "audience" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-bold text-zinc-950 font-heading">Audience Segments &amp; Cohorts</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => notify("Use Campaign Builder to target this segment directly")}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    <span>Target Segment</span>
                  </button>
                  <button
                    onClick={() => notify("Segment builder coming soon")}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Plus size={12} />
                    <span>New Segment</span>
                  </button>
                </div>
              </div>
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Segment Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Criteria</th>
                      <th className="py-3 px-4">Profiles</th>
                      <th className="py-3 px-4">Avg LTV</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {state.audienceSegments.length > 0 ? (
                      state.audienceSegments.map((seg) => (
                        <tr key={seg.id} className="hover:bg-zinc-50/70 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-950">{seg.name}</td>
                          <td className="py-3 px-4 text-zinc-500">{seg.type}</td>
                          <td className="py-3 px-4 text-zinc-600">{seg.criteria}</td>
                          <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">{seg.count}</td>
                          <td className="py-3 px-4 tabular-nums">{seg.avgLtv > 0 ? `₹${seg.avgLtv.toLocaleString()}` : "—"}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => { handleModuleChange("builder"); notify(`Targeting: ${seg.name}`); }}
                              className="px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                            >
                              Run Campaign
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-400">
                          <UsersGroupIcon size={22} className="mx-auto mb-2 text-zinc-300" />
                          <p className="font-semibold text-zinc-500 text-xs">No audience data yet</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Attendee profiles and dynamic cohorts will populate here once people register.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 6: PROMOTIONS */}
          {/* ========================================== */}
          {activeModule === "promotions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-bold text-zinc-950 font-heading">Active Promo Codes & Discounts</h3>
                <button
                  onClick={() => setShowPromoModal(true)}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Create Code</span>
                </button>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Redemptions</th>
                      <th className="py-3 px-4">Discounted Value</th>
                      <th className="py-3 px-4">Attributed Revenue</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {state.promoCodes.length > 0 ? (
                      state.promoCodes.map((p, i) => (
                        <tr key={i} className="hover:bg-zinc-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-950">{p.code}</td>
                          <td className="py-3 px-4 text-zinc-600">
                            {p.discountType === "PERCENT" ? `${p.discountValue}% OFF` : `₹${p.discountValue} OFF`}
                          </td>
                          <td className="py-3 px-4 tabular-nums">
                            {p.usageCount} / {p.maxUses}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-zinc-600">₹{p.discountGiven.toLocaleString()}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">₹{p.revenueGenerated.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              {p.status.toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-400">
                          <Tag size={22} className="mx-auto mb-2 text-zinc-300" />
                          <p className="font-semibold text-zinc-500 text-xs">No promo codes created yet</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Click "Create Code" above to launch a discount or early-bird coupon.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE: CUSTOM URLS & MARKETING TRACKERS */}
          {/* ========================================== */}
          {activeModule === "custom-urls" && (
            <div className="space-y-6">
              {/* Header with Sub-tabs & Create Link Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubTabChange("all-links")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeSubTab === "all-links" || activeSubTab === "overview"
                        ? "bg-zinc-950 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    All Tracking URLs ({shortLinks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubTabChange("create")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeSubTab === "create"
                        ? "bg-zinc-950 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    + Create Custom Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubTabChange("traffic")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeSubTab === "traffic"
                        ? "bg-zinc-950 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    Traffic Analytics
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubTabChange("create")}
                    className="text-xs font-semibold px-4 py-1.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>New Tracking URL</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: All Tracking URLs */}
              {(activeSubTab === "all-links" || activeSubTab === "overview") && (
                <div className="space-y-4">
                  {/* KPI Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Active Links</p>
                      <p className="text-xl font-bold text-zinc-950 tabular-nums">{shortLinks.length}</p>
                      <p className="text-[10px] text-zinc-400">Custom URLs created</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Clicks</p>
                      <p className="text-xl font-bold text-zinc-950 tabular-nums">
                        {shortLinks.reduce((acc, l) => acc + (l.clicks || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400">Redirects served</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Unique Visitors</p>
                      <p className="text-xl font-bold text-zinc-950 tabular-nums">
                        {shortLinks.reduce((acc, l) => acc + (l.unique_visitors || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400">Unique devices reached</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1 shadow-2xs">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Platform Visits</p>
                      <p className="text-xl font-bold text-zinc-950 tabular-nums">
                        {(telemetryStats?.total_events || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400">Internal mass analytics</p>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search links by title, slug, or destination..."
                        value={linkSearch}
                        onChange={(e) => setLinkSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Tracking URLs Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Title &amp; Short URL</th>
                          <th className="py-3 px-4">Target Destination</th>
                          <th className="py-3 px-4">Scope</th>
                          <th className="py-3 px-4">UTM Tags</th>
                          <th className="py-3 px-4">Clicks</th>
                          <th className="py-3 px-4">Unique Visitors</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {shortLinks
                          .filter((l) => {
                            if (!linkSearch.trim()) return true;
                            const q = linkSearch.toLowerCase();
                            return (
                              l.title.toLowerCase().includes(q) ||
                              l.code.toLowerCase().includes(q) ||
                              l.destination_url.toLowerCase().includes(q)
                            );
                          })
                          .map((link) => (
                            <tr key={link.id} className="hover:bg-zinc-50/70 transition">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-zinc-950">{link.title}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-zinc-500">
                                  <span className="text-zinc-400">/l/</span>
                                  <span className="text-zinc-900 font-bold">{link.code}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `${window.location.origin}/l/${link.code}`;
                                      navigator.clipboard.writeText(url);
                                      notify(`Copied: ${url}`);
                                    }}
                                    className="p-1 hover:text-zinc-900 transition text-zinc-400 cursor-pointer"
                                    title="Copy Short Link"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-zinc-600 max-w-[200px] truncate">
                                <span className="font-mono text-[11px]">{link.destination_url}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    link.scope === "EVENT"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  }`}
                                >
                                  {link.scope || "PLATFORM"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[11px] text-zinc-500">
                                {link.utm_source || link.utm_medium || link.utm_campaign ? (
                                  <div className="flex flex-wrap gap-1">
                                    {link.utm_source && (
                                      <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                                        src:{link.utm_source}
                                      </span>
                                    )}
                                    {link.utm_medium && (
                                      <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                                        med:{link.utm_medium}
                                      </span>
                                    )}
                                    {link.utm_campaign && (
                                      <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                                        cmp:{link.utm_campaign}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-zinc-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-zinc-950 tabular-nums">
                                {(link.clicks || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-zinc-600 tabular-nums">
                                {(link.unique_visitors || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <a
                                    href={webAppHref(`/l/${link.code}`)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition"
                                    title="Test Redirect"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShortLink(link.id)}
                                    className="p-1.5 rounded-md border border-zinc-200 text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                    title="Delete Link"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}

                        {shortLinks.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-zinc-400">
                              <LinkIcon size={24} className="mx-auto mb-2 text-zinc-300" />
                              <p className="font-semibold text-zinc-600 text-xs">No Custom Marketing Links Created Yet</p>
                              <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                                Generate short links with custom vanity slugs and UTM tags for any platform landing page or event drop.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleSubTabChange("create")}
                                className="mt-4 px-4 py-1.5 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                              >
                                Create First Link
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: Create Custom Link Form */}
              {activeSubTab === "create" && (
                <div className="max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 font-heading">Create Custom Tracking Link</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Generate a short URL with built-in UTM parameters and click telemetry.
                    </p>
                  </div>

                  <form onSubmit={handleCreateShortLink} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Link Title / Campaign Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. Twitter Thread Launch, Bio Link, Tech Sponsor Blast"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-900 bg-white"
                        required
                      />
                    </div>

                    {/* Scope Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Target Destination Scope</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewLinkScope("PLATFORM")}
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            newLinkScope === "PLATFORM"
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <p className="font-semibold text-xs">Platform Surface</p>
                          <p className={`text-[10px] mt-0.5 ${newLinkScope === "PLATFORM" ? "text-zinc-300" : "text-zinc-400"}`}>
                            Homepage, Explore, Communities, or Custom Public URL
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewLinkScope("EVENT")}
                          className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                            newLinkScope === "EVENT"
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <p className="font-semibold text-xs">Specific Event</p>
                          <p className={`text-[10px] mt-0.5 ${newLinkScope === "EVENT" ? "text-zinc-300" : "text-zinc-400"}`}>
                            Directly to a registered event drop &amp; ticket checkout
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Destination Input */}
                    {newLinkScope === "PLATFORM" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Platform Public Surface</label>
                        <select
                          value={newLinkDest}
                          onChange={(e) => setNewLinkDest(e.target.value)}
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                        >
                          <option value="/">Platform Homepage (/)</option>
                          <option value="/home">Explore &amp; Discover Events (/home)</option>
                          <option value="/channels">Communities &amp; Channels (/channels)</option>
                          <option value="/pricing">Pricing &amp; Plans (/pricing)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Select Event</label>
                        <select
                          value={newLinkEventId}
                          onChange={(e) => setNewLinkEventId(e.target.value)}
                          className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                          required
                        >
                          <option value="">Choose an event...</option>
                          {state.allEvents.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title} ({ev.slug || ev.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Custom Vanity Slug */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Custom Vanity Slug (Optional)</label>
                      <div className="flex items-center rounded-lg border border-zinc-200 bg-white overflow-hidden text-xs">
                        <span className="px-3 py-2 bg-zinc-50 border-r border-zinc-200 text-zinc-500 font-mono">
                          hackways.com/l/
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. spring-pass, ai-summit, early-bird"
                          value={newLinkSlug}
                          onChange={(e) =>
                            setNewLinkSlug(
                              e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                            )
                          }
                          className="flex-1 px-3 py-2 text-xs focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* UTM Tags */}
                    <div className="pt-2 border-t border-zinc-150 space-y-3">
                      <p className="text-xs font-bold text-zinc-900">Campaign UTM Tracking Tags</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-600">utm_source</label>
                          <input
                            type="text"
                            placeholder="e.g. twitter, linkedin, newsletter"
                            value={newLinkUtmSource}
                            onChange={(e) => setNewLinkUtmSource(e.target.value)}
                            className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-900 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-600">utm_medium</label>
                          <input
                            type="text"
                            placeholder="e.g. social, cpc, email, qr"
                            value={newLinkUtmMedium}
                            onChange={(e) => setNewLinkUtmMedium(e.target.value)}
                            className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-900 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-600">utm_campaign</label>
                          <input
                            type="text"
                            placeholder="e.g. launch_drop_2026"
                            value={newLinkUtmCampaign}
                            onChange={(e) => setNewLinkUtmCampaign(e.target.value)}
                            className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-xs"
                      >
                        Generate &amp; Save Short Link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubTabChange("all-links")}
                        className="px-4 py-2.5 rounded-full text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* VIEW 3: Traffic & Mass Analytics */}
              {activeSubTab === "traffic" && (
                <div className="space-y-6">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                      <p className="text-xs font-semibold text-zinc-500">Tracked Page Views</p>
                      <p className="text-2xl font-black text-zinc-950 tabular-nums">
                        {(telemetryStats?.total_events || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-400">Captured across public pages</p>
                    </div>
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                      <p className="text-xs font-semibold text-zinc-500">Desktop Share</p>
                      <p className="text-2xl font-black text-zinc-950 tabular-nums">
                        {telemetryStats?.device_breakdown?.Desktop || 0}
                      </p>
                      <p className="text-[10px] text-zinc-400">Desktop devices</p>
                    </div>
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                      <p className="text-xs font-semibold text-zinc-500">Mobile Share</p>
                      <p className="text-2xl font-black text-zinc-950 tabular-nums">
                        {telemetryStats?.device_breakdown?.Mobile || 0}
                      </p>
                      <p className="text-[10px] text-zinc-400">Mobile phones</p>
                    </div>
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-1">
                      <p className="text-xs font-semibold text-zinc-500">Tablet Share</p>
                      <p className="text-2xl font-black text-zinc-950 tabular-nums">
                        {telemetryStats?.device_breakdown?.Tablet || 0}
                      </p>
                      <p className="text-[10px] text-zinc-400">Tablets &amp; iPads</p>
                    </div>
                  </div>

                  {/* Device & Browser Breakdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-zinc-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Top Browsers</h4>
                      {telemetryStats?.browser_breakdown ? (
                        <div className="space-y-2">
                          {Object.entries(telemetryStats.browser_breakdown).map(([browser, count]: any) => (
                            <div key={browser} className="flex items-center justify-between text-xs">
                              <span className="font-medium text-zinc-700">{browser}</span>
                              <span className="font-bold text-zinc-950 tabular-nums">{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">No browser data recorded yet.</p>
                      )}
                    </div>

                    <div className="border border-zinc-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
                      <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">Top Operating Systems</h4>
                      {telemetryStats?.os_breakdown ? (
                        <div className="space-y-2">
                          {Object.entries(telemetryStats.os_breakdown).map(([os, count]: any) => (
                            <div key={os} className="flex items-center justify-between text-xs">
                              <span className="font-medium text-zinc-700">{os}</span>
                              <span className="font-bold text-zinc-950 tabular-nums">{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">No OS data recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Live Stream Table */}
                  <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs bg-white">
                    <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                      <h4 className="font-bold text-zinc-950 font-heading">Recent Visitor Events (Internal Mass Analytics)</h4>
                      <span className="text-[10px] text-zinc-400 font-mono">Console routes excluded</span>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50/50 border-b border-zinc-150 text-zinc-500 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Visited Path</th>
                          <th className="py-2.5 px-4">Device</th>
                          <th className="py-2.5 px-4">Browser &amp; OS</th>
                          <th className="py-2.5 px-4">Resolution</th>
                          <th className="py-2.5 px-4">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                        {(telemetryStats?.recent_events || []).length > 0 ? (
                          (telemetryStats.recent_events || []).slice(0, 15).map((ev: any) => (
                            <tr key={ev.id} className="hover:bg-zinc-50/70 transition">
                              <td className="py-2.5 px-4 font-semibold text-zinc-900">{ev.pathname}</td>
                              <td className="py-2.5 px-4 text-zinc-600">{ev.device}</td>
                              <td className="py-2.5 px-4 text-zinc-600">{ev.browser} on {ev.os}</td>
                              <td className="py-2.5 px-4 text-zinc-400">{ev.screen_resolution || "—"}</td>
                              <td className="py-2.5 px-4 text-zinc-400">
                                {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans text-xs">
                              No public visitor telemetry recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 7: COMMUNICATIONS */}
          {/* ========================================== */}
          {activeModule === "communications" && (
            <div className="space-y-5">
              {/* Channel selector row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "email", label: "Email", icon: <Mail size={15} /> },
                  { id: "whatsapp", label: "WhatsApp", icon: <Smartphone size={15} /> },
                  { id: "push", label: "Push", icon: <Radio size={15} /> },
                ].map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      handleSubTabChange(ch.id);
                      setComposing(true);
                      setBroadcastSent(false);
                    }}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer space-y-2 ${
                      activeSubTab === ch.id && composing
                        ? "border-zinc-900 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    <div className={`flex items-center justify-between`}>
                      <div className={`flex items-center gap-2 ${
                        activeSubTab === ch.id && composing ? "text-white" : "text-zinc-600"
                      }`}>
                        {ch.icon}
                        <span className="text-xs font-semibold">{ch.label}</span>
                      </div>
                      {activeSubTab === ch.id && composing && (
                        <Check size={13} className="text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Compose panel — shown when a channel is selected */}
              {composing && (
                <div className="border border-zinc-200 rounded-xl p-5 space-y-4 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-zinc-950 font-heading">
                      New {activeSubTab === "email" ? "Email" : activeSubTab === "whatsapp" ? "WhatsApp" : "Push"} Broadcast
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setComposing(false); setBroadcastSent(false); setBroadcastSubject(""); setBroadcastBody(""); }}
                      className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {broadcastSent ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-emerald-600">
                      <Check size={22} />
                      <p className="font-semibold text-sm">Broadcast sent successfully</p>
                      <p className="text-zinc-400 text-[11px]">It will appear in your history once delivered.</p>
                      <button
                        type="button"
                        onClick={() => { setBroadcastSent(false); setBroadcastSubject(""); setBroadcastBody(""); }}
                        className="mt-2 px-4 py-1.5 rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                      >
                        New broadcast
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1.5">To</label>
                          <select
                            value={broadcastAudience}
                            onChange={e => setBroadcastAudience(e.target.value)}
                            className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                          >
                            <option value="all-attendees">All registered attendees ({state.attendees.length})</option>
                            {state.primaryEvent?.tiers?.map((t) => (
                              <option key={t.id} value={`tier_${t.id}`}>
                                {t.name} pass holders ({state.attendees.filter(a => a.tierId === t.id || a.tierName === t.name).length})
                              </option>
                            ))}
                          </select>
                        </div>

                        {activeSubTab === "email" && (
                          <div>
                            <label className="font-semibold text-zinc-700 block mb-1.5">Subject</label>
                            <input
                              type="text"
                              placeholder="e.g. Important update about your registration"
                              value={broadcastSubject}
                              onChange={e => setBroadcastSubject(e.target.value)}
                              className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900"
                            />
                          </div>
                        )}

                        <div>
                          <label className="font-semibold text-zinc-700 block mb-1.5">
                            {activeSubTab === "push" ? "Notification text" : "Message"}
                          </label>
                          <textarea
                            rows={activeSubTab === "push" ? 2 : 5}
                            placeholder={
                              activeSubTab === "email" ? "Write your email body here..."
                              : activeSubTab === "whatsapp" ? "Type your WhatsApp message..."
                              : "Short push notification text (max 120 chars)"
                            }
                            value={broadcastBody}
                            onChange={e => setBroadcastBody(e.target.value)}
                            maxLength={activeSubTab === "push" ? 120 : undefined}
                            className="w-full border border-zinc-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-zinc-900 resize-none"
                          />
                          {activeSubTab === "push" && (
                            <p className="text-[11px] text-zinc-400 mt-1 text-right">{broadcastBody.length}/120</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!broadcastBody.trim()) { notify("Write a message before sending"); return; }
                            setBroadcastSent(true);
                          }}
                          className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Send size={12} />
                          Send now
                        </button>
                        <button
                          type="button"
                          onClick={() => notify("Saved as draft")}
                          className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                        >
                          Save draft
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Broadcast history — empty state */}
              {!composing && (
                <div className="border border-zinc-200 rounded-xl p-8 flex flex-col items-center gap-3 text-center text-xs shadow-2xs">
                  <Send size={22} className="text-zinc-300" />
                  <p className="font-semibold text-zinc-500">No broadcasts sent yet</p>
                  <p className="text-zinc-400">Select a channel above to compose your first message.</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 8: CONVERSION */}
          {/* ========================================== */}
          {activeModule === "conversion" && (
            <div className="space-y-6">
              <div className="border border-zinc-200 rounded-xl p-6 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Conversion Drop-off Breakdown</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { handleModuleChange("promotions"); notify("Add a promo code to recover drop-offs"); }}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Tag size={12} />
                      Add Promo to Recover
                    </button>
                    <button
                      onClick={() => { handleModuleChange("campaigns"); notify("Create a retargeting campaign for cart abandoners"); }}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <TrendingUp size={12} />
                      Retarget Drop-offs
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                    <p className="text-zinc-500 font-medium">Tickets Issued</p>
                    <p className="text-xl font-bold text-zinc-950 font-heading tabular-nums">{state.totalTickets > 0 ? state.totalTickets : "—"}</p>
                    <span className="text-[11px] text-zinc-400">Confirmed orders</span>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                    <p className="text-zinc-500 font-medium">Checked In</p>
                    <p className="text-xl font-bold text-zinc-950 font-heading tabular-nums">{state.attendees.filter(a => a.status === "CHECKED_IN").length > 0 ? state.attendees.filter(a => a.status === "CHECKED_IN").length : "—"}</p>
                    <span className="text-[11px] text-zinc-400">Gate admissions</span>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg space-y-1 border border-emerald-100">
                    <p className="text-zinc-500 font-medium">Revenue</p>
                    <p className="text-xl font-bold text-emerald-700 font-heading tabular-nums">{state.totalRevenue > 0 ? `₹${state.totalRevenue.toLocaleString()}` : "—"}</p>
                    <span className="text-[11px] text-zinc-400">Gross ticket sales</span>
                  </div>
                </div>
              </div>

              {/* Sub-tab: Drop-off Analysis */}
              {activeSubTab === "dropoff" && (
                <div className="border border-zinc-200 rounded-xl p-5 space-y-3 text-xs shadow-2xs">
                  <h4 className="font-bold text-zinc-950">Drop-off Analysis</h4>
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-300">
                    <TrendingUp size={28} strokeWidth={1.2} />
                    <p className="text-xs text-zinc-400">No drop-off data — connect analytics to track funnel exits</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 9: AUTOMATION */}
          {/* ========================================== */}
          {activeModule === "automation" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-950 font-heading">Marketing Automation Workflows</h3>
              <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Workflow Name</th>
                      <th className="py-3 px-4">Trigger</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Executions</th>
                      <th className="py-3 px-4">Delivered Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {state.automations.length > 0 ? (
                      state.automations.map((a) => (
                        <tr key={a.id} className="hover:bg-zinc-50/70 transition">
                          <td className="py-3 px-4 font-semibold text-zinc-950">{a.title}</td>
                          <td className="py-3 px-4 text-zinc-500">{a.trigger}</td>
                          <td className="py-3 px-4 text-zinc-500">{a.channel}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-zinc-950">{a.executions}</td>
                          <td className="py-3 px-4 text-emerald-600 font-semibold">{a.deliveredRate}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              {a.status.toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-400">
                          <Sparkles size={22} className="mx-auto mb-2 text-zinc-300" />
                          <p className="font-semibold text-zinc-500 text-xs">No active automation workflows</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Automations like post-registration emails and event day reminders will appear here once configured.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 10: A/B TESTING */}
          {/* ========================================== */}
          {activeModule === "ab-testing" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-950 font-heading">Active Experiments & Split Tests</h3>
              {state.abTests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {state.abTests.map((t) => (
                    <div key={t.id} className="border border-zinc-200 rounded-xl p-5 space-y-4 text-xs shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-950 font-heading">{t.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {t.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px]">Area: {t.area}</p>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                          <span className="text-[10px] uppercase font-bold text-zinc-400">Variant A</span>
                          <p className="font-medium text-zinc-800 truncate">{t.variantA}</p>
                          <p className="text-lg font-bold text-zinc-950 tabular-nums">{t.conversionA}</p>
                        </div>

                        <div className="p-3 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                          <span className="text-[10px] uppercase font-bold text-emerald-600">Variant B (Leader)</span>
                          <p className="font-medium text-zinc-800 truncate">{t.variantB}</p>
                          <p className="text-lg font-bold text-emerald-600 tabular-nums">{t.conversionB}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-xl p-10 flex flex-col items-center justify-center text-center text-zinc-400 gap-2 shadow-2xs">
                  <TrendingUp size={24} className="text-zinc-300" />
                  <p className="font-semibold text-zinc-600 text-xs">No active experiments</p>
                  <p className="text-[11px] text-zinc-400 max-w-sm">Split tests on CTAs, ticket pricing, and event page hero designs will be tracked here.</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 11: ATTRIBUTION */}
          {/* ========================================== */}
          {activeModule === "attribution" && (
            <div className="space-y-6">
              <div className="border border-zinc-200 rounded-xl p-6 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Multi-Touch Revenue Attribution</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSubTabChange(activeSubTab === "multi-touch" ? "overview" : "multi-touch")}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-2xs"
                    >
                      Switch Model
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download size={12} />
                      Export Attribution
                    </button>
                  </div>
                </div>
                <div className="space-y-4 text-xs">
                  {state.totalTickets > 0 ? (
                    <ProgressMeter value={100} max={100} label="Direct (all tracked orders)" sublabel={`${state.totalTickets} ticket${state.totalTickets !== 1 ? 's' : ''} sold`} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-300">
                      <BarChart2 size={28} strokeWidth={1.2} />
                      <p className="text-xs text-zinc-400">No attribution data — sales will be tracked here once tickets are sold</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 12: ROI & SPEND */}
          {/* ========================================== */}
          {activeModule === "roi" && (
            <div className="space-y-6">
              <div className="border border-zinc-200 rounded-xl p-6 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-950 font-heading">Marketing Efficiency &amp; ROAS</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSubTabChange(activeSubTab === "campaign-roi" ? "overall-roi" : "campaign-roi")}
                      className="text-xs font-medium px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-2xs"
                    >
                      {activeSubTab === "campaign-roi" ? "View Overall ROI" : "By Campaign"}
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download size={12} />
                      Export ROI Report
                    </button>
                  </div>
                </div>
                {(() => {
                  const totalSpend = state.campaigns.reduce((s, c) => s + c.spend, 0);
                  const roas = totalSpend > 0 ? (state.totalRevenue / totalSpend).toFixed(1) : null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                      <div className="p-4 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                        <p className="text-zinc-500 font-medium">Marketing Spend</p>
                        <p className="text-xl font-bold text-zinc-950 font-heading tabular-nums">{totalSpend > 0 ? `₹${totalSpend.toLocaleString()}` : "—"}</p>
                        <span className="text-[11px] text-zinc-400">Across all campaigns</span>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                        <p className="text-zinc-500 font-medium">Revenue</p>
                        <p className="text-xl font-bold text-zinc-950 font-heading tabular-nums">{state.totalRevenue > 0 ? `₹${state.totalRevenue.toLocaleString()}` : "—"}</p>
                        <span className="text-[11px] text-zinc-400">Gross ticket sales</span>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-lg space-y-1 border border-zinc-100">
                        <p className="text-zinc-500 font-medium">ROAS</p>
                        <p className="text-xl font-bold text-zinc-950 font-heading tabular-nums">{roas ? `${roas}x` : "—"}</p>
                        <span className="text-[11px] text-zinc-400">{roas ? "Return on ad spend" : "Add campaigns with spend to calculate"}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Per-campaign breakdown when on campaign-roi sub-tab */}
                {activeSubTab === "campaign-roi" && (
                  <div className="border border-zinc-100 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Campaign</th>
                          <th className="py-2.5 px-4">Spend</th>
                          <th className="py-2.5 px-4">Revenue</th>
                          <th className="py-2.5 px-4">ROAS</th>
                          <th className="py-2.5 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {state.campaigns.length > 0 ? (
                          state.campaigns.map((c) => (
                            <tr key={c.id} className="hover:bg-zinc-50/70 transition">
                              <td className="py-2.5 px-4 font-semibold text-zinc-950">{c.name}</td>
                              <td className="py-2.5 px-4 tabular-nums">₹{c.spend.toLocaleString()}</td>
                              <td className="py-2.5 px-4 tabular-nums font-bold text-zinc-950">₹{c.revenue.toLocaleString()}</td>
                              <td className="py-2.5 px-4 font-semibold text-emerald-600">{c.roas}</td>
                              <td className="py-2.5 px-4">
                                <button
                                  onClick={() => { handleModuleChange("campaigns"); notify(`Viewing ${c.name}`); }}
                                  className="px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                                >
                                  View Campaign
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-400">
                              <p className="font-medium text-zinc-500">No campaigns launched yet</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">Campaign-specific spend and revenue will display here once launched.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MODULE 13: REPORTS */}
          {/* ========================================== */}
          {activeModule === "reports" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-950 font-heading">Generated Marketing Reports</h3>
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download Master CSV</span>
                </button>
              </div>

              <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 text-xs shadow-2xs">
                <div className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition">
                  <div>
                    <p className="font-semibold text-zinc-950">Campaigns Performance Breakdown</p>
                    <p className="text-zinc-400 text-[11px]">Includes reach, clicks, registrations, spend, and ROAS</p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1 rounded-full border border-zinc-200 hover:bg-white text-zinc-700 transition cursor-pointer"
                  >
                    Export
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition">
                  <div>
                    <p className="font-semibold text-zinc-950">Acquisition & Channel Attribution Report</p>
                    <p className="text-zinc-400 text-[11px]">Breakdown of direct, organic search, WhatsApp and social referrals</p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1 rounded-full border border-zinc-200 hover:bg-white text-zinc-700 transition cursor-pointer"
                  >
                    Export
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition">
                  <div>
                    <p className="font-semibold text-zinc-950">Discount Code & Referral Ledger</p>
                    <p className="text-zinc-400 text-[11px]">Usage frequency, discount value given, and gross order values</p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1 rounded-full border border-zinc-200 hover:bg-white text-zinc-700 transition cursor-pointer"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PROMO CODE CREATION MODAL */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-zinc-200 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-950 font-heading">Create Promo Code</h3>
              <button
                onClick={() => setShowPromoModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-full hover:bg-zinc-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                  Code String
                </label>
                <input
                  type="text"
                  placeholder="e.g. EARLY20"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  required
                  className="w-full border border-zinc-200 rounded-full px-4 py-2 font-mono uppercase focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={newPromoType}
                    onChange={(e) => setNewPromoType(e.target.value as any)}
                    className="w-full border border-zinc-200 rounded-full px-3.5 py-2 bg-white focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    placeholder="15"
                    value={newPromoValue}
                    onChange={(e) => setNewPromoValue(e.target.value)}
                    required
                    className="w-full border border-zinc-200 rounded-full px-4 py-2 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 uppercase tracking-wider block mb-1.5">
                  Maximum Redemptions
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={newPromoMaxUses}
                  onChange={(e) => setNewPromoMaxUses(e.target.value)}
                  className="w-full border border-zinc-200 rounded-full px-4 py-2 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
                >
                  Create Code
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
