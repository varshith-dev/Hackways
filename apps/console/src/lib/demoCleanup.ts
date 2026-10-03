import type { Channel, EventItem } from "./types";

const seededChannelIds = new Set(["ch_ai_hyderabad", "ch_founders_bay"]);
const stockPhotoIds = [
  "photo-1618005182384-a83a8bd57fbe",
  "photo-1540575467063-178a50c2df87",
  "photo-1534528741775-53994a69daeb",
  "photo-1511578314322-379afb476865",
  "photo-1494790108377-be9c29b29330",
  "photo-1535713875002-d1d0cf377fde",
];

export function withoutStockPhoto(url?: string): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "images.unsplash.com" && stockPhotoIds.some((id) => parsed.pathname === `/${id}`)) return undefined;
  } catch {
    // Local uploads and relative asset paths are not stock URLs.
  }
  return url;
}

export function cleanEventArtwork(event: EventItem): EventItem {
  return {
    ...event,
    banner_url: withoutStockPhoto(event.banner_url),
    square_banner_url: withoutStockPhoto(event.square_banner_url),
    host_avatars: event.host_avatars?.filter((url) => !!withoutStockPhoto(url)),
  };
}

export function cleanSeededChannels(channels: Channel[]): Channel[] {
  return channels.filter((channel) => !seededChannelIds.has(channel.id)).map((channel) => ({
    ...channel,
    avatar_url: withoutStockPhoto(channel.avatar_url),
    banner_url: withoutStockPhoto(channel.banner_url),
    members: channel.members.map((member) => ({ ...member, avatar_url: withoutStockPhoto(member.avatar_url) })),
  }));
}

export function cleanLegacyBrowserData(storage: Storage) {
  const writeIfChanged = (key: string, transform: (value: unknown) => unknown) => {
    const raw = storage.getItem(key);
    if (!raw) return;
    const original: unknown = JSON.parse(raw);
    const cleaned = JSON.stringify(transform(original));
    if (JSON.stringify(original) !== cleaned) storage.setItem(key, cleaned);
  };
  writeIfChanged("hackways_communities_v9", (value) => {
    if (!Array.isArray(value)) throw new Error("Invalid community storage");
    return cleanSeededChannels(value);
  });
  writeIfChanged("hackways_events_v7", (value) => {
    if (!Array.isArray(value)) throw new Error("Invalid event storage");
    return value.map(cleanEventArtwork);
  });
  writeIfChanged("hackways_tickets_v7", (value) => {
    if (!Array.isArray(value)) throw new Error("Invalid ticket storage");
    return value.map((ticket) => ({
      ...ticket,
      event_banner: withoutStockPhoto(ticket.event_banner),
      event_square_banner: withoutStockPhoto(ticket.event_square_banner),
    }));
  });
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith("hackways_event_")) {
      writeIfChanged(key, (value) => {
        if (typeof value === "object" && value !== null && "id" in value && "title" in value) {
          return cleanEventArtwork(value as EventItem);
        }
        return value;
      });
    }
  }
}
