import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverStore } from "@/lib/serverStore";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";
import { eventOwnerIds } from "@/lib/tenantAccess";
import OrganizerView from "./OrganizerView";

export default async function OrganizerPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(decodeURIComponent(token)) : null;

  if (!session) {
    redirect("/login?redirect=%2Fconsole%2Forganizer");
  }

  const allEvents = serverStore.getEvents();
  // Filter events: Organizers strictly see only their own events.
  const myEvents = allEvents.filter((e) =>
    eventOwnerIds(e).includes(session.sub) ||
    (e.organizer_id && (e.organizer_id === session.sub || e.organizer_id.toLowerCase() === session.email.toLowerCase())) ||
    (e.hosts && e.hosts.some((h) => h === session.sub || h.toLowerCase() === session.email.toLowerCase())) ||
    (e.host_users && e.host_users.some((h) => h.user_id === session.sub || (session.email && h.email?.toLowerCase() === session.email.toLowerCase())))
  );

  const ownedEventIds = new Set(myEvents.map((e) => e.id));
  const initialOrders = serverStore.getOrders().filter((o) => ownedEventIds.has(o.eventId));
  const initialAttendees = serverStore.getAttendees().filter((a) => ownedEventIds.has(a.eventId));

  return (
    <OrganizerView
      activeTab="overview"
      initialEvents={myEvents}
      initialOrders={initialOrders}
      initialAttendees={initialAttendees}
    />
  );
}
