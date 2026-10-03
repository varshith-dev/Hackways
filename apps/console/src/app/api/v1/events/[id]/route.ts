import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

function isEventOwner(event: { organizer_id?: string; host_users?: Array<{ user_id: string }> }, userId: string): boolean {
  return event.organizer_id === userId || event.host_users?.[0]?.user_id === userId;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = serverStore.getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event, tiers: event.tiers || [] });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = serverStore.getEventById(id);
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (session.role !== "admin" && !isEventOwner(existing, session.sub)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }

  try {
    const data = await req.json();
    // Ownership can't be reassigned through an edit payload.
    const updated = serverStore.saveEvent({ ...data, id, organizer_id: existing.organizer_id, host_users: existing.host_users });
    return NextResponse.json({ event: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = serverStore.getEventById(id);
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (session.role !== "admin" && !isEventOwner(existing, session.sub)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }

  const success = serverStore.deleteEvent(id);
  return NextResponse.json({ success });
}
