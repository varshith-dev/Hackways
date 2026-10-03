import React, { Suspense } from "react";
import KpiAnalyticsView from "./KpiAnalyticsView";

export const metadata = {
  title: "Platform Analytics & KPI | Event-Tech Console",
  description: "Comprehensive event analytics platform with 18 operational intelligence modules, real-time telemetry, and financial ledgers.",
};

export default function KpiPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-white flex flex-col antialiased">
          <div className="h-16 border-b border-zinc-200 px-6 flex items-center justify-between">
            <div className="h-5 w-32 bg-zinc-100 rounded-full animate-pulse" />
            <div className="h-8 w-28 bg-zinc-100 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 flex">
            <div className="w-64 border-r border-zinc-200 p-4 space-y-4 hidden md:block">
              <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-full bg-zinc-100 rounded-lg animate-pulse" />
                <div className="h-7 w-full bg-zinc-100 rounded-lg animate-pulse" />
                <div className="h-7 w-full bg-zinc-100 rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="flex-1 p-8 space-y-6">
              <div className="h-7 w-48 bg-zinc-100 rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-4 py-4 border-y border-zinc-200">
                <div className="h-12 bg-zinc-100 rounded animate-pulse" />
                <div className="h-12 bg-zinc-100 rounded animate-pulse" />
                <div className="h-12 bg-zinc-100 rounded animate-pulse" />
                <div className="h-12 bg-zinc-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <KpiAnalyticsView />
    </Suspense>
  );
}
