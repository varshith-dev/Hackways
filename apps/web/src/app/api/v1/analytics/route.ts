import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { assertEventAccess, eventOwnerIds } from "@/lib/tenantAccess";

export async function GET(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;

    let events = serverStore.getEvents();
    let attendees = serverStore.getAttendees();
    let orders = serverStore.getOrders();
    const users = serverStore.getUsers();

    if (eventId) {
      // Single-event view: must own/host it, admin included.
      const deny = assertEventAccess(session, serverStore.getEventById(eventId));
      if (deny) return deny;
      events = events.filter((e) => e.id === eventId);
      attendees = serverStore.getAttendees(eventId);
      orders = serverStore.getOrders(eventId);
    } else if (session.role !== "admin") {
      // No eventId used to mean the whole platform's revenue/orders/attendees,
      // handed to any organizer — the worst of the IDOR gaps. Scope to the
      // caller's own events; only admin keeps the platform-wide rollup.
      const ownEvents = events.filter((e) => eventOwnerIds(e).includes(session.sub));
      const ownEventIds = new Set(ownEvents.map((e) => e.id));
      events = ownEvents;
      attendees = attendees.filter((a) => ownEventIds.has(a.eventId));
      orders = orders.filter((o) => ownEventIds.has(o.eventId));
    }

    const grossRevenue = orders.reduce((sum, o) => sum + (o.amount || (o as any).totalAmount || 0), 0);
    const platformFee = Math.round(grossRevenue * 0.05);
    const paymentFee = Math.round(grossRevenue * 0.02);
    const netRevenue = grossRevenue - platformFee - paymentFee;
    const totalOrders = orders.length;
    const totalTicketsSold = attendees.length || orders.length;
    const checkInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;

    return NextResponse.json({
      summary: {
        grossRevenue,
        netRevenue,
        platformFee,
        paymentFee,
        totalOrders,
        totalTicketsSold,
        checkInCount,
        totalEvents: events.length,
        totalUsers: users.length,
      },
      eventsCount: events.length,
      ordersCount: orders.length,
      attendeesCount: attendees.length,
      usersCount: users.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to compute analytics" }, { status: 500 });
  }
}
