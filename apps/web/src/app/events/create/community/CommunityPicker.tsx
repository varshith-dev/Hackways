"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useHostingCommunities } from "@/hooks/useHostingCommunities";
import form from "@/components/forms/CreationForm.module.css";
import styles from "../event-create.module.css";

export default function CommunityPicker() {
  const router = useRouter();
  const { user, channels, ready, error, retry } = useHostingCommunities();
  const [selectedId, setSelectedId] = useState("");
  const selected = channels.find((channel) => channel.id === selectedId) ?? channels[0];

  useEffect(() => {
    if (ready && user && !error && channels.length === 0) router.replace("/channels/create?next=event");
  }, [ready, user, error, channels.length, router]);

  return (
    <div className={form.page}>
      <AppHeader eventNavigation />
      <main className={form.main}>
        <Link className={form.back} href="/events/create"><ArrowLeft size={15} />Hosting options</Link>
        <header className={form.heading}><h1>Choose your community</h1><p>Your event will be hosted under this community.</p></header>
        {!ready || (user && !error && !channels.length) ? <p className={styles.hint} role="status">Loading your communities...</p> :
          error ? <p className={styles.inlineError} role="alert">{error} <button type="button" onClick={retry}>Retry</button></p> :
            !user ? <p className={form.signIn}><Link href="/login?redirect=%2Fevents%2Fcreate%2Fcommunity">Sign in</Link> to choose a community.</p> :
              <form onSubmit={(event) => {
                event.preventDefault();
                if (selected) router.push(`/events/create/details?communityId=${encodeURIComponent(selected.id)}`);
              }}>
                <div className={form.field}>
                  <label htmlFor="hosting-community">Community</label>
                  <select id="hosting-community" value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} required>
                    {channels.map((channel) => <option value={channel.id} key={channel.id}>{channel.name}</option>)}
                  </select>
                </div>
                <div className={styles.pickerActions}>
                  <Link className={styles.inlineAction} href="/channels/create?next=event"><Plus size={15} />Create new community</Link>
                  <button type="submit" className={form.submit} disabled={!selected}>Continue<ArrowRight size={16} /></button>
                </div>
              </form>}
      </main>
    </div>
  );
}
