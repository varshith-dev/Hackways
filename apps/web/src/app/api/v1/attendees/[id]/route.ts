import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { assertEventAccess } from "@/lib/tenantAccess";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const attendee = serverStore.getAttendeeById(id);
  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }
  const deny = assertEventAccess(session, serverStore.getEventById(attendee.eventId));
  if (deny) return deny;
  return NextResponse.json({ attendee });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const attendee = serverStore.getAttendeeById(id);
  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found or already cancelled" }, { status: 404 });
  }
  const deny = assertEventAccess(session, serverStore.getEventById(attendee.eventId));
  if (deny) return deny;

  const success = serverStore.cancelAttendee(id);
  if (!success) {
    return NextResponse.json({ error: "Attendee not found or already cancelled" }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: "Registration cancelled and capacity restored." });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const attendee = serverStore.getAttendeeById(id);
  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }
  const deny = assertEventAccess(session, serverStore.getEventById(attendee.eventId));
  if (deny) return deny;

  const body = await req.json().catch(() => ({}));
  const action = body?.action; // "approve_cancellation" | "decline_cancellation"

  if (action === "approve_cancellation") {
    const success = serverStore.approveAttendeeCancellation(id);
    if (!success) return NextResponse.json({ error: "Failed to approve cancellation" }, { status: 400 });
    return NextResponse.json({ success: true, message: "Cancellation approved; spot released." });
  } else if (action === "decline_cancellation") {
    const success = serverStore.declineAttendeeCancellation(id);
    if (!success) return NextResponse.json({ error: "Failed to decline cancellation" }, { status: 400 });
    return NextResponse.json({ success: true, message: "Cancellation declined; pass restored." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
