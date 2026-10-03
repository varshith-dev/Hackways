import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { eventOwnerIds } from "@/lib/tenantAccess";

export async function GET() {
  const events = serverStore.getEvents();
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  // Any signed-in account can create an event — hosting isn't gated by role.
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await req.json();
    if (!data.id || !data.title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const existing = serverStore.getEventById(data.id);
    if (existing && session.role !== "admin" && !eventOwnerIds(existing).includes(session.sub)) {
      return NextResponse.json({ error: "An event with this ID already exists and you do not have permission to modify it." }, { status: 403 });
    }
    const slug = typeof data.slug === "string" ? data.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/^-+|-+$/g, "") : "";
    if (slug && serverStore.getEvents().some((event) => event.id !== data.id && event.slug === slug)) {
      return NextResponse.json({ error: "This event link is already in use. Edit the link or choose another event name." }, { status: 409 });
    }
    // The primary host is always the authenticated caller, never a client-supplied
    // field, so nobody can claim ownership of an event under someone else's name.
    data.organizer_id = existing?.organizer_id || session.sub;
    data.host_users = existing?.host_users || [{ user_id: session.sub, name: session.name, email: session.email, role: "Primary Host" }];

    const saved = serverStore.saveEvent(data);
    return NextResponse.json({ event: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save event" }, { status: 500 });
  }
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
      if (session.role !== "admin" && !eventOwnerIds(event).includes(session.sub)) {
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
