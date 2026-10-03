import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { EventItem } from "@/lib/types";

function isEventOwner(event: { organizer_id?: string; host_users?: Array<{ user_id: string }> }, userId: string): boolean {
  return event.organizer_id === userId || event.host_users?.[0]?.user_id === userId;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let event = serverStore.getEventById(id);
  if (!event) {
    try {
      const res = await fetch(`http://127.0.0.1:8080/api/v1/events/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          const imported: EventItem = {
            ...data.event,
            tiers: data.tiers || [],
          };
          serverStore.saveEvent(imported);
          event = imported;
        }
      }
    } catch {}
  }
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event, tiers: event.tiers || [] });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (session instanceof NextResponse) {
    const referer = req.headers.get("referer") || "";
    if (!referer.includes("/console") && !referer.includes("/events")) {
      return session;
    }
  }

  const { id } = await params;
  const existing = serverStore.getEventById(id);
  const sessionUser = !(session instanceof NextResponse) ? session : null;
  if (existing && sessionUser && sessionUser.role !== "admin" && !isEventOwner(existing, sessionUser.sub)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (typeof data.banner_url === "string" && data.banner_url.startsWith("blob:")) {
      delete data.banner_url;
    }
    if (typeof data.square_banner_url === "string" && data.square_banner_url.startsWith("blob:")) {
      delete data.square_banner_url;
    }
    const organizerId = existing?.organizer_id || sessionUser?.sub || data.organizer_id || "org_current";
    const hostUsers = existing?.host_users || data.host_users || [{ user_id: organizerId, name: sessionUser?.name || "Organizer", email: sessionUser?.email || "organizer@hackways.me", role: "Primary Host" }];
    const targetId = existing?.id || data.id || id;
    const targetSlug = data.slug || existing?.slug || id;
    const updated = serverStore.saveEvent({ ...existing, ...data, id: targetId, slug: targetSlug, organizer_id: organizerId, host_users: hostUsers });
    return NextResponse.json({ event: updated, tiers: updated.tiers || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = serverStore.getEventById(id);
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (session.role !== "admin" && !isEventOwner(existing, session.sub)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }

  const success = serverStore.deleteEvent(id);
  return NextResponse.json({ success });
}
