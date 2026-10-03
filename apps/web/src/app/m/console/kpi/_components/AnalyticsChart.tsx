"use client";

import React, { useState } from "react";
import { BarChart3, LineChart, TrendingUp, Users, DollarSign } from "lucide-react";

interface DataPoint {
  label: string;
  rsvps: number;
  sales: number;
  views: number;
}

interface AnalyticsChartProps {
  period: "7d" | "30d" | "all";
  metricType?: "rsvps" | "sales" | "views";
}

const DATA_7D: DataPoint[] = [
  { label: "Mon", rsvps: 14, sales: 1200, views: 68 },
  { label: "Tue", rsvps: 28, sales: 2400, views: 112 },
  { label: "Wed", rsvps: 22, sales: 1800, views: 94 },
  { label: "Thu", rsvps: 36, sales: 3200, views: 145 },
  { label: "Fri", rsvps: 52, sales: 4500, views: 220 },
  { label: "Sat", rsvps: 78, sales: 6800, views: 310 },
  { label: "Sun", rsvps: 64, sales: 5100, views: 275 },
];

const DATA_30D: DataPoint[] = [
  { label: "Week 1", rsvps: 110, sales: 8400, views: 520 },
  { label: "Week 2", rsvps: 185, sales: 14200, views: 840 },
  { label: "Week 3", rsvps: 240, sales: 19800, views: 1150 },
  { label: "Week 4", rsvps: 310, sales: 25600, views: 1420 },
];

const DATA_ALL: DataPoint[] = [
  { label: "Jan", rsvps: 280, sales: 22000, views: 1600 },
  { label: "Feb", rsvps: 420, sales: 34000, views: 2400 },
  { label: "Mar", rsvps: 580, sales: 48000, views: 3200 },
  { label: "Apr", rsvps: 790, sales: 68000, views: 4600 },
];

export default function AnalyticsChart({ period, metricType = "rsvps" }: AnalyticsChartProps) {
  const data = period === "7d" ? DATA_7D : period === "30d" ? DATA_30D : DATA_ALL;
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [metric, setMetric] = useState<"rsvps" | "sales" | "views">(metricType);
  const [selectedIndex, setSelectedIndex] = useState<number>(data.length - 1);

  const getMetricValue = (d: DataPoint) => {
    if (metric === "sales") return d.sales;
    if (metric === "views") return d.views;
    return d.rsvps;
  };

  const maxVal = Math.max(...data.map(getMetricValue), 10);
  const width = 320;
  const height = 130;
  const paddingX = 20;
  const paddingY = 16;

  const activePoint = data[selectedIndex] || data[data.length - 1];
  const activeValue = getMetricValue(activePoint);

  // SVG Line path calculations
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (getMetricValue(d) / maxVal) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="py-2 space-y-3 bg-white">
      {/* Top Header: Metric Selector & Chart Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        {/* Metric Chips */}
        <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-full">
          <button
            type="button"
            onClick={() => setMetric("rsvps")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              metric === "rsvps" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            RSVPs
          </button>
          <button
            type="button"
            onClick={() => setMetric("views")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              metric === "views" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Views
          </button>
          <button
            type="button"
            onClick={() => setMetric("sales")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              metric === "sales" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Sales
          </button>
        </div>

        {/* Bar vs Line Switcher */}
        <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-full">
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`p-1.5 rounded-full transition ${
              chartType === "bar" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
            }`}
            aria-label="Bar chart"
          >
            <BarChart3 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setChartType("line")}
            className={`p-1.5 rounded-full transition ${
              chartType === "line" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
            }`}
            aria-label="Line chart"
          >
            <LineChart size={13} />
          </button>
        </div>
      </div>

      {/* Metric Value Hero */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            {metric === "rsvps" ? "RSVPs & Turnout" : metric === "views" ? "Page Impressions" : "Gross Revenue"}
          </span>
          <div className="text-3xl font-black tracking-tight text-zinc-950 tabular-nums mt-0.5">
            {metric === "sales" ? `₹${activeValue.toLocaleString()}` : activeValue.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-zinc-400 font-medium block">{activePoint.label}</span>
          <span className="text-xs font-bold text-emerald-600">
            {metric === "rsvps" ? `+${activePoint.rsvps} joined` : metric === "views" ? `+${activePoint.views} views` : `+₹${activePoint.sales}`}
          </span>
        </div>
      </div>

      {/* Chart Visual Surface (Bar or Line) */}
      <div className="relative w-full pt-1">
        {chartType === "bar" ? (
          /* Crisp Interactive SVG Bar Chart */
          <div className="space-y-1">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible select-none">
              {data.map((d, idx) => {
                const val = getMetricValue(d);
                const barWidth = (width - paddingX * 2) / data.length - 8;
                const x = paddingX + idx * ((width - paddingX * 2) / data.length) + 4;
                const barHeight = Math.max(6, (val / maxVal) * (height - paddingY * 2));
                const y = height - paddingY - barHeight;
                const isSelected = selectedIndex === idx;

                return (
                  <g key={idx} onClick={() => setSelectedIndex(idx)} className="cursor-pointer">
                    {/* Bar Background Track */}
                    <rect
                      x={x}
                      y={paddingY}
                      width={barWidth}
                      height={height - paddingY * 2}
                      rx="3"
                      fill="#f4f4f5"
                    />

                    {/* Active Bar Fill */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      fill={isSelected ? "#18181b" : "#a1a1aa"}
                      className="transition-all duration-200"
                    />

                    {/* Bar Value on Selection */}
                    {isSelected && (
                      <text
                        x={x + barWidth / 2}
                        y={Math.max(12, y - 6)}
                        textAnchor="middle"
                        fill="#18181b"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {metric === "sales" ? `₹${val}` : val}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* Crisp Interactive SVG Line Chart */
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible select-none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#18181b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#18181b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <path d={areaD} fill="url(#chartGradient)" />
            <path d={pathD} fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />

            {points.map((p, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <g key={idx} onClick={() => setSelectedIndex(idx)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? "5" : "3"}
                    fill={isSelected ? "#18181b" : "#a1a1aa"}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {isSelected && (
                    <line
                      x1={p.x}
                      y1={p.y + 6}
                      x2={p.x}
                      y2={height - paddingY}
                      stroke="#18181b"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.3"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* X-axis Labels */}
        <div className="flex justify-between px-2 pt-1 border-t border-zinc-100 text-[10px] text-zinc-400 font-medium">
          {data.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`transition hover:text-zinc-900 ${selectedIndex === i ? "text-zinc-950 font-bold" : ""}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
