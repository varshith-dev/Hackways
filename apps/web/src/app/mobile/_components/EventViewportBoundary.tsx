"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  eventConsoleViewportHref,
  MOBILE_EVENT_MEDIA_QUERY,
} from "@/lib/eventConsoleNavigation";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_EVENT_MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_EVENT_MEDIA_QUERY).matches;
}

function getServerSnapshot(): boolean | null {
  return null;
}

export default function EventViewportBoundary({
  mobile,
  children,
}: {
  mobile: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Only retired /m routes are exempt; "/mobile/**" must not match this check.
  const isLegacyMobileRoute = pathname === "/m" || pathname.startsWith("/m/");

  useEffect(() => {
    if (isLegacyMobileRoute) return;
    if (typeof window !== "undefined" && window.location.search.includes("view=desktop")) return;
    if (isMobile === null || isMobile === mobile) return;
    const { pathname: currentPath, search, hash } = window.location;
    const href = `${currentPath}${search}${hash}`;
    const destination = eventConsoleViewportHref(href, isMobile);
    if (destination !== href) router.replace(destination, { scroll: false });
  }, [isMobile, mobile, pathname, isLegacyMobileRoute, router]);

  // For dedicated /m routes, always render without viewport interception
  if (isLegacyMobileRoute) return children;

  // If user explicitly requested desktop view, allow it
  if (typeof window !== "undefined" && window.location.search.includes("view=desktop")) {
    return children;
  }

  // Only event-specific consoles (/mobile/events or /console/events) have a dedicated mobile shell.
  // All other console paths (e.g. /console/organizer/events) use the responsive layout.
  const isEventPath = pathname.startsWith("/console/events/") || pathname.startsWith("/mobile/events/");
  if (!isEventPath) {
    return children;
  }

  // For event consoles, keep shells matching the viewport width
  if (isMobile === null || isMobile !== mobile) return null;
  return children;
}
