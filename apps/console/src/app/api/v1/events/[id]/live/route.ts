import { serverStore } from "@/lib/serverStore";

const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  // 1. Try to proxy the SSE stream from Go rsvp-core
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/events/${eventId}/live`, {
      headers: { Accept: "text/event-stream" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (goRes.ok && goRes.body) {
      return new Response(goRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }
  } catch {
    // Go backend not running, fallback to standard Next.js SSE stream
  }

  // 2. Standalone Next.js SSE Stream
  const event = serverStore.getEventById(eventId);
  const total = event?.total_capacity || 100;
  const attendees = serverStore.getAttendees(eventId);
  const confirmed = attendees.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN").length;
  const remaining = Math.max(0, total - confirmed);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", event_id: eventId })}\n\n`)
      );

      // Initial capacity update
      controller.enqueue(
        encoder.encode(`event: capacity_update\ndata: ${JSON.stringify({
          event_id: eventId,
          payload: { remaining_capacity: remaining, total_capacity: total },
        })}\n\n`)
      );

      // Periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 10000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
