"use client";

import React, { useState } from "react";

// ==========================================
// 1. AREA CHART (Smooth SVG with gradient)
// ==========================================
export function AreaChart({
  data,
  labels,
  color = "#18181b",
  height = 220,
  valuePrefix = "",
  valueSuffix = "",
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const paddingY = 20;
  const chartHeight = height - paddingY * 2;
  const width = 600;
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = paddingY + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y, val, label: labels[i] || "" };
  });

  // SVG Path
  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="relative w-full select-none" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`area-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingY + chartHeight * ratio;
          return (
            <line
              key={i}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="#f4f4f5"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#area-grad-${color.replace("#", "")})`} />

        {/* Top Stroke line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

        {/* Hover Points & Vertical indicator line */}
        {points.map((p, idx) => (
          <g key={idx}>
            {hoverIdx === idx && (
              <>
                <line
                  x1={p.x}
                  y1={0}
                  x2={p.x}
                  y2={height}
                  stroke="#a1a1aa"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={color} strokeWidth="3" />
              </>
            )}
            <rect
              x={p.x - stepX / 2}
              y={0}
              width={stepX}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}
      </svg>

      {/* Floating Tooltip */}
      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="absolute pointer-events-none -top-1 bg-zinc-950 text-white text-[11px] py-1 px-2.5 rounded shadow-lg transform -translate-x-1/2 -translate-y-full whitespace-nowrap z-20"
          style={{ left: `${(points[hoverIdx].x / width) * 100}%` }}
        >
          <div className="font-mono font-bold">
            {valuePrefix}
            {points[hoverIdx].val.toLocaleString()}
            {valueSuffix}
          </div>
          <div className="text-[10px] text-zinc-400">{points[hoverIdx].label}</div>
        </div>
      )}

      {/* Bottom X-Axis Labels */}
      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1 px-1">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. LINE CHART
// ==========================================
export function LineChart({
  data,
  labels,
  color = "#2563eb",
  height = 200,
  valuePrefix = "",
  valueSuffix = "",
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  return (
    <AreaChart
      data={data}
      labels={labels}
      color={color}
      height={height}
      valuePrefix={valuePrefix}
      valueSuffix={valueSuffix}
    />
  );
}

// ==========================================
// 3. BAR CHART
// ==========================================
export function BarChart({
  data,
  labels,
  color = "#18181b",
  height = 200,
  valuePrefix = "",
  valueSuffix = "",
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxVal = Math.max(...data, 1);

  return (
    <div className="w-full select-none" style={{ height }}>
      <div className="flex items-end justify-between gap-2 h-44 border-b border-zinc-200 pb-1">
        {data.map((val, idx) => {
          const barHeightPct = Math.max(4, Math.round((val / maxVal) * 100));
          const isHovered = hoverIdx === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {isHovered && (
                <div className="absolute -top-8 bg-zinc-950 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                  {valuePrefix}
                  {val.toLocaleString()}
                  {valueSuffix}
                </div>
              )}
              <div
                className="w-full max-w-[36px] rounded-t-sm transition-all duration-200"
                style={{
                  height: `${barHeightPct}%`,
                  backgroundColor: isHovered ? color : `${color}cc`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1.5 px-1">
        {labels.map((lbl, idx) => (
          <span key={idx} className="truncate max-w-[48px] text-center">
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. STACKED BAR CHART
// ==========================================
export function StackedBarChart({
  series,
  labels,
  colors = ["#18181b", "#71717a", "#d4d4d8"],
  height = 200,
}: {
  series: { name: string; data: number[] }[];
  labels: string[];
  colors?: string[];
  height?: number;
}) {
  const totals = labels.map((_, i) =>
    series.reduce((sum, s) => sum + (s.data[i] || 0), 0)
  );
  const maxTotal = Math.max(...totals, 1);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between gap-3 h-40 border-b border-zinc-200 pb-1">
        {labels.map((_, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full max-w-[32px] flex flex-col-reverse rounded-t-sm overflow-hidden h-full justify-end">
              {series.map((s, sIdx) => {
                const val = s.data[colIdx] || 0;
                const pct = (val / maxTotal) * 100;
                return (
                  <div
                    key={sIdx}
                    style={{
                      height: `${pct}%`,
                      backgroundColor: colors[sIdx % colors.length],
                    }}
                    title={`${s.name}: ${val.toLocaleString()}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1.5">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        {series.map((s, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-xs"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="text-zinc-600 text-[11px]">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 5. HORIZONTAL BAR CHART (Ranking / Breakdown)
// ==========================================
export function HorizontalBarChart({
  items,
  valuePrefix = "",
  valueSuffix = "",
}: {
  items: { label: string; value: number; secondary?: string }[];
  valuePrefix?: string;
  valueSuffix?: string;
}) {
  const maxVal = Math.max(...items.map((it) => it.value), 1);

  return (
    <div className="space-y-3 w-full">
      {items.map((item, idx) => {
        const pct = Math.round((item.value / maxVal) * 100);
        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-zinc-950 truncate max-w-[240px]">
                {item.label}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                {item.secondary && (
                  <span className="text-zinc-500 font-normal">{item.secondary}</span>
                )}
                <span className="font-bold text-zinc-950">
                  {valuePrefix}
                  {item.value.toLocaleString()}
                  {valueSuffix}
                </span>
              </div>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-zinc-950 h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 6. DONUT CHART (Clean SVG Geometry)
// ==========================================
export function DonutChart({
  items,
  size = 140,
  strokeWidth = 18,
}: {
  items: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f4f4f5"
            strokeWidth={strokeWidth}
          />
          {items.map((item, idx) => {
            const percent = (item.value / total) * 100;
            const strokeDashoffset = circumference - (circumference * percent) / 100;
            const rotation = (accumulatedPercent / 100) * 360;
            accumulatedPercent += percent;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transformOrigin: "center",
                  transform: `rotate(${rotation}deg)`,
                  transition: "stroke-dashoffset 0.4s ease",
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-mono font-bold text-zinc-950">100%</span>
          <span className="text-[10px] text-zinc-500 font-medium">Split</span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 w-full">
        {items.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={idx} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-700 truncate">{item.label}</span>
              </div>
              <div className="font-mono text-[11px] text-zinc-900 font-semibold ml-2">
                {pct}% <span className="text-zinc-500 font-normal">({item.value.toLocaleString()})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 7. FUNNEL CHART
// ==========================================
export function FunnelChart({
  stages,
}: {
  stages: { step: string; count: number; rate: string }[];
}) {
  const maxVal = stages[0]?.count || 1;

  return (
    <div className="space-y-3 w-full">
      {stages.map((stage, idx) => {
        const pct = Math.max(12, Math.round((stage.count / maxVal) * 100));
        const prevCount = idx === 0 ? stage.count : stages[idx - 1].count;
        const stepDrop = idx === 0 ? "100%" : `${Math.round((stage.count / prevCount) * 100)}% retention`;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-950">{stage.step}</span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-zinc-500">{stepDrop}</span>
                <span className="font-bold text-zinc-950">{stage.count.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-full bg-zinc-100 rounded-lg h-7 overflow-hidden relative flex items-center px-3">
              <div
                className="absolute left-0 top-0 bottom-0 bg-zinc-900 rounded-lg transition-all duration-300"
                style={{ width: `${pct}%`, opacity: 0.15 + (idx * 0.18) }}
              />
              <span className="relative z-10 text-[11px] font-mono font-medium text-zinc-800">
                {stage.rate}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 8. HEATMAP GRID (Check-in / Activity)
// ==========================================
export function HeatmapGrid() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["08", "10", "12", "14", "16", "18", "20", "22"];

  // Synthetic density matrix
  const getDensity = (dayIdx: number, hourIdx: number) => {
    const score = ((dayIdx * 3 + hourIdx * 7) % 10) / 10;
    if (score < 0.25) return "bg-zinc-100";
    if (score < 0.5) return "bg-zinc-300";
    if (score < 0.75) return "bg-zinc-600";
    return "bg-zinc-950";
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[420px] space-y-1.5">
        <div className="flex items-center text-[10px] text-zinc-500 font-mono">
          <div className="w-12 shrink-0" />
          <div className="flex-1 grid grid-cols-8 gap-1.5 text-center">
            {hours.map((h) => (
              <span key={h}>{h}:00</span>
            ))}
          </div>
        </div>
        {days.map((day, dIdx) => (
          <div key={day} className="flex items-center text-xs">
            <span className="w-12 shrink-0 text-zinc-600 font-mono text-[11px]">{day}</span>
            <div className="flex-1 grid grid-cols-8 gap-1.5">
              {hours.map((_, hIdx) => (
                <div
                  key={hIdx}
                  className={`h-6 rounded-xs ${getDensity(dIdx, hIdx)} transition hover:opacity-80 cursor-pointer`}
                  title={`${day} at ${hours[hIdx]}:00 - Activity Density`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-zinc-500 font-mono mt-3">
        <span>Less active</span>
        <span className="w-3 h-3 rounded-xs bg-zinc-100 inline-block" />
        <span className="w-3 h-3 rounded-xs bg-zinc-300 inline-block" />
        <span className="w-3 h-3 rounded-xs bg-zinc-600 inline-block" />
        <span className="w-3 h-3 rounded-xs bg-zinc-950 inline-block" />
        <span>Peak activity</span>
      </div>
    </div>
  );
}

// ==========================================
// 9. SCATTER PLOT (Campaign ROI vs Spend)
// ==========================================
export function ScatterPlot({
  points,
}: {
  points: { name: string; x: number; y: number; size?: number }[];
}) {
  const maxX = Math.max(...points.map((p) => p.x), 50000);
  const maxY = Math.max(...points.map((p) => p.y), 5);

  return (
    <div className="w-full">
      <div className="h-52 border-l border-b border-zinc-200 relative p-4">
        {points.map((p, idx) => {
          const leftPct = Math.min(95, Math.max(5, (p.x / maxX) * 100));
          const bottomPct = Math.min(95, Math.max(5, (p.y / maxY) * 100));

          return (
            <div
              key={idx}
              className="absolute group -translate-x-1/2 translate-y-1/2 cursor-pointer"
              style={{ left: `${leftPct}%`, bottom: `${bottomPct}%` }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-950 ring-4 ring-zinc-100 group-hover:scale-125 transition" />
              <div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 bg-zinc-950 text-white text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                <div className="font-bold">{p.name}</div>
                <div className="text-zinc-400 font-mono">Spend: ₹{p.x.toLocaleString()} · ROI: {p.y}x</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1">
        <span>₹0 Spend</span>
        <span>Ad Spend Axis (X) →</span>
        <span>₹{(maxX / 1000).toFixed(0)}K Spend</span>
      </div>
    </div>
  );
}

// ==========================================
// 10. PROGRESS METER
// ==========================================
export function ProgressMeter({
  value,
  max,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-zinc-800">{label}</span>
        <span className="font-mono font-bold text-zinc-950">{pct}%</span>
      </div>
      <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-zinc-950 h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {sublabel && <div className="text-[11px] text-zinc-500 font-mono">{sublabel}</div>}
    </div>
  );
}
