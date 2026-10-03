import type { EventItem } from "./types";

export async function createEventDraft(event: EventItem): Promise<EventItem> {
  const response = await fetch("/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  const data: { event?: EventItem; error?: unknown } = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Your event couldn't be saved. Please try again.");
  const saved: EventItem = data.event || event;
  try {
    const raw = localStorage.getItem("hackways_events_v7");
    const current: EventItem[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem("hackways_events_v7", JSON.stringify([saved, ...current.filter((item) => item.id !== saved.id && item.slug !== saved.slug)]));
    localStorage.setItem(`hackways_event_${saved.id}`, JSON.stringify(saved));
    if (saved.slug) {
      localStorage.setItem(`hackways_event_${saved.slug.toLowerCase()}`, JSON.stringify(saved));
    }
    if (saved.tiers) {
      localStorage.setItem(`hackways_tiers_${saved.id}`, JSON.stringify(saved.tiers));
    }
  } catch (cause) {
    // The server copy is authoritative; never strip uploaded media to make the cache fit.
    console.warn("Event saved on the server, but browser caching is unavailable", cause);
  }
  window.dispatchEvent(new CustomEvent("hackways_events_updated", { detail: saved }));
  return saved;
}
