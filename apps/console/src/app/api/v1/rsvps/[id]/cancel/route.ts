import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rsvpId } = await params;

  // 1. Attempt to proxy to Go rsvp-core
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/rsvps/${rsvpId}/cancel`, {
      method: "POST",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (goRes.ok) {
      const data = await goRes.json();
      serverStore.cancelAttendee(rsvpId);
      return NextResponse.json(data);
    }
  } catch {
    // Go backend not running, fallback to serverStore
  }

  // 2. Standalone serverStore execution
  const success = serverStore.requestAttendeeCancellation(rsvpId);
  if (!success) {
    return NextResponse.json({ error: "RSVP not found or already cancelled" }, { status: 404 });
  }

  const attendee = serverStore.getAttendeeById(rsvpId);

  return NextResponse.json({
    message: "Cancellation request submitted. Spot blocked pending host decision.",
    rsvp: attendee ? {
      id: attendee.id,
      event_id: attendee.eventId,
      user_name: attendee.name,
      user_email: attendee.email,
      status: "BLOCKED",
      cancellation_requested: true,
    } : { id: rsvpId, status: "BLOCKED" },
  });
}
