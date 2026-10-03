"use client";

import React from "react";
import { AnalyticsFilterState } from "../data/analyticsData";
import { EventItem } from "@/lib/types";
import { CalendarIcon, FilterIcon, RefreshCwIcon } from "@/components/icons/hugeicons";
import { Download, Printer, Radio } from "lucide-react";

export function AnalyticsHeader({
  filters,
  onFilterChange,
  events,
  onExportCsv,
  onExportReport,
}: {
  filters: AnalyticsFilterState;
  onFilterChange: (newFilters: Partial<AnalyticsFilterState>) => void;
  events: EventItem[];
  onExportCsv: () => void;
  onExportReport: () => void;
}) {
  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
      {/* Title & Live Status */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight font-heading">
            Platform Analytics & KPI
          </h1>
          {filters.isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Real-time metrics, conversion funnels, financial ledgers, and attendee intelligence across all platform events.
        </p>
      </div>

      {/* Global Controls */}
      <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
        {/* Event Selector */}
        <div className="relative">
          <select
            value={filters.eventId}
            onChange={(e) => onFilterChange({ eventId: e.target.value })}
            className="text-xs font-medium bg-white border border-zinc-200 rounded-lg px-3 py-1.5 pr-8 hover:border-zinc-300 focus:outline-none focus:border-zinc-900 cursor-pointer shadow-2xs"
          >
            <option value="all">All Platform Events ({events.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg text-xs font-medium text-zinc-600">
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
              onClick={() => onFilterChange({ dateRange: rng.id as any })}
              className={`px-2.5 py-1 rounded-md transition ${
                filters.dateRange === rng.id
                  ? "bg-white text-zinc-950 font-bold shadow-2xs"
                  : "hover:text-zinc-950"
              }`}
            >
              {rng.label}
            </button>
          ))}
        </div>

        {/* Live Toggle */}
        <button
          onClick={() => onFilterChange({ isLive: !filters.isLive })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition ${
            filters.isLive
              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          }`}
          title="Toggle live telemetry stream"
        >
          <Radio size={13} className={filters.isLive ? "animate-pulse" : ""} />
          <span>Live</span>
        </button>

        {/* Export CSV */}
        <button
          onClick={onExportCsv}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 inline-flex items-center gap-1.5 transition shadow-2xs"
          title="Export current tab data to CSV"
        >
          <Download size={13} />
          <span>CSV</span>
        </button>

        {/* Print / Report */}
        <button
          onClick={onExportReport}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 inline-flex items-center gap-1.5 transition shadow-2xs"
          title="Print summary report"
        >
          <Printer size={13} />
          <span>Report</span>
        </button>
      </div>
    </div>
  );
}
