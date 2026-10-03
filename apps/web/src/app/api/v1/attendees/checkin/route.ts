import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { assertEventAccess } from "@/lib/tenantAccess";

export async function POST(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { ticketCode, eventId } = await req.json();
    if (!ticketCode) {
      return NextResponse.json({ error: "Missing ticketCode parameter" }, { status: 400 });
    }
    // eventId used to be optional, letting a ticket code match (and expose,
    // and check in) an attendee of an event the scanning organizer doesn't
    // even own. Require it and gate it like every other event-scoped route.
    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId parameter" }, { status: 400 });
    }
    const deny = assertEventAccess(session, serverStore.getEventById(eventId));
    if (deny) return deny;

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
