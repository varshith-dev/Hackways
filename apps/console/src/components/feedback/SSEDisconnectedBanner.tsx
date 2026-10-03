"use client";

import React from "react";
import { RefreshCwIcon } from "@/components/icons/hugeicons";

export const SSEDisconnectedBanner: React.FC = () => {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        <span>Reconnecting live updates...</span>
      </div>
      <RefreshCwIcon size={12} className="animate-spin text-zinc-400" />
    </div>
  );
};
