import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { canAccessAttendee } from "@/lib/serverAuth";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rsvpId } = await params;
  const claimedEmail = new URL(req.url).searchParams.get("email") || undefined;

  // 1. Attempt to proxy to Go rsvp-core (it enforces the same ownership check itself)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/rsvps/${rsvpId}${claimedEmail ? `?email=${encodeURIComponent(claimedEmail)}` : ""}`, {
      headers: { cookie: req.headers.get("cookie") || "" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (goRes.ok || goRes.status === 403) {
      const data = await goRes.json();
      return NextResponse.json(data, { status: goRes.status });
    }
  } catch {
    // Go backend not running, fallback to serverStore
  }

  // 2. Standalone serverStore lookup
  const attendee = serverStore.getAttendeeById(rsvpId);
  if (!attendee) {
    return NextResponse.json({ error: "RSVP not found" }, { status: 404 });
  }
  const event = serverStore.getEventById(attendee.eventId);
  if (!canAccessAttendee(req, attendee.email, event?.organizer_id, claimedEmail)) {
    return NextResponse.json({ error: "You don't have permission to view this RSVP" }, { status: 403 });
  }

  return NextResponse.json({
    id: attendee.id,
    event_id: attendee.eventId,
    tier_id: attendee.tierId,
    user_name: attendee.name,
    user_email: attendee.email,
    status: attendee.status,
    ticket_code: attendee.ticketCode,
    registered_at: attendee.registeredAt,
  });
}
