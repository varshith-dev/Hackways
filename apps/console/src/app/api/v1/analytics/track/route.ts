import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { DeviceTelemetryEvent } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) {
      return NextResponse.json({ success: false, error: "No payload" }, { status: 400 });
    }

    const payload: Partial<DeviceTelemetryEvent> = JSON.parse(raw);

    // Skip if in console (fail-safe)
    if (payload.pathname && payload.pathname.startsWith("/console")) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const telemetryEvent: DeviceTelemetryEvent = {
      id: payload.id || `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      visitor_id: payload.visitor_id || "anon_unknown",
      session_id: payload.session_id || "sess_unknown",
      pathname: payload.pathname || "/",
      referrer: payload.referrer || "",
      timestamp: payload.timestamp || new Date().toISOString(),
      device: payload.device || "Desktop",
      browser: payload.browser || "Unknown",
      os: payload.os || "Unknown",
      screen_resolution: payload.screen_resolution || "",
      viewport_size: payload.viewport_size || "",
      timezone: payload.timezone || "",
      language: payload.language || "en",
      utm_source: payload.utm_source || undefined,
      utm_medium: payload.utm_medium || undefined,
      utm_campaign: payload.utm_campaign || undefined,
      utm_term: payload.utm_term || undefined,
      utm_content: payload.utm_content || undefined,
      short_link_code: payload.short_link_code || undefined,
    };

    serverStore.recordTelemetry(telemetryEvent);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to record telemetry" },
      { status: 500 }
    );
  }
}

import { requireSession } from "@/lib/serverAuth";

export async function GET(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const stats = serverStore.getTelemetryStats();
  return NextResponse.json({ stats });
}
