import type { EventItem, UserSession } from "./types";
import type { UserTicket } from "./api";

export function eventDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function eventTime(value?: string): string {
  const date = eventDate(value);
  if (!date) return "Time to be announced";
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value ?? "");
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
    ...(hasTimeZone ? { timeZoneName: "short" as const } : {}),
  });
  return hasTimeZone ? time : `${time} (event local time)`;
}

export function isDiscoveryEvent(event: EventItem): boolean {
  return !event.deleted_by_organizer &&
    (event.status === "PUBLISHED" || event.status === "SOLD_OUT") &&
    event.visibility !== "PRIVATE" && !event.channel_is_private;
}

export function isPastEvent(event: EventItem, now: Date): boolean {
  const date = eventDate(event.start_time);
  if (!date) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
}

export function matchesEvent(event: EventItem, search: string): boolean {
  const text = [event.title, event.location, event.city, event.category, event.channel_name, ...(event.hosts ?? [])];
  return text.some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()));
}

export function isEventHost(event: EventItem, user: UserSession): boolean {
  return event.organizer_id === user.userId ||
    !!event.host_users?.some((host) => host.user_id === user.userId ||
      host.email.toLowerCase() === user.email.toLowerCase());
}

export function eventPrice(event: EventItem): string {
  if (event.status === "CANCELLED") return "Cancelled";
  if (event.status === "DRAFT") return "Draft";
  if (event.status === "SOLD_OUT" || (event.tiers.length > 0 && event.tiers.every((tier) => tier.remaining_capacity <= 0))) return "Sold out";
  if (!event.tiers.length) return "Details soon";
  if (event.tiers.some((tier) => tier.price_cents === undefined || !Number.isFinite(tier.price_cents) || tier.price_cents < 0)) {
    return "See ticket details";
  }
  const prices = event.tiers.map((tier) => tier.price_cents!);
  const minimum = Math.min(...prices);
  if (minimum === 0) return prices.every((price) => price === 0) ? "Free" : "Free options";
  return `${prices.length > 1 ? "From " : ""}${new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(minimum / 100)}`;
}

export function ticketEvent(ticket: UserTicket, event?: EventItem): EventItem {
  if (event) return event;
  return {
    id: ticket.event_id, title: ticket.event_title, description: "",
    organizer_id: "", status: "PUBLISHED", total_capacity: 0, tiers: [],
    created_at: ticket.created_at, start_time: ticket.event_start_time, time_display: ticket.event_time_display,
    banner_url: ticket.event_banner, square_banner_url: ticket.event_square_banner,
    location: ticket.event_location, city: ticket.event_city,
  };
}

export function registrationTickets(tickets: UserTicket[]): UserTicket[] {
  const byEvent = new Map<string, UserTicket>();
  for (const ticket of tickets) {
    const current = byEvent.get(ticket.event_id);
    // A cancelled older pass must not hide a later active registration.
    if (!current ||
      (current.status === "CANCELLED" && ticket.status !== "CANCELLED") ||
      ((current.status === "CANCELLED") === (ticket.status === "CANCELLED") &&
        (eventDate(ticket.created_at)?.getTime() ?? 0) > (eventDate(current.created_at)?.getTime() ?? 0))) {
      byEvent.set(ticket.event_id, ticket);
    }
  }
  return [...byEvent.values()];
}

export function groupEvents(events: EventItem[], reverse = false) {
  const groups = new Map<string, { date: Date | null; events: EventItem[] }>();
  const sorted = [...events].sort((a, b) => {
    const left = eventDate(a.start_time)?.getTime();
    const right = eventDate(b.start_time)?.getTime();
    if (left === undefined) return right === undefined ? 0 : 1;
    if (right === undefined) return -1;
    return reverse ? right - left : left - right;
  });
  for (const event of sorted) {
    const date = eventDate(event.start_time);
    const key = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : "unscheduled";
    const group = groups.get(key) ?? { date, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return Array.from(groups, ([key, group]) => ({ key, ...group }));
}
