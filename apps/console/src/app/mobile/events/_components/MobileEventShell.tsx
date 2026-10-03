"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, BarChart3, CalendarDays, ClipboardList, ExternalLink,
  LayoutDashboard, Mail, Megaphone, Menu, Plug, ScanLine,
  Settings, ShieldCheck, Ticket, Users, UsersRound, Wallet, X,
  type LucideIcon,
} from "lucide-react";
import { getEvent, getEventSync } from "@/lib/api";
import { webAppHref } from "@/lib/webAppUrl";
import {
  EVENT_CONSOLE_MODULES, eventConsoleHref, type EventConsoleTab,
} from "@/lib/eventConsoleNavigation";
import type { EventItem } from "@/lib/types";

const moduleIcons: Record<EventConsoleTab, LucideIcon> = {
  overview: LayoutDashboard,
  setup: CalendarDays,
  tickets: Ticket,
  orders: ClipboardList,
  attendees: Users,
  teams: UsersRound,
  "check-in": ScanLine,
  marketing: Megaphone,
  communications: Mail,
  staff: ShieldCheck,
  finance: Wallet,
  analytics: BarChart3,
  integrations: Plug,
  settings: Settings,
};

export default function MobileEventShell({
  eventId,
  initialEvent,
  children,
}: {
  eventId: string;
  initialEvent: EventItem | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [event, setEvent] = useState(initialEvent);
  const routePrefix = "mobile";
  const pathParts = pathname.split("/").filter(Boolean);
  const eventsIdx = pathParts.indexOf("events");
  const tab = eventsIdx !== -1 && pathParts[eventsIdx + 2] ? pathParts[eventsIdx + 2] : "overview";
  const selectedTab = tab === "venue" ? "setup" : tab;
  const activeModule = EVENT_CONSOLE_MODULES.find((item) => item.id === selectedTab);

  useEffect(() => {
    let cancelled = false;
    const updateEvent = () => {
      const cached = getEventSync(eventId);
      if (cached) setEvent(cached);
    };
    getEvent(eventId).then((result) => {
      if (!cancelled && result) setEvent(result);
    }).catch(() => {
      // The dashboard owns data errors and recovery; retain the last known title.
    });
    window.addEventListener("hackways_events_updated", updateEvent);
    return () => {
      cancelled = true;
      window.removeEventListener("hackways_events_updated", updateEvent);
    };
  }, [eventId]);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function closeMenu() {
    dialogRef.current?.close();
  }

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const items = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex="0"]',
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="mobile-event-shell">
      <a className="mobile-console-skip" href="#mobile-event-content">Skip to event content</a>
      <header className="mobile-event-header">
        <button
          ref={triggerRef}
          className="mobile-console-icon-button"
          type="button"
          aria-label="Open event navigation"
          aria-haspopup="dialog"
          aria-controls="mobile-event-navigation"
          aria-expanded={menuOpen}
          onClick={() => {
            dialogRef.current?.showModal();
            setMenuOpen(true);
          }}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <div className="mobile-event-heading">
          <p className="mobile-event-title">{event?.title || "Event management"}</p>
          <p className="mobile-event-module">{activeModule?.label || "Event module"}</p>
        </div>
        <Link
          className="mobile-console-icon-button"
          href={webAppHref(`/events/${encodeURIComponent(event?.slug || eventId)}`)}
          aria-label="View public event"
        >
          <ExternalLink size={19} aria-hidden="true" />
        </Link>
      </header>

      <main id="mobile-event-content" className="mobile-event-content" tabIndex={-1}>
        {children}
      </main>

      <dialog
        ref={dialogRef}
        id="mobile-event-navigation"
        className="mobile-event-drawer"
        aria-labelledby="mobile-event-navigation-title"
        onKeyDown={trapFocus}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setMenuOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
          }
        }}
      >
        <div className="mobile-event-drawer-heading">
          <h2 id="mobile-event-navigation-title">Event navigation</h2>
          <button type="button" className="mobile-console-icon-button" aria-label="Close event navigation" onClick={closeMenu}>
            <X size={21} aria-hidden="true" />
          </button>
        </div>
        <p className="mobile-event-drawer-title">{event?.title || "Event management"}</p>
        <nav className="mobile-event-module-list" aria-label="Event modules">
          {EVENT_CONSOLE_MODULES.map((item) => {
            const Icon = moduleIcons[item.id];
            return (
              <Link
                key={item.id}
                href={`/${routePrefix}/events/${encodeURIComponent(eventId)}/${item.id}`}
                aria-current={selectedTab === item.id ? "page" : undefined}
                onClick={closeMenu}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mobile-event-drawer-footer">
          <Link href={webAppHref("/my-events")} onClick={closeMenu}>
            <ArrowLeft size={19} aria-hidden="true" />
            My events
          </Link>
          <Link href={webAppHref(`/events/${encodeURIComponent(event?.slug || eventId)}`)} onClick={closeMenu}>
            <ExternalLink size={19} aria-hidden="true" />
            View public event
          </Link>
        </div>
      </dialog>
    </div>
  );
}
