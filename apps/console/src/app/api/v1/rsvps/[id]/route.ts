import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rsvpId } = await params;

  // 1. Attempt to proxy to Go rsvp-core
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/rsvps/${rsvpId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (goRes.ok) {
      const data = await goRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Go backend not running, fallback to serverStore
  }

  // 2. Standalone serverStore lookup
  const attendee = serverStore.getAttendeeById(rsvpId);
  if (!attendee) {
    return NextResponse.json({ error: "RSVP not found" }, { status: 404 });
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
