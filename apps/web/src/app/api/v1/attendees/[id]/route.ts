import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const attendee = serverStore.getAttendeeById(id);
  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }
  return NextResponse.json({ attendee });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const success = serverStore.cancelAttendee(id);
  if (!success) {
    return NextResponse.json({ error: "Attendee not found or already cancelled" }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: "Registration cancelled and capacity restored." });
}
