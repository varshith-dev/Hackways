"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, QrCode, Settings2, Ticket, Users } from "lucide-react";
import { getEvent, getEventSync, getEventAttendees } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/Skeleton";
import type { EventItem } from "@/lib/types";
import styles from "./MobileEventDashboard.module.css";

/** Client loader so events that exist only in this browser's cache (unsynced
 * drafts) render instead of hitting a server-side 404. */
export function MobileEventOverviewLoader({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventItem | null>(() => getEventSync(eventId));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEvent(eventId)
      .then((result) => {
        if (cancelled) return;
        if (result) setEvent(result);
        else if (!getEventSync(eventId)) setFailed(true);
      })
      .catch(() => {
        if (!cancelled && !getEventSync(eventId)) setFailed(true);
      });
    const sync = () => {
      const cached = getEventSync(eventId);
      if (cached) setEvent(cached);
    };
    window.addEventListener("hackways_events_updated", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("hackways_events_updated", sync);
    };
  }, [eventId]);

  if (!event && !failed) return <PageSkeleton rows={3} />;
  if (!event) {
    return (
      <section className={styles.overview}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Event unavailable</h1>
        <p className={styles.hint}>This event isn&apos;t on this device. Check your connection or open it from My events.</p>
        <Link href="/my-events" className={styles.preview}>Back to my events</Link>
      </section>
    );
  }

  const attendees = getEventAttendees(event.id);
  const checkedIn = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const totalCap = event.tiers?.reduce((sum, t) => sum + (t.total_capacity || 0), 0) || event.total_capacity || 0;
  return (
    <MobileEventOverview
      event={event}
      registrations={attendees.length}
      checkedIn={checkedIn}
      remaining={Math.max(0, totalCap - attendees.length)}
    />
  );
}

export default function MobileEventOverview({ event, registrations, checkedIn, remaining }: {
  event: EventItem; registrations: number; checkedIn: number; remaining: number;
}) {
  const base = `/mobile/events/${encodeURIComponent(event.id)}`;
  const artwork = event.square_banner_url || event.banner_url;
  const date = event.start_time ? new Date(event.start_time) : null;
  const formattedDate = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Date not set";
  const draft = event.status === "DRAFT";

  return (
    <section className={styles.overview} aria-label="Event overview">
      <div className={styles.identity}>
        {artwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artwork} alt="" width={56} height={56} />
        )}
        <div><h1>{event.title}</h1><span className={styles.status}>{event.status === "PUBLISHED" ? "Published" : draft ? "Draft" : event.status}</span></div>
      </div>
      <div className={styles.details}>
        <p><CalendarDays size={16} aria-hidden="true" /><span>{formattedDate}</span></p>
        <p><MapPin size={16} aria-hidden="true" /><span>{event.location || "Location not set"}</span></p>
      </div>
      <Link href={`${base}/${draft ? "setup" : "check-in"}`} className={styles.primary}>
        {draft ? <Settings2 size={18} aria-hidden="true" /> : <QrCode size={18} aria-hidden="true" />}
        {draft ? "Finish event setup" : "Open check-in"}<ArrowRight size={16} aria-hidden="true" />
      </Link>
      {registrations > 0 && (
        <dl className={styles.metrics}>
          <div><dt>Registered</dt><dd>{registrations.toLocaleString()}</dd></div>
          <div><dt>Checked in</dt><dd>{checkedIn.toLocaleString()}</dd></div>
        </dl>
      )}
      <nav className={styles.shortcuts} aria-label="Quick event actions">
        <Link href={`${base}/attendees`}><Users size={19} aria-hidden="true" /><span>Attendees</span><ArrowRight size={16} aria-hidden="true" /></Link>
        <Link href={`${base}/tickets`}><Ticket size={19} aria-hidden="true" /><span>Tickets<small>{remaining.toLocaleString()} available</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
        <Link href={`${base}/setup`}><Settings2 size={19} aria-hidden="true" /><span>Event details</span><ArrowRight size={16} aria-hidden="true" /></Link>
      </nav>
      <Link className={styles.preview} href={`/events/${encodeURIComponent(event.slug || event.id)}`}>View event page<ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
  );
}
