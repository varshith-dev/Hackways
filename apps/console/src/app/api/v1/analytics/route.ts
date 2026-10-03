import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function GET(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const events = serverStore.getEvents();
    const attendees = serverStore.getAttendees();
    const orders = serverStore.getOrders();
    const users = serverStore.getUsers();

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
