"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DeviceTelemetryEvent } from "@/lib/types";

function getOrSetVisitorId(): string {
  if (typeof window === "undefined") return "anon_unknown";
  try {
    let vid = localStorage.getItem("hackways_vid");
    if (!vid) {
      vid = `vid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("hackways_vid", vid);
    }
    return vid;
  } catch {
    return "anon_fallback";
  }
}

function getOrSetSessionId(): string {
  if (typeof window === "undefined") return "sess_unknown";
  try {
    let sid = sessionStorage.getItem("hackways_sid");
    if (!sid) {
      sid = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem("hackways_sid", sid);
    }
    return sid;
  } catch {
    return "sess_fallback";
  }
}

function detectDevice(): "Desktop" | "Mobile" | "Tablet" {
  if (typeof navigator === "undefined") return "Desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "Tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua) && !/opr|edge/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/opr\//i.test(ua)) return "Opera";
  return "Browser";
}

function detectOS(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export function GlobalAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>("");

  useEffect(() => {
    // 1. Skip ALL console routes - internal tracking for platform visitors only
    if (!pathname || pathname.startsWith("/console")) {
      return;
    }

    const currentKey = `${pathname}?${searchParams?.toString() || ""}`;
    if (lastTrackedRef.current === currentKey) {
      return; // Deduplicate re-renders on the same path
    }
    lastTrackedRef.current = currentKey;

    try {
      const visitorId = getOrSetVisitorId();
      const sessionId = getOrSetSessionId();

      const utmSource = searchParams?.get("utm_source") || undefined;
      const utmMedium = searchParams?.get("utm_medium") || undefined;
      const utmCampaign = searchParams?.get("utm_campaign") || undefined;
      const utmTerm = searchParams?.get("utm_term") || undefined;
      const utmContent = searchParams?.get("utm_content") || undefined;
      const shortCode = searchParams?.get("sc") || undefined;

      const payload: DeviceTelemetryEvent = {
        id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        visitor_id: visitorId,
        session_id: sessionId,
        pathname,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        timestamp: new Date().toISOString(),
        device: detectDevice(),
        browser: detectBrowser(),
        os: detectOS(),
        screen_resolution: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "",
        viewport_size: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
        timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "",
        language: typeof navigator !== "undefined" ? navigator.language : "en",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        short_link_code: shortCode,
      };

      const body = JSON.stringify(payload);

      // Non-blocking telemetry ingestion via sendBeacon or fetch keepalive
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const sent = navigator.sendBeacon("/api/v1/analytics/track", body);
        if (!sent) {
          fetch("/api/v1/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } else {
        fetch("/api/v1/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Telemetry must never crash or block user page render
    }
  }, [pathname, searchParams]);

  return null;
}
