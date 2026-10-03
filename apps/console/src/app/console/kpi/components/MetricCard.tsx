"use client";

import React from "react";

export function MetricCard({
  label,
  value,
  delta,
  isPositive = true,
  subtext,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value: string | number;
  delta?: string;
  isPositive?: boolean;
  subtext?: string;
  prefix?: string;
  suffix?: string;
  sparkline?: number[];
}) {
  return (
    <div className="py-2 px-1 sm:px-4 space-y-1.5 select-none">
      <div className="text-xs font-medium text-zinc-500">{label}</div>

      <div className="text-2xl sm:text-3xl font-bold text-zinc-950 font-heading tracking-tight tabular-nums">
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix}
      </div>

      <div className="flex items-center gap-1.5 text-xs pt-0.5">
        {delta && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
              isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {isPositive ? "↑ +" : "↓ -"}
            {delta}
          </span>
        )}
        {subtext && <span className="text-zinc-400 text-[11px]">{subtext}</span>}
      </div>
    </div>
  );
}
