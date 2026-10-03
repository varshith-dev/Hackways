"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { EventEmptyState } from "@/components/events/EventTimeline";
import { getChannels } from "@/lib/api";
import type { Channel } from "@/lib/types";
import styles from "@/components/events/EventBrowser.module.css";

export default function CommunitiesExplorePage() {
  const [communities, setCommunities] = useState<Channel[]>([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getChannels();
        if (active) { setCommunities(data); setError(""); }
      } catch (cause) {
        console.error("Unable to load communities", cause);
        if (active) setError("Communities couldn't be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [revision]);

  const filtered = communities.filter((community) =>
    community.visibility !== "PRIVATE" && !community.is_private &&
    [community.name, community.description, community.owner_name].some((text) => text.toLowerCase().includes(search.trim().toLowerCase())));

  return (
    <div className={styles.page}>
      <AppHeader eventNavigation />
      <main className={styles.main}>
        <div className={styles.intro}><h1>Communities</h1><div className={styles.cardActions}>
          <button className={styles.save} aria-label={searchOpen ? "Close search" : "Search communities"} aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setSearch(""); }}>{searchOpen ? <X size={18} /> : <Search size={18} />}</button>
          <Link className={styles.textLink} href="/channels/create"><Plus size={16} />Create</Link>
        </div></div>
        {searchOpen && <div className={styles.filters}><label className={styles.search}><span className="sr-only">Search communities</span><Search size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search communities" /></label></div>}
        {error ? <div role="alert" className={styles.notice}><span>{error}</span><button onClick={() => setRevision((value) => value + 1)} disabled={loading}>Retry</button></div> : null}
        {loading ? <p role="status">Loading communities...</p> :
          !filtered.length ? <EventEmptyState artwork="communities" title={search ? "No communities found" : "No communities yet"} description={search ? "Try a different search." : "Communities will appear here when they're created."}>
            {search ? <button className={styles.textLink} onClick={() => setSearch("")}>Clear search</button> : <Link className={styles.ctaButton} href="/channels/create">Create a community</Link>}
          </EventEmptyState> :
            <ul className={styles.communityList}>{filtered.map((community) => <li key={community.id}>
              <Link href={`/channels/${community.slug}`} className={styles.communityRow}>
                {community.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.avatar_url} alt="" width={40} height={40} />
                )}
                <div><h2>{community.name}</h2>{community.description && <p>{community.description}</p>}</div>
              </Link>
            </li>)}</ul>}
      </main>
    </div>
  );
}
