import { NextResponse } from "next/server";
import type { SessionClaims } from "./sessionToken";
import type { EventItem } from "./types";

/** Every user id allowed to manage this event: the organizer plus any co-host
 * in host_users. (The route-local isEventOwner() this replaces only ever
 * checked host_users[0], silently ignoring a second co-host.) */
export function eventOwnerIds(event: Pick<EventItem, "organizer_id" | "host_users">): string[] {
  return [event.organizer_id, ...(event.host_users?.map((h) => h.user_id) || [])].filter(Boolean) as string[];
}

/**
 * Tenant-isolation guard for event-scoped resources (attendees, orders, teams,
 * analytics, check-ins). Returns null if the session may access this event
 * (owner, co-host, or admin), otherwise a ready-to-return NextResponse — same
 * calling convention as requireSession():
 *   const deny = assertEventAccess(session, event); if (deny) return deny;
 */
export function assertEventAccess(
  session: SessionClaims,
  event: EventItem | null,
  opts: { allowAdmin?: boolean } = {}
): NextResponse | null {
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (opts.allowAdmin !== false && session.role === "admin") return null;
  if (eventOwnerIds(event).includes(session.sub)) return null;
  return NextResponse.json({ error: "You don't have permission to access this event" }, { status: 403 });
}
