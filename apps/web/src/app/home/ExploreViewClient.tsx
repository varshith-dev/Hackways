"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { categoryStyle } from "@/lib/eventCategories";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { EventEmptyState, EventSearch, EventTimeline } from "@/components/events/EventTimeline";
import { useEventBrowser, useEventNow, useSavedEvents } from "@/hooks/useEventBrowser";
import { isDiscoveryEvent, isPastEvent, matchesEvent } from "@/lib/eventBrowsing";
import { isEventPubliclyDiscoverable } from "@/lib/api";
import type { EventItem } from "@/lib/types";
import styles from "@/components/events/EventBrowser.module.css";

export default function ExploreViewClient({ initialEvents = [] }: { initialEvents?: EventItem[] }) {
  const { user } = useAuth();
  const { events, loading, error, retry } = useEventBrowser(initialEvents);
  const saved = useSavedEvents(user?.userId);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const now = useEventNow();
  const query = searchOpen ? search : "";
  const searchParams = useSearchParams();
  const category = (searchParams.get("category") || "").trim().toLowerCase();
  const publicEvents = useMemo(() => events.filter((event) => isDiscoveryEvent(event) && isEventPubliclyDiscoverable(event)), [events]);
  const filtered = publicEvents.filter(
    (event) =>
      matchesEvent(event, query) &&
      (!category || (event.category || "").trim().toLowerCase() === category) &&
      now &&
      !isPastEvent(event, now)
  );

  return (
    <div className={styles.page}>
      <AppHeader eventNavigation />
      <main className={styles.main} id="main-content">
        <div className={styles.intro}>
          <h1>Discover</h1>
          <button className={styles.save} aria-label={searchOpen ? "Close search" : "Search events"} aria-expanded={searchOpen} aria-controls="discovery-search" onClick={() => setSearchOpen(!searchOpen)}>
            {searchOpen ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          </button>
        </div>
        <div id="discovery-search" hidden={!searchOpen} className={searchOpen ? styles.filters : undefined}>
          {searchOpen && <EventSearch value={search} onChange={setSearch} />}
        </div>
        {category && (
          <div className={styles.filters}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: categoryStyle(category).bg,
                color: categoryStyle(category).text,
              }}
            >
              {categoryStyle(category).label}
              <Link href="/home" aria-label="Clear category filter" style={{ display: "inline-flex", color: "inherit" }}>
                <X size={14} aria-hidden="true" />
              </Link>
            </span>
          </div>
        )}
        {error && <div role="alert" className={styles.notice}><span>{error}{events.length > 0 && " The information shown may be out of date."}</span><button onClick={retry} disabled={loading}>{loading ? "Retrying..." : "Retry"}</button></div>}
        {saved.error && <p role="alert" className={styles.notice}>{saved.error}</p>}
        <p className="sr-only" role="status" aria-atomic="true">{loading || !now ? "Loading events" : error ? "Events could not be refreshed" : `${filtered.length} events found`}</p>
        <section aria-label="Upcoming events" aria-busy={loading}>
            {(!now || (loading && !events.length)) ? <div aria-hidden="true"><div className={styles.skeleton} /><div className={styles.skeleton} /></div> :
              filtered.length ? <EventTimeline events={filtered} savedIds={saved.ids} onSave={saved.toggle} /> :
                error && !events.length ? <EventEmptyState title="Events unavailable" description="Please retry to load upcoming events." /> :
                <EventEmptyState
                  title={query ? "No events found" : category ? `No ${categoryStyle(category).label.toLowerCase()} events yet` : "No upcoming events"}
                  description={query ? "Try a different search." : category ? "Try another category, or host the first one." : "Check back soon."}
                >
                  {query ? <button className={styles.textLink} onClick={() => setSearch("")}>Show all events</button>
                    : category ? <Link href="/home" className={styles.textLink}>Show all events</Link>
                    : <Link href="/create" className={styles.ctaButton}>Create an event</Link>}
                </EventEmptyState>}
        </section>
      </main>
    </div>
  );
}
