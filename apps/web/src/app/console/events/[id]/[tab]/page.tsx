import { redirect } from "next/navigation";
import { serverStore } from "@/lib/serverStore";
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
