"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Search, X } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { EventEmptyState, EventSearch, EventTimeline, type EventDetail } from "@/components/events/EventTimeline";
import { useEventBrowser, useEventNow, useRegistrationTickets } from "@/hooks/useEventBrowser";
import type { UserTicket } from "@/lib/api";
import { isPastEvent, matchesEvent, registrationTickets, ticketEvent } from "@/lib/eventBrowsing";
import styles from "@/components/events/EventBrowser.module.css";

const labels: Record<UserTicket["status"], EventDetail> = {
  CONFIRMED: { label: "Going", tone: "confirmed" },
  CHECKED_IN: { label: "Checked in", tone: "confirmed" },
  WAITLIST: { label: "On the waitlist", tone: "pending" },
  PENDING_APPROVAL: { label: "Awaiting approval", tone: "pending" },
  BLOCKED: { label: "Cancellation requested", tone: "pending" },
  CANCELLED: { label: "Registration cancelled", tone: "cancelled" },
};

export default function MyEventsView() {
  const { user, isLoading } = useAuth();
  const { events, loading, error, retry } = useEventBrowser();
  const registrations = useRegistrationTickets(user);
  const [period, setPeriod] = useState<"upcoming" | "past">("upcoming");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const now = useEventNow();
  const query = searchOpen ? search : "";
  const tickets = useMemo(() => registrationTickets(registrations.tickets), [registrations.tickets]);
  const myEvents = tickets.map((ticket) => ticketEvent(ticket, events.find((event) => event.id === ticket.event_id)));
  const shown = myEvents.filter((event) => matchesEvent(event, query) && now &&
    (period === "past" ? isPastEvent(event, now) : !isPastEvent(event, now)));
  const detailMap: Record<string, EventDetail> = {};
  for (const ticket of tickets) {
    const event = events.find((item) => item.id === ticket.event_id);
    detailMap[ticket.event_id] = {
      ...labels[ticket.status],
      href: `/events/${encodeURIComponent(event?.slug || ticket.event_slug || ticket.event_id)}`,
      action: "View event",
    };
    if (event?.status === "CANCELLED") {
      detailMap[ticket.event_id].label = "Event cancelled";
      detailMap[ticket.event_id].tone = "cancelled";
    } else if (event?.status === "DELETED" || event?.deleted_by_organizer) {
      detailMap[ticket.event_id] = { label: "Event no longer available", tone: "cancelled", href: "/profile", action: "Ticket history" };
    }
  }
  const busy = isLoading || registrations.loading || !now;
  const emptyTitle = query ? "No events found" : period === "past" ? "No past events" : "No upcoming events";
  const emptyDescription = query ? "Try a different search." : period === "past" ?
    "Your previous registrations will appear here." : "Events you register for will appear here.";

  return (
    <div className={styles.page}>
      <AppHeader eventNavigation />
      <main className={styles.main} id="main-content">
        <div className={styles.intro}>
          <h1>My events</h1>
          <div className={styles.cardActions}>
            <button className={styles.save} aria-label={searchOpen ? "Close search" : "Search events"}
              aria-expanded={searchOpen} aria-controls="registration-search" onClick={() => setSearchOpen(!searchOpen)}>
              {searchOpen ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
            </button>
            <Link href="/create" className={styles.textLink}><Plus size={16} aria-hidden="true" />Create</Link>
          </div>
        </div>
        <div className={styles.tabs} role="group" aria-label="Event period">
          {(["upcoming", "past"] as const).map((value) => (
            <button className={styles.tab} key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>
              {value === "upcoming" ? "Upcoming" : "Past"}
            </button>
          ))}
        </div>
        <div id="registration-search" hidden={!searchOpen} className={searchOpen ? styles.filters : undefined}>
          {searchOpen && <EventSearch value={search} onChange={setSearch} placeholder="Search your events" />}
        </div>
        {user && error && <div className={styles.notice} role="alert">
          <span>{error}{tickets.length > 0 && " Your saved registration details are still available."}</span>
          <button disabled={loading} onClick={retry}>{loading ? "Retrying..." : "Retry"}</button>
        </div>}
        {registrations.error && <div className={styles.notice} role="alert">
          <span>{registrations.error}</span><button onClick={registrations.retry}>Retry registrations</button>
        </div>}
        <p className="sr-only" role="status" aria-atomic="true">
          {busy ? "Loading your registrations" : !user ? "Sign in to see your registrations" :
            registrations.error ? "Registrations could not be read" : `${shown.length} ${period} registrations found`}
        </p>
        <section aria-label={`${period} events`} aria-busy={busy}>
          {busy ? <div aria-hidden="true"><div className={styles.skeleton} /><div className={styles.skeleton} /></div> :
            !user ? <EventEmptyState artwork="tickets" title="Sign in to see your events" description="Find your registrations saved in this browser.">
              <Link href="/login?redirect=%2Fmy-events" className={styles.ctaButton}>Sign in<ArrowRight size={15} aria-hidden="true" /></Link>
            </EventEmptyState> :
            shown.length ? <EventTimeline events={shown} details={detailMap} reverse={period === "past"} /> :
            registrations.error ? <EventEmptyState artwork="tickets" title="Registrations unavailable" description="Your saved data has not been changed. Retry when browser storage is available." /> :
            <EventEmptyState title={emptyTitle} description={emptyDescription}>
              {query ? <button className={styles.textLink} onClick={() => setSearch("")}>Show all events</button> :
                <Link href="/home" className={styles.ctaButton}>Discover events<ArrowRight size={15} aria-hidden="true" /></Link>}
            </EventEmptyState>}
        </section>
        {user && !busy && <p className={styles.storageNote}>
          Registrations saved in this browser. They do not sync across devices.{" "}
          <Link href="/profile">Manage tickets</Link>
        </p>}
      </main>
    </div>
  );
}
