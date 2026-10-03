import { getStoredEvents, getAllAttendees, getAllOrders } from "@/lib/api";
import { EventItem } from "@/lib/types";

export type MarketingModule =
  | "overview"
  | "campaigns"
  | "builder"
  | "acquisition"
  | "audience"
  | "promotions"
  | "custom-urls"
  | "communications"
  | "conversion"
  | "automation"
  | "ab-testing"
  | "attribution"
  | "roi"
  | "reports";

export interface MarketingSubTab {
  id: string;
  label: string;
}

export interface MarketingNavSection {
  id: MarketingModule;
  label: string;
  subTabs: MarketingSubTab[];
}

export const MARKETING_NAV_SECTIONS: MarketingNavSection[] = [
  {
    id: "overview",
    label: "Overview",
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
    subTabs: [
      { id: "details", label: "Campaign Details" },
      { id: "audience", label: "Audience Target" },
      { id: "channel", label: "Channel Delivery" },
      { id: "content", label: "Creative & Banners" },
      { id: "schedule", label: "Schedule & Launch" },
    ],
  },
  {
    id: "acquisition",
    label: "Acquisition",
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
    label: "Audience",
    subTabs: [
      { id: "all-audiences", label: "Audiences" },
      { id: "segments", label: "Segments" },
      { id: "retargeting", label: "Retargeting" },
    ],
  },
  {
    id: "promotions",
    label: "Promotions",
    subTabs: [
      { id: "promo-codes", label: "Promo Codes" },
      { id: "coupons", label: "Coupons" },
      { id: "discounts", label: "Discounts" },
    ],
  },
  {
    id: "custom-urls",
    label: "URL & Custom Marketing",
    subTabs: [
      { id: "all-links", label: "All Tracking URLs" },
      { id: "create", label: "Create Custom Link" },
      { id: "traffic", label: "Traffic Analytics" },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    subTabs: [
      { id: "email", label: "Email" },
      { id: "push", label: "Push" },
      { id: "whatsapp", label: "WhatsApp" },
    ],
  },
  {
    id: "conversion",
    label: "Conversion",
    subTabs: [
      { id: "funnel", label: "Funnel" },
      { id: "channels", label: "By Channel" },
      { id: "dropoff", label: "Drop-off Analysis" },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    subTabs: [
      { id: "automations", label: "Workflows" },
      { id: "triggers", label: "Triggers" },
      { id: "activity", label: "Activity Stream" },
    ],
  },
  {
    id: "ab-testing",
    label: "A/B Testing",
    subTabs: [
      { id: "experiments", label: "Experiments" },
      { id: "active", label: "Active Tests" },
      { id: "results", label: "Results & Winners" },
    ],
  },
  {
    id: "attribution",
    label: "Attribution",
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
    subTabs: [
      { id: "overall-roi", label: "Overall ROI" },
      { id: "campaign-roi", label: "Campaign ROI" },
      { id: "channel-roi", label: "Channel ROI" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    subTabs: [
      { id: "campaign-reports", label: "Campaigns" },
      { id: "acquisition-reports", label: "Acquisition" },
      { id: "revenue-reports", label: "Revenue" },
      { id: "export", label: "Exported Reports" },
    ],
  },
];

export interface MarketingCampaign {
  id: string;
  name: string;
  type: "Event Promotion" | "Ticket Sale" | "Early Bird" | "Last-Minute" | "Event Reminder" | "Retargeting" | "Referral" | "Re-engagement" | "Announcement";
  status: "ACTIVE" | "SCHEDULED" | "DRAFT" | "COMPLETED" | "PAUSED";
  audience: string;
  channel: "Email" | "Social" | "Push" | "WhatsApp" | "Multi-channel";
  eventId: string;
  eventName: string;
  banner_url?: string;
  square_banner_url?: string;
  startDate: string;
  endDate: string;
  reach: number;
  impressions: number;
  clicks: number;
  registrations: number;
  ticketsSold: number;
  revenue: number;
  spend: number;
  conversionRate: string;
  roas: string;
}

export interface TrafficSourceItem {
  source: string;
  category: "social" | "search" | "direct" | "referral" | "paid" | "email" | "partners" | "qr";
  visitors: number;
  sessions: number;
  clicks: number;
  registrations: number;
  ticketsSold: number;
  revenue: number;
  conversionRate: string;
}

export interface PromoCodeItem {
  code: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  usageCount: number;
  maxUses: number;
  eventName: string;
  status: "ACTIVE" | "EXPIRED";
  revenueGenerated: number;
  discountGiven: number;
}

export interface ReferralItem {
  id: string;
  referrerName: string;
  code: string;
  clicks: number;
  registrations: number;
  ticketsSold: number;
  revenue: number;
  rewardValue: string;
}

export interface AffiliateItem {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING";
  code: string;
  clicks: number;
  ticketsSold: number;
  revenue: number;
  commission: number;
}

export interface AudienceSegmentItem {
  id: string;
  name: string;
  type: "Dynamic" | "Static" | "Custom";
  criteria: string;
  count: number;
  avgLtv: number;
}

export interface AutomationWorkflowItem {
  id: string;
  title: string;
  trigger: string;
  channel: "Email" | "Push" | "WhatsApp" | "SMS";
  status: "ACTIVE" | "SCHEDULED" | "PAUSED";
  executions: number;
  deliveredRate: string;
}

export interface AbTestItem {
  id: string;
  name: string;
  area: "Event Page CTA" | "Checkout Step" | "Email Subject" | "Pricing Display";
  status: "RUNNING" | "COMPLETED";
  variantA: string;
  variantB: string;
  conversionA: string;
  conversionB: string;
  winner?: "A" | "B";
}

export interface MarketingKpiItem {
  label: string;
  value: string | number;
  subtext?: string;
  delta?: string;
  isPositive?: boolean;
  prefix?: string;
  suffix?: string;
}

const LOCAL_CAMPAIGNS_KEY = "hackways_marketing_campaigns_v3";
const LOCAL_PROMOS_KEY = "hackways_marketing_promos_v3";

export function getStoredCampaigns(): MarketingCampaign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCampaign(campaign: MarketingCampaign) {
  if (typeof window === "undefined") return;
  try {
    const list = getStoredCampaigns();
    const idx = list.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) list[idx] = campaign;
    else list.unshift(campaign);
    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save campaign", err);
  }
}

export function getStoredPromos(): PromoCodeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_PROMOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredPromo(promo: PromoCodeItem) {
  if (typeof window === "undefined") return;
  try {
    const list = getStoredPromos();
    const idx = list.findIndex((p) => p.code === promo.code);
    if (idx >= 0) list[idx] = promo;
    else list.unshift(promo);
    localStorage.setItem(LOCAL_PROMOS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save promo", err);
  }
}

export interface MarketingFilterState {
  eventId: string;
  organizer: string;
  community: string;
  dateRange: "7d" | "30d" | "90d" | "all";
  searchQuery: string;
  channel: string;
}

/**
 * Aggregates real platform data and marketing telemetry
 */
export function getMarketingState(filters?: Partial<MarketingFilterState>) {
  const allEvents = getStoredEvents(true);
  const rawOrders = getAllOrders();
  const rawAttendees = getAllAttendees();

  // Filter by event if selected
  const activeEventId = filters?.eventId && filters.eventId !== "all" ? filters.eventId : null;
  const filteredEvents = activeEventId
    ? allEvents.filter((e) => e.id === activeEventId)
    : allEvents;

  // Filter orders & attendees corresponding to the filtered events
  const allowedEventIds = new Set(filteredEvents.map((e) => e.id));
  const orders = activeEventId
    ? rawOrders.filter((o) => allowedEventIds.has(o.eventId))
    : rawOrders;
  const attendees = activeEventId
    ? rawAttendees.filter((a) => allowedEventIds.has(a.eventId))
    : rawAttendees;

  // Collect unique organizers and communities
  const organizers = Array.from(new Set(allEvents.map((e) => e.organizer_id || ""))).filter(Boolean);
  const communities = Array.from(new Set(allEvents.map((e) => e.channel_name || ""))).filter(Boolean);

  // Core metrics derived from real platform store
  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalOrders = orders.length;
  const totalTickets = attendees.length || orders.length;

  // Real primary event reference — falls back to clean empty fields if no event exists
  const primaryEvent = (activeEventId ? allEvents.find((e) => e.id === activeEventId) : null) || allEvents[0] || {
    id: "",
    title: "",
    city: "",
    banner_url: "",
    square_banner_url: "",
  };

  // Stored campaigns — only what the user has actually created
  const campaigns = getStoredCampaigns();

  // Traffic sources — empty until real analytics integration
  const trafficSources: TrafficSourceItem[] = [];

  // Promo codes — only what the organiser has created
  const promoCodes = getStoredPromos();

  // Referrals — empty until real referral system data is available
  const referrals: ReferralItem[] = [];

  // Affiliates — empty until real affiliate partners are added
  const affiliates: AffiliateItem[] = [];

  // Audience segments derived from real attendee data only
  const audienceSegments: AudienceSegmentItem[] = [];
  if (attendees.length > 0) {
    audienceSegments.push({
      id: "seg_01",
      name: "All Attendees",
      type: "Dynamic",
      criteria: "Registered attendees",
      count: attendees.length,
      avgLtv: totalTickets > 0 ? Math.round(totalRevenue / totalTickets) : 0,
    });
  }

  // Automations — empty until real automation workflows are created
  const automations: AutomationWorkflowItem[] = [];

  // A/B Tests — empty until real experiments are running
  const abTests: AbTestItem[] = [];

  return {
    allEvents,
    events: filteredEvents,
    organizers,
    communities,
    orders,
    attendees,
    primaryEvent,
    totalRevenue,
    totalOrders,
    totalTickets,
    campaigns,
    trafficSources,
    promoCodes,
    referrals,
    affiliates,
    audienceSegments,
    automations,
    abTests,
  };
}

export function getMarketingKpis(module: MarketingModule, subTab: string, state: ReturnType<typeof getMarketingState>): MarketingKpiItem[] {
  const { totalRevenue, totalOrders, totalTickets, campaigns, attendees } = state;
  const activeCampaignsCount = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);

  switch (module) {
    case "campaigns":
    case "builder":
      return [
        { label: "Active", value: activeCampaignsCount },
        { label: "Reach", value: totalReach > 0 ? totalReach.toLocaleString() : "—" },
        { label: "Revenue", value: totalRevenue, prefix: "₹" },
        { label: "Spend", value: totalSpend > 0 ? totalSpend : "—", prefix: totalSpend > 0 ? "₹" : undefined },
      ];

    case "acquisition":
      return [
        { label: "Visitors", value: "—" },
        { label: "Sources", value: "—" },
        { label: "Tickets", value: totalTickets },
        { label: "Conversion", value: "—" },
      ];

    case "audience":
      return [
        { label: "Attendees", value: attendees.length },
        { label: "Segments", value: state.audienceSegments.length },
        { label: "Tickets sold", value: totalTickets },
        { label: "Avg spend", value: totalTickets > 0 ? Math.round(totalRevenue / totalTickets) : "—", prefix: totalTickets > 0 ? "₹" : undefined },
      ];

    case "promotions":
      return [
        { label: "Promo codes", value: state.promoCodes.length },
        { label: "Redemptions", value: state.promoCodes.reduce((s, p) => s + p.usageCount, 0) },
        { label: "Revenue", value: totalRevenue, prefix: "₹" },
        { label: "Discounts given", value: state.promoCodes.reduce((s, p) => s + p.discountGiven, 0) > 0 ? state.promoCodes.reduce((s, p) => s + p.discountGiven, 0) : "—", prefix: state.promoCodes.reduce((s, p) => s + p.discountGiven, 0) > 0 ? "₹" : undefined },
      ];

    case "communications":
      return [
        { label: "Channels", value: "Unavailable" },
        { label: "Delivery", value: "—" },
        { label: "Sent", value: "—" },
        { label: "Open rate", value: "—" },
      ];

    case "conversion":
      return [
        { label: "Register rate", value: "—" },
        { label: "Checkout rate", value: "—" },
        { label: "Overall", value: "—" },
        { label: "Drop-off", value: "—" },
      ];

    case "automation":
      return [
        { label: "Workflows", value: state.automations.length },
        { label: "Executions", value: state.automations.reduce((s, a) => s + a.executions, 0) },
        { label: "Orders", value: totalOrders },
        { label: "Health", value: state.automations.length > 0 ? "Active" : "—" },
      ];

    case "ab-testing":
      return [
        { label: "Experiments", value: state.abTests.length },
        { label: "Running", value: state.abTests.filter(t => t.status === "RUNNING").length },
        { label: "Completed", value: state.abTests.filter(t => t.status === "COMPLETED").length },
        { label: "Winners", value: state.abTests.filter(t => t.winner).length },
      ];

    case "attribution":
      return [
        { label: "Top source", value: "Unavailable" },
        { label: "First-touch", value: "—" },
        { label: "Last-touch", value: "—" },
        { label: "Revenue", value: totalRevenue, prefix: "₹" },
      ];

    case "roi":
      return [
        { label: "Revenue", value: totalRevenue, prefix: "₹" },
        { label: "Spend", value: totalSpend > 0 ? totalSpend : "—", prefix: totalSpend > 0 ? "₹" : undefined },
        { label: "CPA", value: totalTickets > 0 && totalSpend > 0 ? Math.round(totalSpend / totalTickets) : "—", prefix: totalTickets > 0 && totalSpend > 0 ? "₹" : undefined },
        { label: "ROAS", value: totalSpend > 0 ? `${(totalRevenue / totalSpend).toFixed(1)}x` : "—" },
      ];

    case "reports":
      return [
        { label: "Campaigns", value: campaigns.length },
        { label: "Promo codes", value: state.promoCodes.length },
        { label: "Revenue", value: totalRevenue, prefix: "₹" },
        { label: "Tickets", value: totalTickets },
      ];

    case "overview":
    default:
      return [
        { label: "Reach", value: totalReach > 0 ? totalReach.toLocaleString() : "—" },
        { label: "Tickets", value: totalTickets },
        { label: "Revenue", value: totalRevenue, prefix: "₹" },
        { label: "ROAS", value: totalSpend > 0 ? `${(totalRevenue / totalSpend).toFixed(1)}x` : "—" },
      ];
  }
}
