import React from "react";
import { serverStore } from "@/lib/serverStore";
import EventRSVPPageClient from "./EventRSVPPageClient";

export default async function EventRSVPPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialEvent = serverStore.getEventById(id);

  return <EventRSVPPageClient id={id} initialEvent={initialEvent} />;
}
