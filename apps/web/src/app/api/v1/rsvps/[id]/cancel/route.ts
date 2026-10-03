import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { canAccessAttendee } from "@/lib/serverAuth";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rsvpId } = await params;
  const body = await req.json().catch(() => ({}) as { email?: string });
  const claimedEmail = typeof body?.email === "string" ? body.email : undefined;

  // 1. Attempt to proxy to Go rsvp-core (it enforces the same ownership check itself)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/rsvps/${rsvpId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
      body: JSON.stringify({ email: claimedEmail }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (goRes.ok || goRes.status === 403) {
      const data = await goRes.json();
      if (goRes.ok) serverStore.cancelAttendee(rsvpId);
      return NextResponse.json(data, { status: goRes.status });
    }
  } catch {
    // Go backend not running, fallback to serverStore
  }

  // 2. Standalone serverStore execution
  const attendee = serverStore.getAttendeeById(rsvpId);
  if (!attendee) {
    return NextResponse.json({ error: "RSVP not found or already cancelled" }, { status: 404 });
  }
  const event = serverStore.getEventById(attendee.eventId);
  if (!canAccessAttendee(req, attendee.email, event?.organizer_id, claimedEmail)) {
    return NextResponse.json({ error: "You don't have permission to cancel this RSVP" }, { status: 403 });
  }

  const success = serverStore.requestAttendeeCancellation(rsvpId, body?.reason);
  if (!success) {
    return NextResponse.json({ error: "RSVP not found or already cancelled" }, { status: 404 });
  }

  return NextResponse.json({
    message: "Cancellation request submitted. Your pass is blocked pending event host decision.",
    rsvp: {
      id: attendee.id,
      event_id: attendee.eventId,
      user_name: attendee.name,
      user_email: attendee.email,
      status: "BLOCKED",
      cancellation_requested: true,
    },
  });
}
