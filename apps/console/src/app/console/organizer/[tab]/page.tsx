import React from "react";
import { serverStore } from "@/lib/serverStore";
import OrganizerView from "../OrganizerView";

export default async function OrganizerTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const initialEvents = serverStore.getEvents();
  const initialOrders = serverStore.getOrders();
  const initialAttendees = serverStore.getAttendees();

  return (
    <OrganizerView
      activeTab={tab || "overview"}
      initialEvents={initialEvents}
      initialOrders={initialOrders}
      initialAttendees={initialAttendees}
    />
  );
}
