import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverStore } from "@/lib/serverStore";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";
import EventDashboardView from "../EventDashboardView";

export default async function EventTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  const initialEvent = serverStore.getEventById(id);

  if (initialEvent && initialEvent.slug && initialEvent.slug.toLowerCase() !== id.toLowerCase()) {
    redirect(`/console/events/${encodeURIComponent(initialEvent.slug)}/${encodeURIComponent(tab || "overview")}`);
  }

  // Tenant Isolation: Authenticate session and verify ownership
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(decodeURIComponent(token)) : null;

  if (session && initialEvent) {
    const isOwner =
      session.role === "admin" ||
      initialEvent.organizer_id === session.sub ||
      initialEvent.organizer_id === session.email ||
      (initialEvent.hosts && initialEvent.hosts.includes(session.sub)) ||
      (initialEvent.host_users && initialEvent.host_users.some((h) => h.user_id === session.sub || h.email === session.email));

    if (!isOwner) {
      redirect("/console/organizer?denied=event_not_owned");
    }
  }

  const initialOrders = serverStore.getOrders(initialEvent ? initialEvent.id : id);
  const initialAttendees = serverStore.getAttendees(initialEvent ? initialEvent.id : id);
  const initialTeams = serverStore.getTeams(initialEvent ? initialEvent.id : id);

  return (
    <EventDashboardView
      eventId={initialEvent ? initialEvent.id : id}
      activeTab={tab || "overview"}
      initialEvent={initialEvent}
      initialOrders={initialOrders}
      initialAttendees={initialAttendees}
      initialTeams={initialTeams}
    />
  );
}
