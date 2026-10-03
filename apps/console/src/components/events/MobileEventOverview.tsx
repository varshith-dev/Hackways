"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, QrCode, Settings2, Ticket, Users } from "lucide-react";
import type { EventItem } from "@/lib/types";
import styles from "./MobileEventDashboard.module.css";

export default function MobileEventOverview({ event, registrations, checkedIn, remaining }: {
  event: EventItem; registrations: number; checkedIn: number; remaining: number;
}) {
  const pathname = usePathname();
  const prefix = pathname?.startsWith("/m/console")
    ? "/m/console"
    : pathname?.startsWith("/m")
    ? "/m"
    : "/mobile";
  const base = `${prefix}/events/${encodeURIComponent(event.id)}`;
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
