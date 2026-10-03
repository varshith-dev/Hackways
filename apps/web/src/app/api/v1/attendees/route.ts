import { NextResponse } from "next/server";
import { serverStore, generateTicketCode } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { assertEventAccess, eventOwnerIds } from "@/lib/tenantAccess";

export async function GET(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  // Non-organizer/admin callers (e.g. attendees browsing the site) get an empty
  // list instead of a 401, so the UI sync in api.ts doesn't log a console error.
  if (session instanceof NextResponse) {
    return NextResponse.json({ attendees: [], count: 0 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;

    if (eventId) {
      const deny = assertEventAccess(session, serverStore.getEventById(eventId));
      if (deny) return deny;
      const attendees = serverStore.getAttendees(eventId);
      return NextResponse.json({ attendees, count: attendees.length });
    }

    // No eventId used to mean "every attendee on the platform" handed to any
    // organizer — a full cross-tenant leak. Scope it to events the caller
    // owns/hosts; only an admin (already gated to platform-wide dashboards
    // like KPI/super-admin elsewhere) gets the unscoped view.
    const attendees = session.role === "admin"
      ? serverStore.getAttendees()
      : serverStore.getEvents()
          .filter((e) => eventOwnerIds(e).includes(session.sub))
          .flatMap((e) => serverStore.getAttendees(e.id));
    return NextResponse.json({ attendees, count: attendees.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attendees" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.eventId || !data.email) {
      return NextResponse.json({ error: "Missing eventId or email" }, { status: 400 });
    }

    const attendee = {
      id: data.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventId: data.eventId,
      name: data.name || data.email.split("@")[0],
      email: data.email,
      phone: data.phone || "",
      tierId: data.tierId || "general",
      tierName: data.tierName || "General Admission",
      ticketCode: data.ticketCode || generateTicketCode(),
      priceFormatted: data.priceFormatted || "₹0",
      registeredAt: data.registeredAt || new Date().toISOString(),
      status: (data.status as any) || "CONFIRMED",
      answers: data.answers || {},
    };

    const saved = serverStore.saveAttendee(attendee);

    // Also ensure user record exists in users store
    serverStore.saveUser({
      id: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(saved.name)}`,
      accountStatus: "ACTIVE",
      verificationStatus: "VERIFIED",
      accountType: "ATTENDEE",
      joinedDate: saved.registeredAt,
      lastActive: saved.registeredAt,
    });

    return NextResponse.json({ attendee: saved, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to register attendee" }, { status: 500 });
  }
}
