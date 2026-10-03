"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon } from "@/components/icons/hugeicons";

const LINKS = [
  { href: "/home", label: "Discover" },
  { href: "/channels", label: "Communities" },
  { href: "/for-organizers", label: "For Organizers" },
];

/**
 * The hamburger toggle + its collapsible panel, below `lg`.
 *
 * Replaces a nav row that used to render permanently under the header on every
 * small screen — a fixed 44px of chrome gone from every mobile view whether or
 * not anyone wanted it open. This also fixes a real gap the always-on row
 * hid: "Sign in" was `hidden sm:inline` on the header's own row, so below
 * 640px it had no path onto the page at all. It's in the panel now.
 *
 * A client leaf for the same reason SmoothScroll and BrandLoader are: open/
 * closed is real interactive state, so it needs "use client" — but it's the
 * only piece of the header that does, everything else in page.tsx stays a
 * server component.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // A route change (tapping a link) should close the panel, not leave it open
  // behind the next page.
  useEffect(() => {
    setOpen(false);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-caviar transition-colors hover:bg-floatie"
      >
        {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      <nav
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full flex flex-col border-t border-line bg-whiteout px-6 py-3 text-sm font-medium text-neutral-600 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.15)]"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="border-b border-line py-3 transition-colors last:border-b-0 hover:text-caviar"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/login"
          onClick={() => setOpen(false)}
          className="pt-3 font-semibold text-caviar"
        >
          Sign in
        </Link>
      </nav>
    </div>
  );
}
