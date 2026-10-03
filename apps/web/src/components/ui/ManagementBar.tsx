"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckSquare,
} from "lucide-react";

export interface ManagementBarAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  onClick: () => void;
  variant?: "default" | "destructive" | "primary";
  disabled?: boolean;
}

export interface ManagementBarProps {
  selectedCount?: number;
  totalCount?: number;
  onClearSelection?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  actions?: ManagementBarAction[];
  primaryAction?: {
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
  };
  className?: string;
}

export function ManagementBar({
  selectedCount = 0,
  totalCount,
  onClearSelection,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  actions = [],
  primaryAction,
  className = "",
}: ManagementBarProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 select-none animate-in fade-in slide-in-from-bottom-4 duration-200 ${className}`}
    >
      <div className="flex items-center gap-2 rounded-full border border-zinc-800/90 bg-zinc-950/95 px-3 py-1.5 text-zinc-200 shadow-2xl shadow-black/50 backdrop-blur-xl ring-1 ring-white/10">
        {/* Selection Indicator */}
        {selectedCount > 0 ? (
          <div className="flex items-center gap-1.5 pl-1 pr-2">
            <span className="flex h-5 items-center rounded-full bg-zinc-800 px-2 text-[11px] font-semibold text-zinc-100">
              {selectedCount} selected
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                title="Clear selection"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pl-2 pr-1 text-xs text-zinc-400 font-medium">
            <CheckSquare size={13} className="text-zinc-500" />
            <span className="text-[11px]">
              {totalCount !== undefined
                ? `${totalCount} item${totalCount === 1 ? "" : "s"}`
                : "Manage"}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {actions.map((action) => {
            const Icon = action.icon;
            const isDestructive = action.variant === "destructive";

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDestructive
                    ? "text-zinc-400 hover:text-red-400 hover:bg-red-950/40 active:bg-red-950/60"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800/80 active:bg-zinc-800"
                }`}
              >
                <Icon size={13} className="shrink-0" />
                <span className="text-[12px]">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-0.5 text-xs text-zinc-400 font-medium">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-1 font-mono text-[11px] tabular-nums text-zinc-300">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}

        {/* Primary CTA */}
        {primaryAction && (
          <>
            <div className="h-4 w-px bg-zinc-800" />
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-zinc-950 shadow-sm hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
            >
              <span>{primaryAction.label}</span>
              {primaryAction.shortcut && (
                <kbd className="flex h-4 min-w-4 items-center justify-center rounded bg-zinc-200 px-1 font-mono text-[9px] font-bold text-zinc-800">
                  {primaryAction.shortcut}
                </kbd>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ManagementBar;
