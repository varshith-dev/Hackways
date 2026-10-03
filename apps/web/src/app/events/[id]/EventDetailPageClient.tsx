"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { getEvent, getEventSync, getExistingRSVP, ExistingRSVPInfo, recordEventPageView } from "@/lib/api";
import { scheduleLoad } from "@/lib/scheduler/progressiveLoader";
import { EventItem, TicketTier } from "@/lib/types";
import { useEventSSE } from "@/hooks/useEventSSE";
import {
  TicketIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  MapPinIcon,
  ArrowRightIcon,
  CalendarIcon,
  SparklesIcon,
  PlusIcon,
  UsersGroupIcon,
} from "@/components/icons/hugeicons";
import { DuplicateRSVPNotice } from "@/components/feedback/DuplicateRSVPNotice";

// In production, console is served under the same origin (hackways.me/console) via reverse proxy.
// In development, it runs on port 3001.
const CONSOLE_APP_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? ""
    : process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:3001");

function MetaIconBadge({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        dark
          ? "bg-zinc-800/80 text-zinc-300 border border-zinc-700/40"
          : "bg-zinc-100 text-zinc-600 border border-zinc-200"
      }`}
    >
      {children}
    </div>
  );
}

function PartnerBrandMark({ name }: { name: string }) {
  const n = name.toLowerCase();

  if (n.includes("vercel")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path d="m12 2 11 19H1z" />
      </svg>
    );
  }

  if (n.includes("openai")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" aria-hidden="true">
        <path d="M12 2a4 4 0 0 1 3.8 2.8A4.5 4.5 0 0 1 20 8.5a4.5 4.5 0 0 1-.8 4.7A4 4 0 0 1 18 19a4.5 4.5 0 0 1-4.2 3A4 4 0 0 1 10 22a4 4 0 0 1-3.8-2.8A4.5 4.5 0 0 1 4 15.5a4.5 4.5 0 0 1 .8-4.7A4 4 0 0 1 6 5a4.5 4.5 0 0 1 4.2-3z" />
      </svg>
    );
  }

  if (n.includes("aws")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" aria-hidden="true">
        <path d="M4 14c3 3 8 4 13 1" />
        <path d="M17 11l2 4-4 .5" />
      </svg>
    );
  }

  if (n.includes("elevenlabs") || n.includes("eleven")) {
    return (
      <span className="font-mono text-xs font-black tracking-tighter shrink-0 opacity-90 select-none">
        III
      </span>
    );
  }

  if (n.includes("langchain")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  }

  if (n.includes("fireworks")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  }

  if (n.includes("openrouter") || n.includes("router")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    );
  }

  if (n.includes("cursor") || n.includes("anysphere")) {
    return (
      <svg
        viewBox="0 0 600 146"
        fill="currentColor"
        className="h-5 sm:h-5.5 w-auto shrink-0 select-none"
        aria-label="Cursor"
      >
        <path d="M 60.66 0.00 L 64.42 0.00 C 82.67 10.62 100.99 21.12 119.25 31.72 C 121.24 33.01 123.54 34.18 124.72 36.34 C 125.34 39.17 125.06 42.10 125.11 44.98 C 125.07 63.63 125.08 82.28 125.11 100.93 C 125.07 102.84 125.14 104.79 124.73 106.68 C 123.53 108.54 121.50 109.62 119.68 110.77 C 104.03 119.72 88.45 128.80 72.85 137.83 C 69.53 139.68 66.36 141.91 62.74 143.17 C 60.51 142.85 58.57 141.57 56.62 140.54 C 40.81 131.22 24.82 122.22 9.00 112.92 C 5.85 111.16 2.79 109.23 0.00 106.93 L 0.00 36.10 C 3.83 32.32 8.81 30.12 13.34 27.33 C 29.10 18.19 44.82 8.98 60.66 0.00 M 5.62 38.04 C 8.28 40.64 11.88 41.83 14.96 43.80 C 30.60 53.06 46.50 61.89 62.05 71.30 C 62.86 75.82 62.50 80.43 62.55 85.00 C 62.57 100.64 62.51 116.29 62.54 131.93 C 62.54 133.69 62.72 135.44 63.01 137.17 C 64.18 135.60 65.29 133.98 66.24 132.27 C 83.07 103.08 99.93 73.92 116.65 44.67 C 117.89 42.62 118.84 40.42 119.57 38.14 C 113.41 37.65 107.23 37.91 101.06 37.87 C 73.71 37.85 46.35 37.85 18.99 37.87 C 14.54 38.02 10.07 37.53 5.62 38.04 Z" />
        <path d="M 482.08 36.18 C 491.46 35.39 501.53 36.04 509.64 41.31 C 518.36 46.44 523.42 56.16 524.93 65.92 C 526.32 76.40 524.82 87.84 518.35 96.49 C 514.18 102.50 507.77 106.75 500.80 108.79 C 491.20 111.52 480.63 111.48 471.34 107.63 C 463.06 104.17 456.49 97.08 453.47 88.66 C 449.12 76.66 449.95 62.59 456.66 51.61 C 462.12 42.83 471.88 37.25 482.08 36.18 M 482.35 49.44 C 475.67 51.18 470.19 56.52 468.04 63.05 C 464.98 72.18 465.85 83.21 472.22 90.76 C 479.72 99.33 494.03 99.77 502.46 92.33 C 508.05 87.62 509.78 79.92 509.85 72.92 C 509.64 65.11 507.01 56.28 499.80 52.20 C 494.67 48.92 488.24 47.93 482.35 49.44 Z" />
        <path d="M 166.17 47.12 C 172.76 40.15 182.56 37.12 191.96 37.00 C 200.61 36.97 209.26 36.99 217.90 37.01 C 217.96 41.42 217.91 45.84 217.98 50.25 C 208.91 50.74 199.82 49.83 190.77 50.61 C 183.46 51.16 176.41 55.84 173.79 62.80 C 171.09 69.74 171.16 77.86 174.24 84.67 C 177.49 91.79 185.34 95.92 192.97 96.04 C 201.28 96.18 209.60 95.98 217.91 96.09 C 217.96 100.47 217.93 104.85 217.98 109.23 C 209.00 109.52 200.02 109.42 191.04 109.30 C 181.99 109.40 172.53 106.55 166.18 99.86 C 159.93 93.99 156.90 85.39 156.37 76.98 C 155.51 66.33 158.19 54.68 166.17 47.12 Z" />
        <path d="M 230.12 37.02 C 235.12 36.98 240.12 37.00 245.13 37.00 C 245.17 51.70 245.01 66.40 245.13 81.10 C 245.15 85.78 246.07 91.00 249.94 94.10 C 256.67 99.27 266.53 98.95 273.59 94.61 C 277.81 91.98 278.81 86.68 278.78 82.07 C 278.74 67.04 278.70 52.02 278.88 37.00 C 283.91 37.00 288.95 36.99 293.99 37.01 C 293.97 52.67 294.08 68.33 293.93 83.98 C 294.00 90.41 292.42 97.16 287.78 101.86 C 281.57 108.74 271.81 110.25 263.01 110.70 C 254.39 110.80 245.07 109.55 238.26 103.78 C 232.88 99.19 230.09 92.09 230.12 85.09 C 229.88 69.07 230.01 53.04 230.12 37.02 Z" />
        <path d="M 308.28 37.04 C 322.53 36.95 336.77 37.02 351.01 37.00 C 357.27 37.03 363.88 39.07 368.05 43.96 C 372.14 49.21 373.79 56.51 371.77 62.92 C 370.19 67.96 366.54 72.33 361.73 74.57 C 366.64 75.59 371.30 79.41 371.40 84.74 C 371.87 92.88 371.87 101.05 372.01 109.21 C 367.00 109.24 361.99 109.37 356.98 109.37 C 356.55 102.49 356.79 95.59 356.47 88.71 C 356.55 84.69 352.84 81.32 348.86 81.63 C 340.39 81.43 331.91 81.62 323.43 81.44 C 323.30 90.70 323.31 99.96 323.37 109.22 C 318.44 109.55 313.49 109.31 308.56 109.47 C 308.39 107.66 308.26 105.83 308.25 104.01 C 308.33 81.69 308.26 59.36 308.28 37.04 M 323.38 49.99 C 323.41 56.35 323.39 62.72 323.28 69.09 C 332.51 69.03 341.77 69.30 350.99 68.86 C 359.94 66.97 359.43 50.91 350.07 50.12 C 341.18 49.81 332.28 50.11 323.38 49.99 Z" />
        <path d="M 391.51 40.44 C 395.50 37.90 400.27 36.77 404.98 36.98 C 417.32 37.00 429.66 36.96 442.00 36.99 C 442.00 41.33 442.00 45.66 441.99 49.99 C 429.65 50.05 417.30 49.91 404.96 49.99 C 400.74 49.80 397.45 54.03 397.61 58.04 C 397.57 61.75 400.55 64.98 404.08 65.80 C 412.49 66.89 421.09 66.46 429.40 68.36 C 435.20 69.63 440.67 73.47 442.83 79.16 C 445.85 87.00 444.96 96.77 439.29 103.22 C 435.47 107.54 429.49 109.11 423.91 109.19 C 410.80 109.53 397.69 109.36 384.58 109.43 C 384.16 105.04 384.32 100.63 384.40 96.24 C 393.92 96.62 403.45 96.26 412.97 96.36 C 416.89 96.27 420.89 96.68 424.76 95.83 C 430.72 93.60 431.08 83.16 424.71 81.21 C 415.14 78.73 404.94 80.14 395.40 77.37 C 391.27 76.11 387.28 73.62 385.19 69.72 C 379.75 60.30 382.03 46.42 391.51 40.44 Z" />
        <path d="M 535.79 36.98 C 549.87 37.02 563.95 36.99 578.03 36.99 C 583.38 36.98 588.95 38.30 593.17 41.73 C 596.72 44.57 598.54 48.92 600.00 53.10 L 600.00 61.31 C 598.27 66.81 594.66 71.63 589.59 74.46 C 593.88 75.92 598.22 79.12 598.76 83.95 C 599.62 92.37 598.97 100.87 599.47 109.31 C 594.37 109.53 589.27 109.59 584.17 109.43 C 583.86 102.58 584.17 95.71 583.90 88.86 C 583.86 85.23 580.87 81.48 577.02 81.71 C 568.30 81.43 559.57 81.79 550.85 81.58 C 550.98 90.80 550.83 100.03 550.96 109.25 C 545.94 109.52 540.92 109.44 535.90 109.59 C 535.58 85.39 535.51 61.18 535.79 36.98 M 550.88 49.95 C 550.96 56.33 550.94 62.71 550.82 69.08 C 558.55 69.11 566.28 69.05 574.01 69.06 C 576.29 69.00 578.78 69.19 580.78 67.83 C 587.03 63.70 585.82 51.63 577.95 50.15 C 568.94 49.71 559.90 50.19 550.88 49.95 Z" />
      </svg>
    );
  }

  if (n.includes("linear")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m4.93 4.93 14.14 14.14" />
      </svg>
    );
  }

  if (n.includes("y combinator") || n === "yc") {
    return (
      <span className="w-4 h-4 rounded-xs bg-amber-500 text-black text-[10px] font-black flex items-center justify-center shrink-0 select-none">
        Y
      </span>
    );
  }

  return (
    <span className="h-4 w-4 rounded-full border border-current/30 flex items-center justify-center text-[9px] font-semibold shrink-0 opacity-80 select-none">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function EventDetailPageClient({
  id,
  initialEvent,
}: {
  id: string;
  initialEvent?: EventItem | null;
}) {
  const { user } = useAuth();
  const isHostOrAdmin = (ev: EventItem | null) =>
    !!user &&
    !!ev &&
    (user.role === "admin" ||
      ev.organizer_id === user.userId ||
      (!!user.email && ev.organizer_id?.toLowerCase() === user.email.toLowerCase()) ||
      (!!ev.hosts && ev.hosts.some((h) => h === user.userId || (!!user.email && h.toLowerCase() === user.email.toLowerCase()))) ||
      !!ev.host_users?.some((h) => h.user_id === user.userId || (!!user.email && h.email?.toLowerCase() === user.email.toLowerCase())));

  // Instant synchronous hydration — Zero loading delay on refresh!
  const [event, setEvent] = useState<EventItem | null>(() => initialEvent || getEventSync(id));
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(() => {
    const initial = initialEvent || getEventSync(id);
    return initial?.tiers?.[0] || null;
  });
  const [autoDarkTheme, setAutoDarkTheme] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<"16/9" | "1/1">(() => {
    const ev = initialEvent || getEventSync(id);
    if (ev?.banner_url) return "16/9";
    if (ev?.square_banner_url) return "1/1";
    return "16/9";
  });
  const [existingRSVP, setExistingRSVP] = useState<ExistingRSVPInfo | null>(null);
  const router = useRouter();

  // Cache initialEvent to localStorage for instant subsequent synchronous reads
  useEffect(() => {
    if (initialEvent && typeof window !== "undefined") {
      try {
        localStorage.setItem(`hackways_event_${initialEvent.id}`, JSON.stringify(initialEvent));
        if (initialEvent.slug) {
          localStorage.setItem(`hackways_event_${initialEvent.slug.toLowerCase()}`, JSON.stringify(initialEvent));
        }
        if (initialEvent.tiers && initialEvent.tiers.length > 0) {
          localStorage.setItem(`hackways_tiers_${initialEvent.id}`, JSON.stringify(initialEvent.tiers));
        }
      } catch {}
    }
  }, [initialEvent]);

  // Sync existing RSVP status
  useEffect(() => {
    const checkRSVP = () => {
      const res = getExistingRSVP(id, user?.email, user?.userId);
      setExistingRSVP(res);
    };
    checkRSVP();
    const handler = () => checkRSVP();
    window.addEventListener("hackways_tickets_updated", handler);
    window.addEventListener("hackways_attendees_updated", handler);
    return () => {
      window.removeEventListener("hackways_tickets_updated", handler);
      window.removeEventListener("hackways_attendees_updated", handler);
    };
  }, [id, user?.email, user?.userId]);

  // Background revalidation — fresh server hydration without blocking initial render.
  // If nothing loaded AND the refresh fails, surface an honest retry state instead
  // of leaving the "Loading event details..." shell up forever.
  const [refreshFailed, setRefreshFailed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRefreshFailed(false);
    // Core event data is above-the-fold and blocking (high priority); the
    // page-view telemetry it triggers is fire-and-forget background work
    // (low priority) — scheduleLoad keeps both off an unmetered burst
    // without changing what either call does or returns.
    scheduleLoad(() => getEvent(id), { priority: "high", cacheKey: `event:${id}`, ttlMs: 30_000 }).then((ev) => {
      if (ev) {
        setEvent(ev);
        scheduleLoad(
          () => recordEventPageView(id, { city: ev.city ? `${ev.city}, India` : "Hyderabad, Telangana" }),
          { priority: "low" }
        );
        if (ev.tiers.length > 0) {
          setSelectedTier((prev) => prev || ev.tiers[0]);
        }
      }
    }).catch(() => setRefreshFailed(true));
  }, [id]);

  // Analyze image luminance and aspect ratio (16:9 1600x900 vs 1:1 1920x1920).
  // Falls back to square_banner_url so events without a 16:9 banner still get
  // correct aspect-ratio/theme detection instead of the "16/9" default.
  const heroImageUrl = event?.banner_url || event?.square_banner_url;
  useEffect(() => {
    if (!heroImageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = heroImageUrl;

    img.onload = () => {
      // 1. Detect acceptable image ratio: 16:9 (1600x900) vs 1:1 (1920x1920)
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        setAspectRatio(ratio > 1.35 ? "16/9" : "1/1");
      }

      // 2. Perceived luminance formula (ITU-R BT.709) for adaptive theme
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 16);
        const imageData = ctx.getImageData(0, 0, 16, 16);
        const data = imageData.data;

        let totalLuminance = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          totalLuminance += luminance;
          count++;
        }

        const avgLuminance = totalLuminance / count;
        // If average luminance is below 128 (out of 255), it's a dark theme image
        setAutoDarkTheme(avgLuminance < 128);
      } catch {
        // Fallback to dark theme
        setAutoDarkTheme(true);
      }
    };
  }, [heroImageUrl]);

  // Real-time live capacity via SSE
  const { isConnected } = useEventSSE({
    eventId: id,
    onUpdate: (payload) => {
      if (payload.tier_id && typeof payload.payload?.remaining_capacity === "number") {
        setEvent((prev) => {
          if (!prev) return prev;
          const updatedTiers = prev.tiers.map((t) =>
            t.id === payload.tier_id ? { ...t, remaining_capacity: payload.payload.remaining_capacity } : t
          );
          return { ...prev, tiers: updatedTiers };
        });
      }
    },
  });

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fafafa] font-sans text-zinc-900">
        <AppHeader theme="light" transparent={false} />
        <div className="mx-auto max-w-4xl px-4 py-36 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-400 shadow-xs">
            <TicketIcon size={24} />
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">{refreshFailed ? "This event couldn't be loaded." : "Loading event details..."}</p>
          {refreshFailed && (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs font-semibold text-zinc-900 underline underline-offset-4"
              >
                Retry
              </button>
              <Link href="/home" className="text-xs text-zinc-500 underline underline-offset-4">
                Browse events
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const tiersList = event.tiers || [];
  const activeTier = selectedTier || tiersList[0] || null;
  const hasCapacityLimit = Boolean((event.total_capacity && event.total_capacity > 0) || (tiersList.some((t) => (t.total_capacity || 0) > 0)));
  const totalCapacity = tiersList.reduce((acc, t) => acc + (t.total_capacity || 0), 0) || (event.total_capacity || 0);
  const remainingCapacity = tiersList.reduce((acc, t) => acc + (t.remaining_capacity || 0), 0);
  const isSoldOut = hasCapacityLimit ? (remainingCapacity <= 0 || event.status === "SOLD_OUT") : (event.status === "SOLD_OUT");

  // Organizer-selected page theme; "auto" keeps the artwork-luminance detection.
  const pageTheme = event.page_theme || "auto";
  const isDarkTheme =
    pageTheme === "auto" ? autoDarkTheme
    : pageTheme === "dark" || pageTheme === "dark-ambient" || pageTheme === "obsidian";
  const isAmbient = pageTheme === "auto" || pageTheme === "light-ambient" || pageTheme === "dark-ambient";
  const canvasColor =
    pageTheme === "obsidian" ? "#000000"
    : pageTheme === "sand" ? "#f5f1e8"
    : isDarkTheme ? "#090a0b" : "#fafafa";
  const fadeColor = canvasColor;



  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative ${
        isDarkTheme
          ? "text-zinc-100 selection:bg-white selection:text-zinc-950"
          : "text-zinc-900 selection:bg-zinc-900 selection:text-white"
      }`}
      style={{ backgroundColor: canvasColor }}
    >
      {/* Ambient atmosphere: strictly contained to the top hero banner header */}
      {isAmbient && (event.banner_url || event.square_banner_url) && (
        <div className="pointer-events-none absolute top-0 inset-x-0 h-[460px] overflow-hidden select-none z-0" aria-hidden="true">
          <div
            className="absolute inset-x-[-10%] -top-24 h-[520px] transform-gpu"
            style={{
              backgroundImage: `url(${event.banner_url || event.square_banner_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              opacity: isDarkTheme ? 0.35 : 0.22,
              filter: "blur(70px) saturate(1.35)",
              transform: "translate3d(0,0,0)",
              maskImage: "radial-gradient(100% 70% at 50% 15%, black 25%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(100% 70% at 50% 15%, black 25%, transparent 80%)",
            }}
          />
          {/* Strict fade-out into canvas before hero content ends */}
          <div
            className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, ${fadeColor} 92%)` }}
          />
        </div>
      )}
      {/* Obsidian gets a quiet vignette instead of a bright wash */}
      {pageTheme === "obsidian" && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden="true"
          style={{ background: "radial-gradient(120% 70% at 50% 25%, transparent 45%, rgba(0,0,0,.6) 100%)" }}
        />
      )}

      {/* Seamlessly Integrated Header with Subtle Glassy Feel and No Border (Locked at Top) */}
      <AppHeader theme={isDarkTheme ? "dark" : "light"} transparent={true} />

      {/* Main container: Centered max-width with clean, balanced, proportional spacing */}
      <main className="relative z-10 flex-1 flex flex-col justify-between w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16">
        <div className="space-y-12 sm:space-y-14">
          {/* 01. Hero Section (Clean, Structured, Minimal) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
            {/* Left Column: Event Information & Primary Actions */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-6 order-2 lg:order-1">
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-heading leading-[1.12] ${
                  isDarkTheme ? "text-white" : "text-zinc-950"
                }`}
              >
                {event.title}
              </h1>

              {/* Action Button: Dedicated RSVP path navigation & Host Manage link */}
              <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                {isHostOrAdmin(event) && (
                  <Link
                    href={`/console/events/${encodeURIComponent(event.slug || event.id)}/overview`}
                    className={`inline-flex items-center justify-center gap-2 rounded-full h-10 px-5 text-xs font-semibold border transition active:scale-[0.98] cursor-pointer ${
                      isDarkTheme
                        ? "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                        : "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50 shadow-2xs"
                    }`}
                  >
                    <span>Manage Event</span>
                  </Link>
                )}

                {!event.tiers || event.tiers.length === 0 ? (
                  <span
                    className={`inline-flex items-center justify-center rounded-full h-10 px-6 text-xs font-semibold select-none ${
                      isDarkTheme
                        ? "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                        : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                    }`}
                  >
                    Tickets coming soon
                  </span>
                ) : (
                  <Link
                    href={`/events/${encodeURIComponent(event.slug || event.id)}/rsvp`}
                    className={`inline-flex items-center justify-center gap-2 rounded-full h-10 px-6 text-xs font-semibold transition active:scale-[0.98] cursor-pointer ${
                      isDarkTheme
                        ? "bg-white text-zinc-950 shadow-md hover:bg-zinc-100"
                        : "bg-zinc-950 text-white shadow-md hover:bg-zinc-800"
                    }`}
                  >
                    <span>
                      {existingRSVP && existingRSVP.status !== "CANCELLED"
                        ? existingRSVP.status === "PENDING_APPROVAL"
                          ? "Application Submitted"
                          : existingRSVP.status === "WAITLIST"
                          ? "Waitlist Status"
                          : existingRSVP.status === "BLOCKED"
                          ? "Cancellation Pending"
                          : "My Ticket"
                        : isSoldOut
                        ? "Join Waitlist"
                        : "RSVP Now"}
                    </span>
                    <ArrowRightIcon size={14} />
                  </Link>
                )}
              </div>

              {/* Event Metadata */}
              <div
                className={`pt-5 border-t space-y-3.5 text-xs sm:text-sm ${
                  isDarkTheme ? "border-zinc-800/80 text-zinc-300" : "border-zinc-200 text-zinc-700"
                }`}
              >
                {/* Date & Time */}
                <div className="flex items-center gap-3">
                  <MetaIconBadge dark={isDarkTheme}>
                    <CalendarIcon size={15} />
                  </MetaIconBadge>
                  <div>
                    <span className={`font-semibold ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                      {event.time_display || event.start_time || "Date to be announced"}
                    </span>
                    {event.end_time && (
                      <span className={isDarkTheme ? "text-zinc-400" : "text-zinc-500"}> — {event.end_time}</span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3">
                  <MetaIconBadge dark={isDarkTheme}>
                    <MapPinIcon size={15} />
                  </MetaIconBadge>
                  <div>
                    <span className={`font-semibold ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                      {event.location || "Venue announced after RSVP"}
                    </span>
                    {event.city && (
                      <span className={isDarkTheme ? "text-zinc-400" : "text-zinc-500"}>, {event.city}</span>
                    )}
                  </div>
                </div>

                {/* Channel / Host Attribution */}
                {event.channel_name && (
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 border ${
                        isDarkTheme ? "border-zinc-700/50" : "border-zinc-200"
                      }`}
                    >
                      {event.channel_avatar ? (
                        <img
                          src={event.channel_avatar}
                          alt={event.channel_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${
                            isDarkTheme ? "bg-zinc-800 text-zinc-200" : "bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {event.channel_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/channels/${event.channel_slug || event.channel_id}`}
                        className={`font-semibold hover:underline ${
                          isDarkTheme ? "text-white" : "text-zinc-950"
                        }`}
                      >
                        {event.channel_name}
                      </Link>
                      <span className={`text-xs ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>
                        Host
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Hero Banner/Poster (Clean, Proportional, Minimal Bounded Container) */}
            <div className="lg:col-span-5 xl:col-span-5 order-1 lg:order-2 flex justify-center lg:justify-end">
              <div
                className={`relative group w-full ${
                  aspectRatio === "16/9"
                    ? "max-w-md aspect-16/9"
                    : "max-w-[340px] aspect-square"
                } rounded-2xl overflow-hidden border ${
                  isDarkTheme
                    ? "bg-zinc-900 border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.5),0_20px_44px_-18px_rgba(0,0,0,0.65)]"
                    : "bg-zinc-100 border-zinc-200 shadow-[0_1px_2px_rgba(44,44,46,0.06),0_20px_44px_-18px_rgba(44,44,46,0.22)]"
                }`}
              >
                {(event.banner_url || event.square_banner_url) && (
                  <div
                    className="absolute -inset-1 rounded-2xl opacity-20 blur-lg pointer-events-none transition duration-500 group-hover:opacity-35"
                    style={{
                      backgroundImage: `url(${event.banner_url || event.square_banner_url})`,
                      backgroundSize: "cover",
                    }}
                    aria-hidden="true"
                  />
                )}
                {(event.banner_url || event.square_banner_url) ? (
                  <img
                    src={event.banner_url || event.square_banner_url}
                    alt={event.title}
                    className="relative z-10 h-full w-full object-cover object-center"
                  />
                ) : (
                  <div
                    className={`relative z-10 h-full w-full flex items-center justify-center ${
                      isDarkTheme ? "bg-zinc-900/60 text-zinc-700" : "bg-zinc-100 text-zinc-300"
                    }`}
                  >
                    <SparklesIcon size={28} aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 02. Event Description Section - Show ONLY if configured */}
          {event.description && event.description.trim() && (
            <section className={`pt-10 border-t ${isDarkTheme ? "border-zinc-800/80" : "border-zinc-200"}`}>
              <div className="space-y-4 max-w-4xl">
                <h2 className={`text-xl sm:text-2xl font-bold font-heading ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                  About the Event
                </h2>
                <div className={`text-sm sm:text-base leading-relaxed whitespace-pre-line ${
                  isDarkTheme ? "text-zinc-300" : "text-zinc-700"
                }`}>
                  {event.description}
                </div>
              </div>
            </section>
          )}

          {/* 03. Schedule Section - Show ONLY if configured */}
          {event.schedule && event.schedule.length > 0 && (
            <section className={`pt-10 border-t ${isDarkTheme ? "border-zinc-800/80" : "border-zinc-200"}`}>
              <div className="space-y-6 max-w-4xl">
                <h2 className={`text-xl sm:text-2xl font-bold font-heading ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                  Schedule
                </h2>
                <ol className="mt-4 space-y-0">
                  {event.schedule.map((item, idx) => (
                    <li key={item.id || idx} className="relative grid grid-cols-[80px_minmax(0,1fr)] sm:grid-cols-[110px_minmax(0,1fr)] gap-4 pb-7 last:pb-0">
                      {idx < event.schedule!.length - 1 && (
                        <span className={`absolute left-[79px] sm:left-[109px] top-5 bottom-0 w-px ${isDarkTheme ? "bg-zinc-800" : "bg-zinc-200"}`} aria-hidden="true" />
                      )}
                      <span className={`text-xs sm:text-sm font-mono tabular-nums pt-0.5 shrink-0 ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>
                        {item.time}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm sm:text-base font-semibold tracking-tight ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                          {item.title}
                        </span>
                        {item.description && (
                          <span className={`block text-xs sm:text-sm leading-relaxed mt-1 ${isDarkTheme ? "text-zinc-400" : "text-zinc-600"}`}>
                            {item.description}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {/* 04. Location & Venue - Show ONLY if configured */}
          {event.location && event.location.trim() && (
            <section className={`pt-10 border-t ${isDarkTheme ? "border-zinc-800/80" : "border-zinc-200"}`}>
              <div className="space-y-5 max-w-4xl">
                <div>
                  <h2 className={`text-xl sm:text-2xl font-bold font-heading ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                    Location & Venue
                  </h2>
                  <p className={`text-xs sm:text-sm mt-1 ${isDarkTheme ? "text-zinc-400" : "text-zinc-600"}`}>
                    {[event.location, event.city].filter(Boolean).join(", ")}
                  </p>
                </div>

                {!/^https?:\/\//i.test(event.location) && (
                  <div className={`overflow-hidden rounded-2xl border ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
                    <iframe
                      title={`Map of ${event.location}`}
                      src={`https://www.google.com/maps?q=${encodeURIComponent([event.location, event.city].filter(Boolean).join(", "))}&output=embed`}
                      className="w-full h-64 sm:h-80 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.location, event.city].filter(Boolean).join(", "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold hover:underline ${
                    isDarkTheme ? "text-zinc-300" : "text-zinc-800"
                  }`}
                >
                  Open in Google Maps <ArrowRightIcon size={13} className="-rotate-45" />
                </a>
              </div>
            </section>
          )}

          {/* 05. FAQs Section - Show ONLY if configured */}
          {event.faqs && event.faqs.length > 0 && (
            <section className={`pt-10 border-t ${isDarkTheme ? "border-zinc-800/80" : "border-zinc-200"}`}>
              <div className="space-y-5 max-w-4xl">
                <h2 className={`text-xl sm:text-2xl font-bold font-heading ${isDarkTheme ? "text-white" : "text-zinc-950"}`}>
                  Frequently Asked Questions
                </h2>
                <div className={`mt-3 divide-y ${isDarkTheme ? "divide-zinc-800/80" : "divide-zinc-200"}`}>
                  {event.faqs.map((faq, idx) => (
                    <details key={faq.id || idx} className="group py-4">
                      <summary className={`flex items-center justify-between gap-4 cursor-pointer list-none text-sm sm:text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden ${
                        isDarkTheme ? "text-zinc-200" : "text-zinc-900"
                      }`}>
                        <span>{faq.question}</span>
                        <PlusIcon
                          size={16}
                          className="shrink-0 transition-transform group-open:rotate-45 text-zinc-500"
                          aria-hidden="true"
                        />
                      </summary>
                      <p className={`mt-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${isDarkTheme ? "text-zinc-400" : "text-zinc-600"}`}>
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 06. Partners & Sponsors - Show ONLY if configured */}
          {event.partners && event.partners.length > 0 && (
            <section className={`pt-10 border-t ${isDarkTheme ? "border-zinc-800/80" : "border-zinc-200"}`}>
              <div className="space-y-4 max-w-4xl">
                <div className="text-xs sm:text-sm font-medium text-zinc-400">
                  {event.partner_label || "Partners & Sponsors"}
                </div>
                <div className="flex items-center gap-7 overflow-x-auto no-scrollbar py-1">
                  {event.partners.map((partner, idx) => {
                    const isWordmark = partner.toLowerCase().includes("cursor");
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap ${
                          isDarkTheme ? "text-zinc-300" : "text-zinc-700"
                        }`}
                      >
                        <PartnerBrandMark name={partner} />
                        {!isWordmark && <span>{partner}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 07. Organizer Contact - Show ONLY if contact details exist */}
          {(event.contact_email || event.contact_phone) && (
            <section className={`pt-10 border-t space-y-4 max-w-4xl ${isDarkTheme ? "border-zinc-800/80" : "border-zinc-200"}`}>
              <div className="text-xs sm:text-sm text-zinc-400 font-medium">Questions? Contact the organizer</div>
              <div className="flex flex-wrap items-center gap-3">
                {event.contact_email && (
                  <a
                    href={`mailto:${event.contact_email}`}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium border transition ${
                      isDarkTheme
                        ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                        : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {event.contact_email}
                  </a>
                )}
                {event.contact_phone && (
                  <a
                    href={`tel:${event.contact_phone.replace(/[^+\d]/g, "")}`}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium border transition ${
                      isDarkTheme
                        ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                        : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {event.contact_phone}
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* 08. Clean Minimal Footer */}
        <footer
          className={`mt-auto pt-16 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            isDarkTheme ? "border-zinc-800/80 text-zinc-500" : "border-zinc-200 text-zinc-500"
          }`}
        >
          <div className="text-xs text-zinc-500">
            Hackways · Event Ticketing Engine
          </div>
          <div className="flex items-center gap-6">
            <Link href="/home" className={`transition ${isDarkTheme ? "hover:text-white" : "hover:text-zinc-950"}`}>
              Events
            </Link>
            <Link href="/" className={`transition ${isDarkTheme ? "hover:text-white" : "hover:text-zinc-950"}`}>
              About
            </Link>
            <Link href="/terms" className={`transition ${isDarkTheme ? "hover:text-white" : "hover:text-zinc-950"}`}>
              Terms
            </Link>
            <Link href="/privacy" className={`transition ${isDarkTheme ? "hover:text-white" : "hover:text-zinc-950"}`}>
              Privacy
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
