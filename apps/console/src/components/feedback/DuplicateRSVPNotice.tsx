"use client";

import React from "react";
import { CheckCircleIcon } from "@/components/icons/hugeicons";

interface DuplicateRSVPNoticeProps {
  email: string;
}

export const DuplicateRSVPNotice: React.FC<DuplicateRSVPNoticeProps> = ({ email }) => {
  return (
    <div role="status" className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-800">
      <div className="flex items-start gap-2.5">
        <CheckCircleIcon size={16} className="text-zinc-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-zinc-900">
            Already Registered
          </div>
          <p className="mt-1 text-zinc-600 leading-relaxed">
            An RSVP for <strong>{email}</strong> is already confirmed for this event.
          </p>
        </div>
      </div>
    </div>
  );
};
