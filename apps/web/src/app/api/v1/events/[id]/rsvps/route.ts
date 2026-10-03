import { NextResponse } from "next/server";
import { serverStore, generateTicketCode } from "@/lib/serverStore";
import { verifyRazorpayPayment } from "@/lib/razorpay";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const body = await req.json();
    const idempHeader = req.headers.get("Idempotency-Key") || body.idempotency_key;

    // 0. Paid tiers must present a genuinely captured payment before any
    // reservation path (Go proxy or serverStore fallback) can mark CONFIRMED.
    const preEvent = serverStore.getEventById(eventId);
    const preTier = preEvent?.tiers?.find((t) => t.id === (body.tier_id || preEvent.tiers?.[0]?.id));
    const preTierPriceCents = preTier?.price_cents || 0;
    if (preTierPriceCents > 0) {
      const paymentId = body.answers?.razorpay_payment_id;
      if (!paymentId) {
        return NextResponse.json({ error: "Payment is required for this ticket tier." }, { status: 402 });
      }
      const settings = serverStore.getSettings();
      const gw = settings.paymentGateways?.razorpay;
      if (!gw?.keyId || !gw?.keySecret) {
        return NextResponse.json({ error: "Payment gateway is not configured." }, { status: 500 });
      }
      const expectedCents = preTierPriceCents + Math.round((preTierPriceCents * (settings.platformFeePercent || 0)) / 100);
      const verified = await verifyRazorpayPayment(paymentId, expectedCents, gw.keyId, gw.keySecret);
      if (!verified) {
        return NextResponse.json({ error: "Payment verification failed." }, { status: 402 });
      }
    }

    // 1. Attempt to proxy to Go rsvp-core if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/events/${eventId}/rsvps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idempHeader ? { "Idempotency-Key": idempHeader } : {}),
        },
        body: JSON.stringify({
          ...body,
          event_id: eventId,
          idempotency_key: idempHeader,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (goRes.ok || goRes.status === 409 || goRes.status === 404 || goRes.status === 410) {
        const data = await goRes.json();
        // Also persist in serverStore for unified frontend indexing
        if (goRes.ok && data?.rsvp) {
          const rsvp = data.rsvp;
          const ev = serverStore.getEventById(eventId);
          const tier = ev?.tiers.find((t) => t.id === rsvp.tier_id);
          serverStore.saveAttendee({
            id: rsvp.id,
            eventId: eventId,
            name: rsvp.user_name || body.user_name || "Attendee",
            email: rsvp.user_email || body.user_email,
            tierId: rsvp.tier_id,
            tierName: tier?.name || "General Admission",
            ticketCode: generateTicketCode(),
            priceFormatted: tier?.price_cents ? `₹${tier.price_cents / 100}` : "₹0",
            registeredAt: rsvp.created_at || new Date().toISOString(),
            status: rsvp.status || "CONFIRMED",
            answers: body.answers || {},
          });
        }
        return NextResponse.json(data, { status: goRes.status });
      }
    } catch {
      // Go service not running or timed out; execute atomic fallback via serverStore
    }

    // 2. Standalone ServerStore Execution
    const normalizedEmail = (body.user_email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    const event = serverStore.getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const existingAttendees = serverStore.getAttendees(eventId);
    const duplicate = existingAttendees.find(
      (a) =>
        a.email.trim().toLowerCase() === normalizedEmail &&
        a.status !== "REFUNDED" &&
        a.status !== "REJECTED" &&
        a.status !== "CANCELLED"
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error: "User has already submitted an RSVP for this event",
          rsvp: {
            id: duplicate.id,
            event_id: eventId,
            tier_id: duplicate.tierId,
            user_id: body.user_id || duplicate.id,
            user_email: duplicate.email,
            user_name: duplicate.name,
            status: duplicate.status,
            created_at: duplicate.registeredAt,
          },
        },
        { status: 409 }
      );
    }

    const tierId = body.tier_id || event.tiers?.[0]?.id || "general";
    const tier = event.tiers?.find((t) => t.id === tierId) || {
      id: tierId,
      event_id: eventId,
      name: "General Admission",
      total_capacity: event.total_capacity || 100,
      remaining_capacity: event.total_capacity || 100,
      price_cents: 0,
      approval_mode: "AUTO_APPROVE" as const,
    };

    const isPaid = Boolean((tier.price_cents && tier.price_cents > 0) || body.answers?.razorpay_payment_id || body.answers?.payment_status === "PAID");
    const isWaitlist = !isPaid && tier.remaining_capacity <= 0;
    const rsvpStatus = isPaid ? "CONFIRMED" : (isWaitlist ? "WAITLIST" : ((tier as any).approval_mode === "REQUIRES_APPROVAL" ? "PENDING_APPROVAL" : "CONFIRMED"));
    const rsvpId = `rsvp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!isWaitlist) {
      tier.remaining_capacity = Math.max(0, tier.remaining_capacity - 1);
      serverStore.saveEvent(event);
    }

    const ticketCode = generateTicketCode();

    const attendee = serverStore.saveAttendee({
      id: rsvpId,
      eventId: eventId,
      name: body.user_name || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      tierId: tier.id,
      tierName: tier.name,
      ticketCode,
      priceFormatted: tier.price_cents ? `₹${tier.price_cents / 100}` : "₹0",
      registeredAt: new Date().toISOString(),
      status: rsvpStatus as any,
      answers: body.answers || {},
    });

    const responsePayload = {
      rsvp: {
        id: attendee.id,
        event_id: eventId,
        tier_id: tier.id,
        user_id: body.user_id || attendee.id,
        user_email: attendee.email,
        user_name: attendee.name,
        status: rsvpStatus,
        created_at: attendee.registeredAt,
        updated_at: attendee.registeredAt,
      },
      message: isWaitlist
        ? "Capacity reached. You have been added to the waitlist."
        : "RSVP confirmed successfully",
    };

    return NextResponse.json(responsePayload, { status: isWaitlist ? 202 : 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process RSVP" }, { status: 500 });
  }
}
