"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, CalendarDays, MapPin, Search, Users, X } from "lucide-react";
import type { EventItem } from "@/lib/types";
import { eventDate, eventPrice, eventTime, groupEvents } from "@/lib/eventBrowsing";
import styles from "./EventBrowser.module.css";
import DashboardArtwork, { type DashboardArtworkKind } from "@/components/ui/DashboardArtwork";

export function EventArtwork({ event, wide = false }: { event: EventItem; wide?: boolean }) {
  const url = wide ? event.banner_url || event.square_banner_url : event.square_banner_url || event.banner_url;
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <div className={wide ? styles.widePoster : styles.poster}>
      {url && failedUrl !== url ? (
        // Organizer uploads support remote and data URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)} />
      ) : <div className={styles.fallback}><CalendarDays size={28} strokeWidth={1.25} /><span>Artwork to come</span></div>}
    </div>
  );
}

export interface EventDetail {
  label: string;
  tone?: "confirmed" | "pending" | "cancelled";
  href?: string;
  action?: string;
}

export function EventTimeline({ events, savedIds, onSave, details = {}, reverse = false }: {
  events: EventItem[];
  savedIds?: string[];
  onSave?: (id: string) => void;
  details?: Record<string, EventDetail>;
  reverse?: boolean;
}) {
  return (
    <div>
      {groupEvents(events, reverse).map((group) => (
        <section className={styles.day} key={group.key} aria-label={group.date?.toLocaleDateString("en-US", { dateStyle: "full" }) || "Date to be announced"}>
          <h2 className={styles.date}>
            <strong>{group.date?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) || "Date TBA"}</strong>
            <span>{group.date?.toLocaleDateString("en-US", { weekday: "long" }) || "Stay tuned"}</span>
            {group.date && <span>{group.date.getFullYear()}</span>}
          </h2>
          <div className={styles.dayEvents}>
            {group.events.map((event) => {
              const detail = details[event.id];
              const saved = savedIds?.includes(event.id) ?? false;
              const date = eventDate(event.start_time);
              const host = event.hosts?.join(", ") || event.channel_name;
              return (
                <article className={styles.card} key={event.id}>
                  <div className={styles.cardBody}>
                    <div className={styles.details}>
                      <p className={styles.time}>{date ? <time dateTime={event.start_time}>{eventTime(event.start_time)}</time> : event.time_display || "Time to be announced"}</p>
                      <h3 className={styles.title}><Link className={styles.stretched} href={`/events/${encodeURIComponent(event.slug || event.id)}`}>{event.title}</Link></h3>
                      {host && <p className={styles.meta}><Users size={14} aria-hidden="true" />By {host}</p>}
                      <p className={styles.meta}><MapPin size={14} aria-hidden="true" />{[event.location, event.city && event.city !== event.location ? event.city : undefined].filter(Boolean).join(", ") || "Location to be announced"}</p>
                    </div>
                    <Link href={`/events/${encodeURIComponent(event.slug || event.id)}`} aria-label={`View ${event.title}`} tabIndex={-1}><EventArtwork event={event} /></Link>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.status} data-tone={detail?.tone}>{detail?.label || eventPrice(event)}</span>
                    <div className={styles.cardActions}>
                      {detail?.href && <Link className={styles.textLink} href={detail.href}>{detail.action}<ArrowUpRight size={14} aria-hidden="true" /></Link>}
                      {onSave && <button className={styles.save} aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`} aria-pressed={saved} onClick={() => onSave(event.id)} title={saved ? "Remove from saved events" : "Save event"}>
                        <Bookmark size={17} fill={saved ? "currentColor" : "none"} strokeWidth={1.7} aria-hidden="true" />
                      </button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function EventSearch({ value, onChange, placeholder = "Search events, places, or hosts" }: {
  value: string; onChange: (value: string) => void; placeholder?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  return (
    <div className={styles.search}>
      <Search size={18} strokeWidth={1.5} aria-hidden="true" />
      <input ref={input} aria-label={placeholder} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && <button className={styles.clearSearch} aria-label="Clear search" onClick={() => { onChange(""); input.current?.focus(); }}><X size={16} aria-hidden="true" /></button>}
    </div>
  );
}

export function EventEmptyState({ title, description, children, artwork = "events" }: { title: string; description: string; children?: React.ReactNode; artwork?: DashboardArtworkKind }) {
  return <div className={styles.empty}><DashboardArtwork kind={artwork} size={112} /><h2>{title}</h2><p>{description}</p>{children}</div>;
}
