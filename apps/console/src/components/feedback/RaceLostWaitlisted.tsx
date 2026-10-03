"use client";

import React from "react";
import { AlertCircleIcon } from "@/components/icons/hugeicons";

interface RaceLostWaitlistedProps {
  position: number;
  tierName: string;
}

export const RaceLostWaitlisted: React.FC<RaceLostWaitlistedProps> = ({ position, tierName }) => {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-800">
      <div className="flex items-start gap-2.5">
        <AlertCircleIcon size={16} className="text-zinc-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-zinc-900">
            Added to Waitlist
          </div>
          <p className="mt-1 text-zinc-600 leading-relaxed">
            The remaining spots for <strong>{tierName}</strong> were filled just before your submission. You are <strong>#{position}</strong> on the waitlist.
          </p>
          <div className="mt-1 text-[11px] text-zinc-500">
            If a spot becomes available, you will be notified automatically.
          </div>
        </div>
      </div>
    </div>
  );
};
