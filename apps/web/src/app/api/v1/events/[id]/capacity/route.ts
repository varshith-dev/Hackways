import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const { searchParams } = new URL(req.url);
  const tierId = searchParams.get("tier_id") || undefined;

  // 1. Attempt to proxy to Go rsvp-core
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/events/${eventId}/capacity${tierId ? `?tier_id=${tierId}` : ""}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (goRes.ok) {
      const data = await goRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Go service unavailable; compute from serverStore
  }

  // 2. Standalone computation from serverStore
  const event = serverStore.getEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const selectedTier = tierId
    ? event.tiers?.find((t) => t.id === tierId)
    : event.tiers?.[0];

  const totalCap = selectedTier ? selectedTier.total_capacity : (event.total_capacity || 0);
  const remainingCap = selectedTier ? (selectedTier.remaining_capacity ?? 0) : totalCap;
  const attendees = serverStore.getAttendees(eventId);
  const confirmedCount = attendees.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN").length;
  const waitlistCount = attendees.filter((a) => a.status === "WAITLIST").length;

  return NextResponse.json({
    event_id: eventId,
    tier_id: selectedTier?.id || "general",
    total_capacity: totalCap,
    remaining_capacity: Math.max(0, remainingCap),
    confirmed_count: confirmedCount,
    waitlist_count: waitlistCount,
    is_sold_out: totalCap > 0 ? remainingCap <= 0 : false,
  });
}
