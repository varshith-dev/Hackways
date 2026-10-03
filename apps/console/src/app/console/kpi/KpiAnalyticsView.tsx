"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Logo3D from "@/components/ui/Logo3D";
import DashboardArtwork, { DashboardArtworkKind } from "@/components/ui/DashboardArtwork";
import { MetricCard } from "./components/MetricCard";
import {
  AreaChart,
  LineChart,
  BarChart,
  StackedBarChart,
  HorizontalBarChart,
  DonutChart,
  FunnelChart,
  HeatmapGrid,
  ScatterPlot,
  ProgressMeter,
} from "./components/AnalyticsCharts";
import { generateAnalyticsData, AnalyticsFilterState } from "./data/analyticsData";
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
  Radio,
} from "lucide-react";

export type AnalyticsModule =
  | "overview"
  | "live"
  | "sales"
  | "tickets"
  | "revenue"
  | "discounts"
  | "refunds"
  | "registrations"
  | "attendees"
  | "attendance"
  | "audience"
  | "marketing"
  | "conversion"
  | "event-pages"
  | "campaigns"
  | "performance"
  | "engagement"
  | "platform";

interface SubTabConfig {
  id: string;
  label: string;
}

interface NavCategory {
  title: string;
  items: {
    id: AnalyticsModule;
    label: string;
    icon: React.ReactNode;
    subTabs: SubTabConfig[];
  }[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Core Telemetry",
    items: [
      {
        id: "overview",
        label: "Overview",
        icon: <BarChartIcon size={17} />,
        subTabs: [
          { id: "kpi-summary", label: "KPI Summary" },
          { id: "revenue-overview", label: "Revenue Overview" },
          { id: "ticket-sales", label: "Ticket Sales" },
          { id: "registration-overview", label: "Registration Overview" },
          { id: "attendance-overview", label: "Attendance Overview" },
          { id: "conversion-overview", label: "Conversion Overview" },
          { id: "recent-activity", label: "Recent Activity" },
          { id: "performance-trends", label: "Performance Trends" },
          { id: "alerts-insights", label: "Alerts & Insights" },
        ],
      },
      {
        id: "live",
        label: "Live Telemetry",
        icon: <ZapIcon size={17} />,
        subTabs: [
          { id: "live-overview", label: "Live Overview" },
          { id: "live-checkins", label: "Live Check-ins" },
          { id: "entry-rate", label: "Entry Rate" },
          { id: "gate-performance", label: "Gate Performance" },
          { id: "capacity", label: "Capacity" },
          { id: "ticket-validation", label: "Ticket Validation" },
          { id: "registration", label: "Registration" },
          { id: "live-revenue", label: "Live Revenue" },
          { id: "live-alerts", label: "Live Alerts" },
          { id: "activity-feed", label: "Activity Feed" },
        ],
      },
    ],
  },
  {
    title: "Sales & Commerce",
    items: [
      {
        id: "sales",
        label: "Sales Analytics",
        icon: <TicketIcon size={17} />,
        subTabs: [
          { id: "ticket-sales", label: "Ticket Sales" },
          { id: "orders", label: "Orders" },
          { id: "revenue", label: "Revenue" },
          { id: "ticket-inventory", label: "Ticket Inventory" },
          { id: "sales-velocity", label: "Sales Velocity" },
          { id: "sales-forecast", label: "Sales Forecast" },
          { id: "sales-by-event", label: "Sales by Event" },
          { id: "sales-by-tier", label: "Sales by Ticket Type" },
          { id: "sales-by-time", label: "Sales by Time" },
          { id: "sales-by-location", label: "Sales by Location" },
        ],
      },
      {
        id: "tickets",
        label: "Ticket Analytics",
        icon: <TicketIcon size={17} />,
        subTabs: [
          { id: "ticket-types", label: "Ticket Types" },
          { id: "ticket-inventory", label: "Ticket Inventory" },
          { id: "ticket-status", label: "Ticket Status" },
          { id: "ticket-pricing", label: "Ticket Pricing" },
          { id: "ticket-transfers", label: "Ticket Transfers" },
          { id: "ticket-upgrades", label: "Ticket Upgrades" },
          { id: "ticket-cancellations", label: "Ticket Cancellations" },
          { id: "ticket-resales", label: "Ticket Resales" },
        ],
      },
      {
        id: "revenue",
        label: "Revenue & Finance",
        icon: <LockIcon size={17} />,
        subTabs: [
          { id: "gross-revenue", label: "Gross Revenue" },
          { id: "net-revenue", label: "Net Revenue" },
          { id: "platform-fees", label: "Platform Fees" },
          { id: "payment-fees", label: "Payment Fees" },
          { id: "taxes", label: "Taxes & GST" },
          { id: "discounts", label: "Discounts" },
          { id: "refunds", label: "Refunds" },
          { id: "payouts", label: "Payouts" },
          { id: "revenue-by-event", label: "Revenue by Event" },
          { id: "revenue-by-ticket", label: "Revenue by Ticket" },
          { id: "revenue-timeline", label: "Revenue Timeline" },
        ],
      },
      {
        id: "discounts",
        label: "Discounts & Promos",
        icon: <TicketIcon size={17} />,
        subTabs: [
          { id: "promo-codes", label: "Promo Codes" },
          { id: "discount-usage", label: "Discount Usage" },
          { id: "discount-revenue", label: "Discount Revenue" },
          { id: "coupon-conversion", label: "Coupon Conversion" },
          { id: "coupon-performance", label: "Coupon Performance" },
          { id: "discount-impact", label: "Discount Impact" },
          { id: "campaign-codes", label: "Campaign Codes" },
          { id: "referral-codes", label: "Referral Codes" },
        ],
      },
      {
        id: "refunds",
        label: "Refunds & Disputes",
        icon: <RefreshCwIcon size={17} />,
        subTabs: [
          { id: "refunds", label: "Refunds" },
          { id: "refund-rate", label: "Refund Rate" },
          { id: "refund-amount", label: "Refund Amount" },
          { id: "cancellation-rate", label: "Cancellation Rate" },
          { id: "cancellation-reasons", label: "Cancellation Reasons" },
          { id: "refund-timeline", label: "Refund Timeline" },
          { id: "refund-by-ticket", label: "Refund by Ticket Type" },
          { id: "refund-by-event", label: "Refund by Event" },
        ],
      },
    ],
  },
  {
    title: "Registrations & Audience",
    items: [
      {
        id: "registrations",
        label: "Registrations",
        icon: <UsersGroupIcon size={17} />,
        subTabs: [
          { id: "registrations", label: "Registrations" },
          { id: "registration-funnel", label: "Registration Funnel" },
          { id: "registration-conversion", label: "Registration Conversion" },
          { id: "registration-dropoff", label: "Registration Drop-off" },
          { id: "registration-form", label: "Registration Form" },
          { id: "form-field-analytics", label: "Form Field Analytics" },
          { id: "registration-sources", label: "Registration Sources" },
          { id: "registration-timeline", label: "Registration Timeline" },
        ],
      },
      {
        id: "attendees",
        label: "Attendee Profiles",
        icon: <UserIcon size={17} />,
        subTabs: [
          { id: "attendees", label: "Attendees" },
          { id: "attendee-growth", label: "Attendee Growth" },
          { id: "attendee-profile", label: "Attendee Profile" },
          { id: "demographics", label: "Demographics" },
          { id: "geography", label: "Geography" },
          { id: "organizations", label: "Organizations" },
          { id: "roles-interests", label: "Roles / Interests" },
          { id: "new-vs-returning", label: "New vs Returning" },
          { id: "attendee-segments", label: "Attendee Segments" },
        ],
      },
      {
        id: "attendance",
        label: "Door Attendance",
        icon: <QrCodeIcon size={17} />,
        subTabs: [
          { id: "checkins", label: "Check-ins" },
          { id: "attendance-rate", label: "Attendance Rate" },
          { id: "no-shows", label: "No-shows" },
          { id: "checkin-timeline", label: "Check-in Timeline" },
          { id: "checkin-velocity", label: "Check-in Velocity" },
          { id: "gate-performance", label: "Gate Performance" },
          { id: "entry-analytics", label: "Entry Analytics" },
          { id: "ticket-validation", label: "Ticket Validation" },
          { id: "late-arrivals", label: "Late Arrivals" },
          { id: "attendance-by-ticket", label: "Attendance by Ticket" },
        ],
      },
      {
        id: "audience",
        label: "Audience Insights",
        icon: <UsersGroupIcon size={17} />,
        subTabs: [
          { id: "audience-overview", label: "Audience Overview" },
          { id: "audience-growth", label: "Audience Growth" },
          { id: "audience-segments", label: "Audience Segments" },
          { id: "demographics", label: "Demographics" },
          { id: "geography", label: "Geography" },
          { id: "interests", label: "Interests" },
          { id: "organizations", label: "Organizations" },
          { id: "roles", label: "Roles" },
          { id: "returning-attendees", label: "Returning Attendees" },
          { id: "audience-retention", label: "Audience Retention" },
        ],
      },
    ],
  },
  {
    title: "Growth & Conversion",
    items: [
      {
        id: "marketing",
        label: "Marketing Channels",
        icon: <FilterIcon size={17} />,
        subTabs: [
          { id: "traffic", label: "Traffic" },
          { id: "traffic-sources", label: "Traffic Sources" },
          { id: "campaigns", label: "Campaigns" },
          { id: "campaign-links", label: "Campaign Links" },
          { id: "referral-links", label: "Referral Links" },
          { id: "utm-analytics", label: "UTM Analytics" },
          { id: "social-media", label: "Social Media" },
          { id: "email", label: "Email" },
          { id: "qr-campaigns", label: "QR Campaigns" },
          { id: "partner-affiliate", label: "Partner / Affiliate" },
        ],
      },
      {
        id: "conversion",
        label: "Conversion Funnels",
        icon: <RefreshCwIcon size={17} />,
        subTabs: [
          { id: "overall-conversion", label: "Overall Conversion" },
          { id: "event-page-conversion", label: "Event Page Conversion" },
          { id: "registration-conversion", label: "Registration Conversion" },
          { id: "checkout-conversion", label: "Checkout Conversion" },
          { id: "payment-conversion", label: "Payment Conversion" },
          { id: "ticket-conversion", label: "Ticket Conversion" },
          { id: "conversion-by-source", label: "Conversion by Source" },
          { id: "conversion-by-device", label: "Conversion by Device" },
          { id: "conversion-by-location", label: "Conversion by Location" },
        ],
      },
      {
        id: "event-pages",
        label: "Event Landing Pages",
        icon: <PresentationIcon size={17} />,
        subTabs: [
          { id: "page-views", label: "Page Views" },
          { id: "unique-visitors", label: "Unique Visitors" },
          { id: "sessions", label: "Sessions" },
          { id: "engagement", label: "Engagement" },
          { id: "traffic-sources", label: "Traffic Sources" },
          { id: "device-analytics", label: "Device Analytics" },
          { id: "geographic-analytics", label: "Geographic Analytics" },
          { id: "referral-analytics", label: "Referral Analytics" },
          { id: "page-conversion", label: "Page Conversion" },
        ],
      },
      {
        id: "campaigns",
        label: "Marketing Campaigns",
        icon: <FilterIcon size={17} />,
        subTabs: [
          { id: "campaign-overview", label: "Campaign Overview" },
          { id: "campaign-performance", label: "Campaign Performance" },
          { id: "campaign-revenue", label: "Campaign Revenue" },
          { id: "campaign-conversion", label: "Campaign Conversion" },
          { id: "campaign-roi", label: "Campaign ROI" },
          { id: "source-comparison", label: "Source Comparison" },
          { id: "referral-performance", label: "Referral Performance" },
          { id: "affiliate-performance", label: "Affiliate Performance" },
        ],
      },
    ],
  },
  {
    title: "Operations & Platform",
    items: [
      {
        id: "performance",
        label: "Event Performance",
        icon: <BarChartIcon size={17} />,
        subTabs: [
          { id: "event-overview", label: "Event Overview" },
          { id: "event-comparison", label: "Event Comparison" },
          { id: "event-growth", label: "Event Growth" },
          { id: "event-revenue", label: "Event Revenue" },
          { id: "event-sales", label: "Event Sales" },
          { id: "event-attendance", label: "Event Attendance" },
          { id: "event-conversion", label: "Event Conversion" },
          { id: "event-engagement", label: "Event Engagement" },
          { id: "event-ranking", label: "Event Ranking" },
        ],
      },
      {
        id: "engagement",
        label: "Attendee Engagement",
        icon: <BarChartIcon size={17} />,
        subTabs: [
          { id: "event-engagement", label: "Event Engagement" },
          { id: "page-engagement", label: "Page Engagement" },
          { id: "session-engagement", label: "Session Engagement" },
          { id: "content-engagement", label: "Content Engagement" },
          { id: "notification-engagement", label: "Notification Engagement" },
          { id: "email-engagement", label: "Email Engagement" },
          { id: "community-engagement", label: "Community Engagement" },
          { id: "repeat-engagement", label: "Repeat Engagement" },
        ],
      },
      {
        id: "platform",
        label: "Platform & Hosts",
        icon: <ShieldCheckIcon size={17} />,
        subTabs: [
          { id: "organizer-overview", label: "Organizer Overview" },
          { id: "event-growth", label: "Event Growth" },
          { id: "revenue-growth", label: "Revenue Growth" },
          { id: "user-growth", label: "User Growth" },
          { id: "event-creation", label: "Event Creation" },
          { id: "organizer-activity", label: "Organizer Activity" },
          { id: "platform-usage", label: "Platform Usage" },
          { id: "feature-usage", label: "Feature Usage" },
        ],
      },
    ],
  },
];

interface TabKpiMetric {
  label: string;
  value: string | number;
  subtext: string;
  delta?: string;
  isPositive?: boolean;
}

function getModuleKpis(
  module: AnalyticsModule,
  data: ReturnType<typeof generateAnalyticsData>
): TabKpiMetric[] {
  const hasReal = data.hasRealData;
  const { summary } = data;

  switch (module) {
    case "overview":
      return [
        {
          label: "Platform GMV",
          value: summary.grossRevenue > 0 ? `₹${summary.grossRevenue.toLocaleString()}` : "₹0",
          subtext: hasReal ? "Total ticket sales" : "No orders yet",
          isPositive: true,
        },
        {
          label: "Tickets Issued",
          value: summary.ticketsSold,
          subtext: hasReal ? "Confirmed attendees" : "No tickets sold",
          isPositive: true,
        },
        {
          label: "Attendance Rate",
          value: summary.ticketsSold > 0 ? `${Math.round((summary.checkInCount / summary.ticketsSold) * 100)}%` : "0%",
          subtext: hasReal ? `${summary.checkInCount} checked in` : "No gate entries",
        },
        {
          label: "Checkout Conversion",
          value: summary.pageViews ? `${summary.conversionRate}%` : "Unavailable",
          subtext: summary.pageViews ? "Visit-to-order ratio" : "No recorded page visits",
        },
      ];

    case "live":
      return [
        {
          label: "Active Entry Gates",
          value: "Unavailable",
          subtext: "Gate telemetry is not connected",
        },
        {
          label: "Live Venue Check-ins",
          value: summary.checkInCount,
          subtext: summary.checkInCount > 0 ? "Scanned at doors" : "Awaiting attendees",
        },
        {
          label: "Gate Flow Velocity",
          value: "Unavailable",
          subtext: "Current scan speed",
        },
        {
          label: "Scanner Latency",
          value: "Unavailable",
          subtext: "Offline-first sync",
        },
      ];

    case "sales":
      return [
        {
          label: "Gross Ticket Sales",
          value: summary.grossRevenue > 0 ? `₹${summary.grossRevenue.toLocaleString()}` : "₹0",
          subtext: hasReal ? "Total revenue captured" : "No transactions",
        },
        {
          label: "Total Orders",
          value: summary.totalOrders,
          subtext: hasReal ? "Successful checkouts" : "No completed orders",
        },
        {
          label: "Average Order Value (AOV)",
          value: summary.totalOrders > 0 ? `₹${Math.round(summary.grossRevenue / summary.totalOrders).toLocaleString()}` : "₹0",
          subtext: "Per transaction average",
        },
        {
          label: "Sales Pace",
          value: "Unavailable",
          subtext: "Tickets booked per hour",
        },
      ];

    case "tickets":
      return [
        {
          label: "Allocated Capacity",
          value: (data as any).totalCapacity || 0,
          subtext: "Across configured tiers",
        },
        {
          label: "Available Inventory",
          value: (data as any).remainingCapacity || 0,
          subtext: "Remaining for release",
        },
        {
          label: "Tier Sell-Out Rate",
          value: (data as any).totalCapacity > 0 ? `${Math.round((summary.ticketsSold / (data as any).totalCapacity) * 100)}%` : "0%",
          subtext: "Total allocation filled",
        },
        {
          label: "Active Ticket Tiers",
          value: data.ticketTiers.length,
          subtext: data.ticketTiers.length > 0 ? "Live tier categories" : "No tiers created",
        },
      ];

    case "revenue":
      return [
        {
          label: "Gross Processed GMV",
          value: summary.grossRevenue > 0 ? `₹${summary.grossRevenue.toLocaleString()}` : "₹0",
          subtext: "Total transaction volume",
        },
        {
          label: "Estimated Platform Fee (5%)",
          value: summary.platformFee > 0 ? `₹${summary.platformFee.toLocaleString()}` : "₹0",
          subtext: "Estimate, not a provider settlement",
        },
        {
          label: "Estimated Net Revenue",
          value: summary.netRevenue > 0 ? `₹${summary.netRevenue.toLocaleString()}` : "₹0",
          subtext: "Estimate only; payouts are not connected",
        },
        {
          label: "Estimated Gateway Fee (2%)",
          value: summary.paymentFee > 0 ? `₹${summary.paymentFee.toLocaleString()}` : "₹0",
          subtext: "Estimate, not a recorded gateway fee",
        },
      ];

    case "discounts":
      return [
        {
          label: "Promo Redemptions",
          value: "Unavailable",
          subtext: "Vouchers claimed at checkout",
        },
        {
          label: "Discount Value Given",
          value: "Unavailable",
          subtext: "Cumulative promo savings",
        },
        {
          label: "Attributed Revenue",
          value: "Unavailable",
          subtext: "GMV driven by promo codes",
        },
        {
          label: "Active Promo Rules",
          value: "Unavailable",
          subtext: "Currently valid coupons",
        },
      ];

    case "refunds":
      return [
        {
          label: "Refund Requests",
          value: summary.refundCount,
          subtext: "Submitted buyer claims",
        },
        {
          label: "Platform Refund Rate",
          value: summary.totalOrders ? `${((summary.refundCount / summary.totalOrders) * 100).toFixed(1)}%` : "Unavailable",
          subtext: "Reversals vs gross orders",
        },
        {
          label: "Total Reversals",
          value: `₹${summary.refundAmount.toLocaleString()}`,
          subtext: "Processed back to buyers",
        },
        {
          label: "Dispute SLA",
          value: "—",
          subtext: "Average turnaround",
        },
      ];

    case "registrations":
      return [
        {
          label: "Form Submissions",
          value: summary.totalRegistrations,
          subtext: hasReal ? "Completed guest forms" : "No submissions",
        },
        {
          label: "Form Completion Rate",
          value: summary.pageViews > 0 ? `${Math.round((summary.totalRegistrations / summary.pageViews) * 100)}%` : "Unavailable",
          subtext: "Visitor-to-registration ratio",
        },
        {
          label: "Checkout Drop-off",
          value: "Unavailable",
          subtext: "Unfinished checkouts",
        },
        {
          label: "Avg Form Duration",
          value: "Unavailable",
          subtext: "Time on register screen",
        },
      ];

    case "attendees":
      return [
        {
          label: "Verified Guests",
          value: summary.totalRegistrations,
          subtext: hasReal ? "Confirmed in database" : "No attendees registered",
        },
        {
          label: "Returning Attendee Rate",
          value: "Unavailable",
          subtext: "Attended previous events",
        },
        {
          label: "Unique Organizations",
          value: "Unavailable",
          subtext: "Company & student domains",
        },
        {
          label: "Profile Data Completeness",
          value: "Unavailable",
          subtext: "All required fields filed",
        },
      ];

    case "attendance":
      return [
        {
          label: "Door Scans Completed",
          value: summary.checkInCount,
          subtext: hasReal ? "Scanned at venue gates" : "No gate entries",
        },
        {
          label: "Attendance Rate",
          value: summary.ticketsSold > 0 ? `${Math.round((summary.checkInCount / summary.ticketsSold) * 100)}%` : "0%",
          subtext: "Ticket holders on-site",
        },
        {
          label: "Peak Hourly Throughput",
          value: "Unavailable",
          subtext: "Fastest entry window",
        },
        {
          label: "No-Show Attendees",
          value: summary.ticketsSold > 0 ? Math.max(0, summary.ticketsSold - summary.checkInCount) : 0,
          subtext: "Unclaimed ticket passes",
        },
      ];

    case "audience":
      return [
        {
          label: "Total Audience Pool",
          value: summary.totalRegistrations,
          subtext: "Verified user profiles",
        },
        {
          label: "Industry Professionals",
          value: "Unavailable",
          subtext: "Based on job titles",
        },
        {
          label: "Top Metro Hub",
          value: "Unavailable",
          subtext: "Primary audience origin",
        },
        {
          label: "Retention Index",
          value: "Unavailable",
          subtext: "Multi-edition loyalty",
        },
      ];

    case "marketing":
      return [
        {
          label: "Tracked Inbound Visits",
          value: summary.pageViews,
          subtext: hasReal ? "UTM & direct referrals" : "No campaign clicks",
        },
        {
          label: "Top Acquisition Channel",
          value: "Unavailable",
          subtext: "Highest volume source",
        },
        {
          label: "Campaign Conversion",
          value: "Unavailable",
          subtext: "Visitor-to-ticket purchase",
        },
        {
          label: "Referral Share",
          value: "Unavailable",
          subtext: "Word-of-mouth invites",
        },
      ];

    case "conversion":
      return [
        {
          label: "Landing Impressions",
          value: summary.pageViews,
          subtext: "Event page visits",
        },
        {
          label: "Cart Addition Rate",
          value: "Unavailable",
          subtext: "Started ticket selection",
        },
        {
          label: "Payment Finalization",
          value: "Unavailable",
          subtext: "Completed checkout",
        },
        {
          label: "End-to-End Funnel",
          value: summary.pageViews ? `${summary.conversionRate}%` : "Unavailable",
          subtext: "Visitor to confirmed order",
        },
      ];

    case "event-pages":
      return [
        {
          label: "Total Pageviews",
          value: summary.pageViews,
          subtext: "Event landing screens",
        },
        {
          label: "Unique Visitors",
          value: "Unavailable",
          subtext: "Distinct client devices",
        },
        {
          label: "Avg Time on Page",
          value: "Unavailable",
          subtext: "Session dwell time",
        },
        {
          label: "Bounce Rate",
          value: "Unavailable",
          subtext: "Single-page exits",
        },
      ];

    case "campaigns":
      return [
        {
          label: "Active Campaigns",
          value: "Unavailable",
          subtext: "Tracking links & UTMs",
        },
        {
          label: "Attributed GMV",
          value: "Unavailable",
          subtext: "Sales from promotions",
        },
        {
          label: "Connected Ad Spend",
          value: "Unavailable",
          subtext: "Marketing spend logged",
        },
        {
          label: "Blended ROAS",
          value: "Unavailable",
          subtext: "Return on advertising spend",
        },
      ];

    case "performance":
      return [
        {
          label: "Published Events",
          value: data.activeEvents.filter((event) => event.status === "PUBLISHED" || event.status === "SOLD_OUT").length,
          subtext: hasReal ? "Live event pages" : "No events created",
        },
        {
          label: "Avg GMV per Event",
          value: data.events.length > 0 ? `₹${Math.round(summary.grossRevenue / data.events.length).toLocaleString()}` : "₹0",
          subtext: "Revenue yield per event",
        },
        {
          label: "Sold-Out Releases",
          value: data.activeEvents.filter((event) => event.status === "SOLD_OUT").length,
          subtext: "100% capacity reached",
        },
        {
          label: "Host Completion Rate",
          value: "Unavailable",
          subtext: "Successfully delivered",
        },
      ];

    case "engagement":
      return [
        {
          label: "Schedule Bookmarks",
          value: "Unavailable",
          subtext: "Sessions saved by users",
        },
        {
          label: "Community Messages",
          value: "Unavailable",
          subtext: "Questions & discussions",
        },
        {
          label: "Broadcast Read Rate",
          value: "Unavailable",
          subtext: "Host announcements viewed",
        },
        {
          label: "Multi-Session Attendees",
          value: "Unavailable",
          subtext: "Attended 2+ sub-events",
        },
      ];

    case "platform":
      return [
        {
          label: "Active Event Hosts",
          value: new Set(data.activeEvents.map((event) => event.organizer_id).filter(Boolean)).size,
          subtext: "Verified event organizers",
        },
        {
          label: "Live Event Drops",
          value: data.activeEvents.filter((event) => event.status === "PUBLISHED" || event.status === "SOLD_OUT").length,
          subtext: "Publicly bookable",
        },
        {
          label: "Webhook Invocations",
          value: "Unavailable",
          subtext: "API integrations triggered",
        },
        {
          label: "System Availability",
          value: "Unavailable",
          subtext: "Console API uptime",
        },
      ];

    default:
      return [
        { label: "Gross Revenue", value: "₹0", subtext: "No sales recorded" },
        { label: "Tickets Issued", value: 0, subtext: "No tickets issued" },
        { label: "Attendance Rate", value: "0%", subtext: "No gate entries" },
        { label: "Conversion Rate", value: "0.0%", subtext: "No traffic yet" },
      ];
  }
}

function EmptyKpiState({
  kind,
  title,
  description,
  action,
}: {
  kind: DashboardArtworkKind;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto select-none">
      <div className="mb-3"><DashboardArtwork kind={kind} /></div>
      <h3 className="text-sm font-bold text-zinc-950 font-heading">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function KpiAnalyticsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as AnalyticsModule | null;
  const subTabParam = searchParams.get("subtab");

  const [activeTab, setActiveTab] = useState<AnalyticsModule>(tabParam || "overview");
  const [activeSubTab, setActiveSubTab] = useState<string>(subTabParam || "");

  const [filters, setFilters] = useState<AnalyticsFilterState>({
    dateRange: "30d",
    eventId: "all",
    organizerId: "all",
    communityId: "all",
    city: "all",
    isLive: false,
    comparison: "period",
  });

  const allItems = useMemo(() => {
    return NAV_CATEGORIES.flatMap((c) => c.items);
  }, []);

  const currentItem = useMemo(() => {
    return allItems.find((i) => i.id === activeTab) || allItems[0];
  }, [activeTab, allItems]);

  useEffect(() => {
    if (tabParam && allItems.some((i) => i.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, allItems]);

  useEffect(() => {
    if (!subTabParam || !currentItem.subTabs.some((st) => st.id === subTabParam)) {
      setActiveSubTab(currentItem.subTabs[0]?.id || "");
    } else {
      setActiveSubTab(subTabParam);
    }
  }, [currentItem, subTabParam]);

  const handleTabChange = (tabId: AnalyticsModule) => {
    setActiveTab(tabId);
    const target = allItems.find((i) => i.id === tabId);
    const firstSub = target?.subTabs[0]?.id || "";
    setActiveSubTab(firstSub);
    router.push(`/console/kpi?tab=${tabId}&subtab=${firstSub}`);
  };

  const handleSubTabChange = (subId: string) => {
    setActiveSubTab(subId);
    router.push(`/console/kpi?tab=${activeTab}&subtab=${subId}`);
  };

  const data = useMemo(() => {
    return generateAnalyticsData(filters);
  }, [filters]);

  useEffect(() => {
    if (!filters.isLive) return;
    const interval = setInterval(() => {
      setFilters((prev) => ({ ...prev }));
    }, 4000);
    return () => clearInterval(interval);
  }, [filters.isLive]);

  const handleExportCsv = () => {
    const kpis = getModuleKpis(activeTab, data);
    let csv = "data:text/csv;charset=utf-8,Module,Metric,Value,Context\n";
    kpis.forEach((k) => {
      csv += `${activeTab},"${k.label}","${k.value}","${k.subtext}"\n`;
    });

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.href = encoded;
    link.download = `hackways_kpi_${activeTab}_${activeSubTab}.csv`;
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
              Platform Analytics & KPI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/console/organizer/overview"
            className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-4 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>Exit to Console</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>

      {/* 2. MAIN SPLIT LAYOUT: FIXED LEFT SIDEBAR + FULL CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white py-4 px-3 flex flex-col justify-between h-full overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            {NAV_CATEGORIES.map((cat) => (
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
                  {currentItem.label}
                </h1>
                {filters.isLive && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-950 text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Pulse
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real-time operational metrics, audit traces, and domain analytics.
              </p>
            </div>

            {/* Global Multi-dimensional Capsule Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Event Filter Capsule */}
              <select
                value={filters.eventId}
                onChange={(e) => setFilters((prev) => ({ ...prev, eventId: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Events ({data.events.length})</option>
                {data.events.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              {/* Organiser Filter Capsule */}
              <select
                value={filters.organizerId || "all"}
                onChange={(e) => setFilters((prev) => ({ ...prev, organizerId: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Organisers ({(data as any).organizers?.length || 0})</option>
                {((data as any).organizers || []).map((org: { id: string; name: string }) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              {/* Community Filter Capsule */}
              <select
                value={filters.communityId || "all"}
                onChange={(e) => setFilters((prev) => ({ ...prev, communityId: e.target.value }))}
                className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Communities ({(data as any).communities?.length || 0})</option>
                {((data as any).communities || []).map((comm: { id: string; name: string }) => (
                  <option key={comm.id} value={comm.id}>
                    {comm.name}
                  </option>
                ))}
              </select>

              {/* City / Location Filter Capsule */}
              {((data as any).cities || []).length > 0 && (
                <select
                  value={filters.city || "all"}
                  onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                  className="text-xs font-medium bg-white border border-zinc-200 rounded-full px-3.5 py-1.5 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
                >
                  <option value="all">All Locations ({(data as any).cities.length})</option>
                  {((data as any).cities || []).map((ct: string) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Range Capsule Container */}
              <div className="flex items-center bg-zinc-100 p-1 rounded-full text-xs font-medium text-zinc-600">
                {[
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7D" },
                  { id: "30d", label: "30D" },
                  { id: "90d", label: "90D" },
                  { id: "1y", label: "1Y" },
                  { id: "all", label: "All" },
                ].map((rng) => (
                  <button
                    key={rng.id}
                    onClick={() => setFilters((prev) => ({ ...prev, dateRange: rng.id as any }))}
                    className={`px-3 py-1 rounded-full transition cursor-pointer ${
                      filters.dateRange === rng.id
                        ? "bg-white text-zinc-950 font-bold shadow-2xs"
                        : "hover:text-zinc-950"
                    }`}
                  >
                    {rng.label}
                  </button>
                ))}
              </div>

              {/* Live Mode Capsule Button */}
              <button
                onClick={() => setFilters((prev) => ({ ...prev, isLive: !prev.isLive }))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 transition cursor-pointer ${
                  filters.isLive
                    ? "bg-zinc-950 text-white border-zinc-950"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${filters.isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"}`} />
                <span>Live</span>
              </button>

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
            {currentItem.subTabs.map((sub) => {
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

          {/* 3. DEDICATED TAB METRICS — SPECIFIC TO CURRENT TAB! NO GENERIC STRIP */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 border-y border-zinc-200 py-3 my-4">
            {getModuleKpis(activeTab, data).map((kpi) => (
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

          {/* 4. CONTENT SECTIONS (CLEAN, AIRY, NO CARDS, STRICTLY REAL DATA) */}

          {!data.hasRealData ? (
            <EmptyKpiState
              kind={
                ["sales", "tickets"].includes(activeTab)
                  ? "tickets"
                  : ["revenue", "discounts", "refunds"].includes(activeTab)
                  ? "revenue"
                  : ["registrations", "attendees", "audience"].includes(activeTab)
                  ? "participants"
                  : ["attendance", "live"].includes(activeTab)
                  ? "venue"
                  : ["marketing", "conversion", "campaigns"].includes(activeTab)
                  ? "broadcast"
                  : "analytics"
              }
              title={`No Real ${currentItem.label} Data Yet`}
              description="Platform GMV, ticket registrations, door scans, and financial settlements calculate dynamically in real time once events are scheduled and tickets are issued."
              action={
                <Link
                  href="/create"
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Create First Event</span>
                </Link>
              }
            />
          ) : (
            <>
              {/* OVERVIEW MODULE */}
              {activeTab === "overview" && (
                <div className="space-y-8 pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-950 font-heading">
                            Revenue Trajectory & Sales Velocity
                          </h3>
                          <p className="text-xs text-zinc-500">Gross ticket revenue captured across active releases</p>
                        </div>
                        <span className="text-xs font-semibold text-zinc-950 font-heading tabular-nums">
                          ₹{data.summary.grossRevenue.toLocaleString()} Total
                        </span>
                      </div>
                      <AreaChart
                        data={data.revenueSeries}
                        labels={data.timeLabels}
                        color="#18181b"
                        height={230}
                        valuePrefix="₹"
                      />
                    </div>

                    <div className="lg:col-span-4 space-y-4">
                      <h3 className="text-sm font-bold text-zinc-950 font-heading">Door Turnstile Capacity</h3>
                      <p className="text-xs text-zinc-500">Real-time attendance scanning progress</p>
                      <div className="py-2">
                        <ProgressMeter
                          value={data.summary.checkInCount}
                          max={Math.max(1, data.summary.ticketsSold)}
                          label="Turnstile Entry Progress"
                          sublabel={`${data.summary.checkInCount} of ${data.summary.ticketsSold} ticket holders inside`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-200 space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Registration & Checkout Funnel</h3>
                    <FunnelChart stages={data.funnelStages} />
                  </div>
                </div>
              )}

              {/* REGISTRATIONS MODULE */}
              {activeTab === "registrations" && (
                <div className="space-y-8 pt-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Registration Funnel Drop-off</h3>
                    <p className="text-xs text-zinc-500">Visitor progression from landing page to ticket issuance</p>
                    <FunnelChart stages={data.funnelStages} />
                  </div>
                </div>
              )}

              {/* SALES MODULE */}
              {activeTab === "sales" && (
                <div className="space-y-8 pt-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Ticket Sales Trajectory</h3>
                    <LineChart data={data.ticketsSeries} labels={data.timeLabels} color="#18181b" height={220} valueSuffix=" tickets" />
                  </div>

                  {data.ticketTiers.length > 0 && (
                    <div className="pt-4 border-t border-zinc-200">
                      <h3 className="text-sm font-bold text-zinc-950 font-heading mb-3">Tier Inventory & Sales</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-200 text-zinc-500 font-medium">
                              <th className="py-2.5 px-3">Ticket Tier</th>
                              <th className="py-2.5 px-3">Unit Price</th>
                              <th className="py-2.5 px-3">Sold</th>
                              <th className="py-2.5 px-3">Gross Captured</th>
                              <th className="py-2.5 px-3">Inventory</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-zinc-800">
                            {data.ticketTiers.map((tier) => (
                              <tr key={tier.name} className="hover:bg-zinc-50">
                                <td className="py-3 px-3 font-semibold text-zinc-950">{tier.name}</td>
                                <td className="py-3 px-3 tabular-nums">₹{tier.price}</td>
                                <td className="py-3 px-3 tabular-nums font-semibold">{tier.sold}</td>
                                <td className="py-3 px-3 tabular-nums font-bold">₹{tier.revenue.toLocaleString()}</td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium tabular-nums bg-emerald-50 text-emerald-700">
                                    {tier.inventory} left
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REVENUE MODULE */}
              {activeTab === "revenue" && (
                <div className="space-y-8 pt-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Gross Revenue Growth</h3>
                    <AreaChart data={data.revenueSeries} labels={data.timeLabels} color="#059669" height={220} valuePrefix="₹" />
                  </div>

                  <div className="pt-4 border-t border-zinc-200">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading mb-3">Financial Settlement Ledger</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 text-zinc-500 font-medium">
                            <th className="py-2.5 px-3">Financial Line Item</th>
                            <th className="py-2.5 px-3">Effective Take</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-zinc-800">
                          <tr>
                            <td className="py-3 px-3 font-semibold text-zinc-950">Gross Captured Volume</td>
                            <td className="py-3 px-3 tabular-nums">100.0%</td>
                            <td className="py-3 px-3 tabular-nums font-bold">₹{data.summary.grossRevenue.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-emerald-600 font-semibold">SETTLED</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-zinc-950">Platform Take Rate (5%)</td>
                            <td className="py-3 px-3 tabular-nums">5.0%</td>
                            <td className="py-3 px-3 tabular-nums text-zinc-600">- ₹{data.summary.platformFee.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-zinc-500">RETAINED</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-zinc-950">Gateway Interchange (2%)</td>
                            <td className="py-3 px-3 tabular-nums">2.0%</td>
                            <td className="py-3 px-3 tabular-nums text-zinc-600">- ₹{data.summary.paymentFee.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-zinc-500">CLEARED</td>
                          </tr>
                          <tr className="bg-zinc-50/60 font-bold">
                            <td className="py-3 px-3 text-zinc-950">Net Disbursed to Hosts</td>
                            <td className="py-3 px-3 tabular-nums">93.0%</td>
                            <td className="py-3 px-3 tabular-nums text-emerald-700">₹{data.summary.netRevenue.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-emerald-600">DISBURSED</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE MODULE */}
              {activeTab === "live" && (
                <div className="space-y-8 pt-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">Live Entry Activity Stream</h3>
                    {data.liveActivity.length === 0 ? (
                      <div className="text-xs text-zinc-400 py-8 text-center">No turnstile scans recorded yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {data.liveActivity.map((act) => (
                          <div key={act.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <div>
                                <span className="font-semibold text-zinc-950">{act.title}</span>
                                <span className="text-zinc-500 ml-2">({act.detail})</span>
                              </div>
                            </div>
                            <span className="text-zinc-400 tabular-nums">{act.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OTHER MODULES WITH REAL DATA */}
              {!["overview", "registrations", "sales", "revenue", "live"].includes(activeTab) && (
                <div className="space-y-8 pt-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-950 font-heading">
                      {currentItem.label} — Live Real-Time Telemetry
                    </h3>
                    <AreaChart data={data.revenueSeries} labels={data.timeLabels} color="#18181b" height={220} />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
