import React from "react";

export const EventCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-zinc-200 bg-white p-5 animate-pulse">
    <div className="flex justify-between items-center mb-3">
      <div className="h-4 w-24 rounded bg-zinc-200" />
      <div className="h-5 w-20 rounded-full bg-zinc-100" />
    </div>
    <div className="h-5 w-3/4 rounded bg-zinc-200 mb-2" />
    <div className="h-3 w-1/2 rounded bg-zinc-100 mb-4" />
    <div className="h-2 w-full rounded bg-zinc-100" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between py-3 border-b border-zinc-100 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-full bg-zinc-200" />
      <div>
        <div className="h-4 w-32 rounded bg-zinc-200 mb-1" />
        <div className="h-3 w-40 rounded bg-zinc-100" />
      </div>
    </div>
    <div className="h-5 w-16 rounded-full bg-zinc-100" />
  </div>
);
