import { NextResponse } from "next/server";
import { serverStore, generateTicketCode } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { verifyRazorpayPayment } from "@/lib/razorpay";
import { assertEventAccess, eventOwnerIds } from "@/lib/tenantAccess";

export async function GET(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;

    if (eventId) {
      const deny = assertEventAccess(session, serverStore.getEventById(eventId));
      if (deny) return deny;
      const orders = serverStore.getOrders(eventId);
      return NextResponse.json({ orders, count: orders.length });
    }

    // No eventId used to mean every order on the platform, to any organizer —
    // scope to events the caller owns/hosts; admin keeps the platform-wide view.
    const orders = session.role === "admin"
      ? serverStore.getOrders()
      : serverStore.getEvents()
          .filter((e) => eventOwnerIds(e).includes(session.sub))
          .flatMap((e) => serverStore.getOrders(e.id));
    return NextResponse.json({ orders, count: orders.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.eventId || data.amount === undefined) {
      return NextResponse.json({ error: "Missing required order parameters" }, { status: 400 });
    }

    const event = serverStore.getEventById(data.eventId);
    const tier = event?.tiers?.find((t) => t.id === data.tierId || t.name === data.tierName);
    const expectedTierCents = tier ? (tier.price_cents || 0) : 0;

    const amountCents = Math.round(Number(data.amount) * 100);
    // If the tier requires payment, ensure client didn't tamper with amount to 0 or lower
    if (expectedTierCents > 0 && amountCents < expectedTierCents) {
      return NextResponse.json({ error: "Invalid order amount for this ticket tier." }, { status: 400 });
    }

    if (amountCents > 0 || expectedTierCents > 0) {
      const paymentId = data.transactionId;
      if (!paymentId) {
        return NextResponse.json({ error: "Payment reference is required for a paid order." }, { status: 402 });
      }
      const settings = serverStore.getSettings();
      const gw = settings.paymentGateways?.razorpay;
      const verifyAmount = Math.max(amountCents, expectedTierCents);
      if (!gw?.keyId || !gw?.keySecret || !(await verifyRazorpayPayment(paymentId, verifyAmount, gw.keyId, gw.keySecret))) {
        return NextResponse.json({ error: "Payment verification failed." }, { status: 402 });
      }
    }

    const order = {
      id: data.id || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventId: data.eventId,
      eventName: data.eventName || "Event Ticket",
      tierId: data.tierId || "general",
      tierName: data.tierName || "General Admission",
      buyerName: data.buyerName || "Customer",
      buyerEmail: data.buyerEmail || "",
      amount: Number(data.amount) || 0,
      ticketCode: data.ticketCode || generateTicketCode(),
      status: (data.status as any) || "COMPLETED",
      createdAt: data.createdAt || new Date().toISOString(),
    };

    const saved = serverStore.saveOrder(order as any);

    // Also register attendee if email is present
    if (order.buyerEmail) {
      serverStore.saveAttendee({
        id: `att_${order.id.slice(4)}`,
        eventId: order.eventId,
        name: order.buyerName,
        email: order.buyerEmail,
        tierId: order.tierId,
        tierName: order.tierName,
        ticketCode: order.ticketCode,
        priceFormatted: order.amount > 0 ? `₹${order.amount}` : "₹0",
        registeredAt: order.createdAt,
        status: "CONFIRMED" as any,
        answers: {},
      });

      serverStore.saveUser({
        id: `usr_${order.id.slice(4)}`,
        name: order.buyerName,
        email: order.buyerEmail,
        accountStatus: "ACTIVE",
        verificationStatus: "VERIFIED",
        accountType: "ATTENDEE",
        joinedDate: order.createdAt,
        lastActive: order.createdAt,
      });
    }

    return NextResponse.json({ order: saved, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save order" }, { status: 500 });
  }
}
