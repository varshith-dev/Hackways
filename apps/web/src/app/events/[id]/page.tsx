import React from "react";
import { serverStore } from "@/lib/serverStore";
import EventDetailPageClient from "./EventDetailPageClient";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let initialEvent = serverStore.getEventById(id);

  if (!initialEvent) {
    try {
      const res = await fetch(`http://127.0.0.1:8080/api/v1/events/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          initialEvent = {
            ...data.event,
            tiers: data.tiers || [],
          };
        }
      }
    } catch {}
  }

  return <EventDetailPageClient id={id} initialEvent={initialEvent} />;
}
