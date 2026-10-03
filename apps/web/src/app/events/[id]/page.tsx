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

  // Canonical slug redirect: Never promote raw UUID in user-facing URLs
  if (initialEvent && initialEvent.slug && initialEvent.slug.toLowerCase() !== id.toLowerCase()) {
    const { redirect } = await import("next/navigation");
    redirect(`/events/${encodeURIComponent(initialEvent.slug)}`);
  }

  return <EventDetailPageClient id={id} initialEvent={initialEvent} />;
}
