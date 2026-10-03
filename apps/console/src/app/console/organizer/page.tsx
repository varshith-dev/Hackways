import React from "react";
import { serverStore } from "@/lib/serverStore";
import OrganizerView from "./OrganizerView";

export default async function OrganizerPage() {
  const initialEvents = serverStore.getEvents();
  const initialOrders = serverStore.getOrders();
  const initialAttendees = serverStore.getAttendees();

  return (
    <OrganizerView
      activeTab="overview"
      initialEvents={initialEvents}
      initialOrders={initialOrders}
      initialAttendees={initialAttendees}
    />
  );
}
