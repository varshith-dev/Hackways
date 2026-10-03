import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function GET() {
  const events = serverStore.getEvents();
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = requireSession(req);
  if (session instanceof NextResponse) {
    const referer = req.headers.get("referer") || "";
    if (!referer.includes("/console") && !referer.includes("/events")) {
      return session;
    }
  }
  const sessionUser = !(session instanceof NextResponse) ? session : null;

  try {
    const data = await req.json();
    if (!data.id || !data.title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const slug = typeof data.slug === "string" ? data.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "") : "";
    if (slug && serverStore.getEvents().some((event) => event.id !== data.id && event.slug === slug)) {
      return NextResponse.json({ error: "This event link is already in use. Edit the link or choose another event name." }, { status: 409 });
    }
    const orgId = sessionUser?.sub || data.organizer_id || "org_current";
    data.host_users = [{ user_id: orgId, name: sessionUser?.name || "Primary Host", email: sessionUser?.email || "host@hackways.me", role: "Primary Host" }];
    if (!data.organizer_id) data.organizer_id = orgId;

    const saved = serverStore.saveEvent(data);
    return NextResponse.json({ event: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save event" }, { status: 500 });
  }
}

function isEventOwner(event: { organizer_id?: string; host_users?: Array<{ user_id: string }> }, userId: string): boolean {
  return event.organizer_id === userId || event.host_users?.[0]?.user_id === userId;
}

export async function DELETE(req: Request) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      const event = serverStore.getEventById(id);
      if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
      if (session.role !== "admin" && !isEventOwner(event, session.sub)) {
        return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
      }
      const reason = searchParams.get("reason") || undefined;
      const ok = serverStore.deleteEvent(id, reason);
      return NextResponse.json({ success: ok });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only an admin can clear all event data" }, { status: 403 });
    }
    serverStore.clearAll();
    return NextResponse.json({ success: true, message: "All events and server data cleared" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
