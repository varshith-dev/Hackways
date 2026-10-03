import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function POST(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { ticketCode, eventId } = await req.json();
    if (!ticketCode) {
      return NextResponse.json({ error: "Missing ticketCode parameter" }, { status: 400 });
    }

    const result = serverStore.checkInAttendee(ticketCode, eventId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, attendee: result.attendee },
        { status: result.attendee ? 409 : 404 }
      );
    }

    return NextResponse.json({ success: true, message: result.message, attendee: result.attendee });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Check-in processing error" }, { status: 500 });
  }
}
