import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { eventOwnerIds } from "@/lib/tenantAccess";
import { EventItem } from "@/lib/types";

export async function GET(
  req: Request,
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

  const session = requireSession(req);
  const isAuthorizedHost = !(session instanceof NextResponse) && (session.role === "admin" || eventOwnerIds(event).includes(session.sub));

  // If event is in DRAFT or DELETED status, only authorized hosts/admin can view it
  if ((event.status === "DRAFT" || (event as any).is_deleted) && !isAuthorizedHost) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Sanitize internal host emails and staff members for general public viewers
  const sanitizedEvent = isAuthorizedHost
    ? event
    : {
        ...event,
        host_users: (event.host_users || []).map((h) => ({
          user_id: h.user_id,
          name: h.name,
          role: h.role,
        })),
        staff_members: undefined,
      };

  return NextResponse.json({ event: sanitizedEvent, tiers: event.tiers || [] });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const existing = serverStore.getEventById(id);
  if (existing && session.role !== "admin" && !eventOwnerIds(existing).includes(session.sub)) {
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
    // Ownership is always derived from the existing record or the authenticated
    // caller — never from the client-supplied body — so a PUT can't reassign an
    // event to another organizer.
    const organizerId = existing?.organizer_id || session.sub;
    const hostUsers = existing?.host_users || data.host_users || [{ user_id: organizerId, name: session.name, email: session.email, role: "Primary Host" }];
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
  if (session.role !== "admin" && !eventOwnerIds(existing).includes(session.sub)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }

  const success = serverStore.deleteEvent(id);
  return NextResponse.json({ success });
}
