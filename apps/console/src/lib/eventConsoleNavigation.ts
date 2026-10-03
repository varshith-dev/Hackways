export const MOBILE_EVENT_MEDIA_QUERY = "(max-width: 767px)";

export const EVENT_CONSOLE_MODULES = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "Event setup" },
  { id: "tickets", label: "Tickets & tiers" },
  { id: "orders", label: "Orders" },
  { id: "attendees", label: "Attendees" },
  { id: "teams", label: "Teams & squads" },
  { id: "check-in", label: "Check-in" },
  { id: "marketing", label: "Marketing" },
  { id: "communications", label: "Communications" },
  { id: "staff", label: "Staff & scanners" },
  { id: "finance", label: "Finance & ledger" },
  { id: "analytics", label: "Analytics" },
  { id: "integrations", label: "Integrations" },
  { id: "settings", label: "Settings" },
] as const;

export type EventConsoleTab = (typeof EVENT_CONSOLE_MODULES)[number]["id"];

export function isEventConsoleTab(tab: string): boolean {
  return tab === "venue" || EVENT_CONSOLE_MODULES.some((item) => item.id === tab);
}

export function eventConsoleHref(
  eventId: string,
  tab: string = "overview",
  mobileView: boolean = false,
  basePrefix?: string,
): string {
  const prefix = basePrefix || (mobileView ? "mobile" : "console");
  return `/${prefix}/events/${encodeURIComponent(eventId)}/${tab}`;
}

export function isEventConsolePath(pathname: string): boolean {
  return /^\/(?:console|mobile|m\/console|m)(?:\/|$)/.test(pathname);
}

/** Replace shell prefix or route to corresponding mobile console path */
export function eventConsoleViewportHref(href: string, mobile: boolean): string {
  const [pathname, suffix = ""] = href.split(/(?=[?#])/);
  const searchAndHash = suffix;

  // Explicit /m and /m/console routes stay on mobile without interception
  if (/^\/m(?:\/|$)/.test(pathname)) return href;

  if (mobile) {
    // Only event consoles have a purpose-built mobile shell (/mobile/events).
    // Everything else keeps the desktop console; its own mobile nav handles it.
    if (pathname.startsWith("/console/events/")) {
      return pathname.replace(/^\/console\/events\//, "/mobile/events/") + searchAndHash;
    }
  } else {
    // If desktop, map legacy /mobile/events to /console/events
    if (pathname.startsWith("/mobile/events/")) {
      return pathname.replace(/^\/mobile(?=\/events\/)/, "/console") + searchAndHash;
    }
  }

  return href;
}


