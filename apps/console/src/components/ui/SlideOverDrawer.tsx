"use client";

import React, { useEffect, useRef } from "react";
import { XIcon } from "@/components/icons/hugeicons";

export interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

export function SlideOverDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "lg",
}: SlideOverDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus management: move focus into the panel on open, trap Tab within it,
  // and restore focus to the triggering element on close.
  useEffect(() => {
    if (!isOpen) return;
    const node = drawerRef.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    node.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleTabKey);
    return () => {
      node.removeEventListener("keydown", handleTabKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl sm:max-w-2xl",
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${widthClass} bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 outline-none transition-transform duration-250 ease-out animate-in slide-in-from-right`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition focus-visible:outline-2 focus-visible:outline-zinc-900"
              aria-label="Close panel"
            >
              <XIcon size={18} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-zinc-950 font-heading tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-zinc-500 font-body">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 font-body text-zinc-900">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-zinc-200/80 bg-zinc-50/50 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
