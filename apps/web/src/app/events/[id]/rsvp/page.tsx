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

  if (initialEvent && initialEvent.slug && initialEvent.slug.toLowerCase() !== id.toLowerCase()) {
    const { redirect } = await import("next/navigation");
    redirect(`/events/${encodeURIComponent(initialEvent.slug)}/rsvp`);
  }

  return <EventRSVPPageClient id={id} initialEvent={initialEvent} />;
}
