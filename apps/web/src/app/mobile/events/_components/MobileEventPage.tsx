import { notFound, redirect } from "next/navigation";
import MobileEventOverview, { MobileEventOverviewLoader } from "@/components/events/MobileEventOverview";
import MobileEventSetup from "@/components/events/MobileEventSetup";
import {
  MobileEventCheckinTab,
  MobileEventTicketsTab,
  MobileEventAttendeesTab,
  MobileEventOrdersTab,
  MobileEventGenericModuleTab,
} from "@/components/events/MobileEventModules";
import { isEventConsoleTab } from "@/lib/eventConsoleNavigation";
import { serverStore } from "@/lib/serverStore";

export default function MobileEventPage({ id, tab }: { id: string; tab: string }) {
  if (!isEventConsoleTab(tab)) notFound();

  const event = serverStore.getEventById(id);
  if (event && event.slug && id !== event.slug) {
    redirect(`/mobile/events/${encodeURIComponent(event.slug)}/${encodeURIComponent(tab || "overview")}`);
  }
  const attendees = serverStore.getAttendees(id);
  const registrations = attendees.length;
  const checkedIn = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const totalCap = event?.tiers?.reduce((sum, t) => sum + (t.total_capacity || 0), 0) || event?.total_capacity || 0;
  const remaining = Math.max(0, totalCap - registrations);

  if (tab === "overview") {
    if (event) {
      const attendees = serverStore.getAttendees(id);
      const registrations = attendees.length;
      const checkedIn = attendees.filter((a) => a.status === "CHECKED_IN").length;
      const totalCap = event?.tiers?.reduce((sum, t) => sum + (t.total_capacity || 0), 0) || event?.total_capacity || 0;
      const remaining = Math.max(0, totalCap - registrations);
      return (
        <MobileEventOverview
          event={event}
          registrations={registrations}
          checkedIn={checkedIn}
          remaining={remaining}
        />
      );
    }
    // Event not in the file store (e.g. unsynced local draft) — the loader
    // resolves it client-side from cache/API instead of 404ing.
    return <MobileEventOverviewLoader eventId={id} />;
  }

  if (tab === "setup") {
    return <MobileEventSetup eventId={id} initialEvent={event} />;
  }

  if (tab === "check-in") {
    return <MobileEventCheckinTab eventId={id} event={event} />;
  }

  if (tab === "tickets") {
    return <MobileEventTicketsTab eventId={id} event={event} />;
  }

  if (tab === "attendees") {
    return <MobileEventAttendeesTab eventId={id} />;
  }

  if (tab === "orders") {
    return <MobileEventOrdersTab eventId={id} />;
  }

  return <MobileEventGenericModuleTab eventId={id} event={event} tab={tab} />;
}
