"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { webAppHref } from "@/lib/webAppUrl";

/** The landing page's own navbar is a server component (see page.tsx), so the
 * one piece of it that depends on auth state — Sign in vs. the account menu —
 * lives in this single client leaf instead of converting the whole navbar. */
export default function NavAuthMenu() {
  const { user, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (isLoading) {
    return <span className="hidden h-5 w-16 animate-pulse rounded bg-[#34349C]/10 lg:inline-block" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href={webAppHref("/login")}
        className="hidden text-sm font-medium text-[#34349C] transition-opacity hover:opacity-70 lg:inline"
      >
        Sign in
      </Link>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="relative hidden lg:block" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-1.5 text-sm font-medium text-[#34349C] transition-opacity hover:opacity-70"
      >
        {firstName}
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-lg border border-line bg-white shadow-[0_8px_24px_-8px_rgba(20,20,24,.12)]"
        >
          <Link
            href={webAppHref("/create")}
            onClick={() => setOpen(false)}
            className="flex items-center px-3.5 py-2.5 text-xs font-medium text-caviar transition hover:bg-floatie"
          >
            Create event
          </Link>
          {(user.role === "organizer" || user.role === "admin") && (
            <Link
              href="/console"
              onClick={() => setOpen(false)}
              className="flex items-center px-3.5 py-2.5 text-xs font-medium text-caviar transition hover:bg-floatie"
            >
              Console
            </Link>
          )}
          <Link
            href={webAppHref("/settings/account")}
            onClick={() => setOpen(false)}
            className="flex items-center px-3.5 py-2.5 text-xs font-medium text-caviar transition hover:bg-floatie"
          >
            Manage account
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center border-t border-line px-3.5 py-2.5 text-left text-xs font-medium text-neutral-600 transition hover:bg-floatie hover:text-caviar"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
