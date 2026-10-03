"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, UserRound, Users } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHostingCommunities } from "@/hooks/useHostingCommunities";
import type { EventItem } from "@/lib/types";
import EventArtworkInput from "./EventArtworkInput";
import { useEventCreation } from "./EventCreationProvider";
import form from "@/components/forms/CreationForm.module.css";
import styles from "./event-create.module.css";

function toSlug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CreateEventForm() {
  const router = useRouter();
  const params = useSearchParams();
  const communityId = params.get("communityId");
  const { user, isLoading } = useAuth();
  const { draft: previousDraft, prepare } = useEventCreation();
  const retained = previousDraft?.channel_id === (communityId || undefined) && previousDraft?.host_users?.[0]?.user_id === user?.userId ? previousDraft : null;
  const { channels, ready, error: channelError, retry } = useHostingCommunities();
  const [title, setTitle] = useState(retained?.title ?? "");
  const [customSlug, setCustomSlug] = useState<string | null>(retained?.slug ?? null);
  const channel = communityId ? channels.find((item) => item.id === communityId) : undefined;
  const hostType = communityId ? "COMMUNITY" : "USER";
  const [banner, setBanner] = useState(retained?.banner_url ?? "");
  const [squareBanner, setSquareBanner] = useState(retained?.square_banner_url ?? "");
  const [uploads, setUploads] = useState({ landscape: false, square: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const pendingId = useRef<string | null>(retained?.id ?? null);
  const slug = customSlug === null ? toSlug(title) : customSlug;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    if (!user) { setError("Sign in before creating an event."); return; }
    if (!title.trim()) { setError("Enter an event name."); return; }
    if (customSlug !== null && (!slug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
      setError("Use lowercase letters, numbers, and single hyphens for the event link.");
      return;
    }
    if (hostType === "COMMUNITY" && !channel) {
      setError("Choose a community or create a new one."); return;
    }
    submitLock.current = true;
    setSaving(true);
    setError("");
    try {
      const id = pendingId.current ?? `ev_${crypto.randomUUID()}`;
      pendingId.current = id;
      const tierId = `tier_${id}`;
      const draft: EventItem = {
        id, slug: slug || id, title: title.trim(), description: "",
        organizer_id: channel?.id ?? user.userId, organizer_type: hostType,
        ...(channel ? {
          channel_id: channel.id, channel_name: channel.name, channel_slug: channel.slug,
          channel_avatar: channel.avatar_url,
          channel_is_private: channel.is_private || channel.visibility === "PRIVATE",
          visibility: channel.is_private || channel.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
        } : {}),
        status: "DRAFT", total_capacity: 100, created_at: new Date().toISOString(),
        tiers: [{ id: tierId, event_id: id, name: "General Admission", total_capacity: 100, remaining_capacity: 100, price_cents: 0, approval_mode: "AUTO_APPROVE" }],
        hosts: [channel?.name || user.name || user.email],
        host_users: [{ user_id: user.userId, name: user.name || user.email, email: user.email, role: "Primary Host" }],
        attendee_count: 0, banner_url: banner, square_banner_url: squareBanner,
      };
      prepare(draft);
      router.push("/events/create/setup");
    } catch (cause) {
      console.error("Unable to create event", cause);
      setError(cause instanceof Error ? cause.message : "Your event couldn't be created. Please try again.");
      submitLock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className={form.page}>
      <AppHeader eventNavigation />
      <main className={`${form.main} ${styles.main}`}>
        <Link href={communityId ? "/events/create/community" : "/events/create"} className={form.back}><ArrowLeft size={15} />{communityId ? "Choose community" : "Hosting options"}</Link>
        <header className={form.heading}><h1>Create an event</h1><p>Start with the essentials. Make it yours.</p></header>
        <div className={styles.hostSummary}>
          {communityId ? <Users size={16} /> : <UserRound size={16} />}
          <span>{communityId ? (channel?.name || (ready ? "Community unavailable" : "Loading community...")) : (user?.name || "You")}</span>
          <Link href={communityId ? "/events/create/community" : "/events/create"}>Change</Link>
        </div>
        {communityId && ready && (channelError || !channel) && <p className={styles.inlineError} role="alert">
          {channelError || "This community isn't available to your account. Choose another community to continue."}
          {channelError && <button type="button" onClick={retry}>Retry</button>}
        </p>}
        <form onSubmit={submit} aria-label="Create an event">
          <fieldset className={form.fields} disabled={saving || isLoading}>
            <legend className="sr-only">Event details</legend>
            <div className={form.field}>
              <label htmlFor="event-name">Event name</label>
              <input id="event-name" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder="Give your event a name" />
              <div className={styles.linkPreview}>
                {customSlug === null ? <><span>/events/{slug || "your-event"}</span><button type="button" onClick={() => setCustomSlug(slug)} aria-label="Edit event link"><Pencil size={14} /></button></> :
                  <><label htmlFor="event-slug" className="sr-only">Event link</label><span>/events/</span><input id="event-slug" value={customSlug} maxLength={140} onChange={(event) => setCustomSlug(event.target.value)} required pattern="[a-z0-9]+(-[a-z0-9]+)*" /><button type="button" onClick={() => setCustomSlug(null)}>Reset</button></>}
              </div>
            </div>

            <section className={styles.artworkSection} aria-label="Event artwork">
              <div className={styles.sectionHeading}><h2>Event artwork</h2><span>Optional</span></div>
              <div className={styles.artworkGrid}>
                <EventArtworkInput kind="landscape" value={banner} onChange={setBanner} onBusy={(busy) => setUploads((current) => ({ ...current, landscape: busy }))} />
                <EventArtworkInput kind="square" value={squareBanner} onChange={setSquareBanner} onBusy={(busy) => setUploads((current) => ({ ...current, square: busy }))} />
              </div>
              <p className={styles.hint}>PNG, JPG, or WebP. Up to 2 MB each.</p>
            </section>
          </fieldset>
          {error && <p className={styles.inlineError} role="alert">{error}</p>}
          <div className={styles.footer}>
            <p>Your event starts as a draft with 100 free places.<br />Set the date, location, and tickets before publishing.</p>
            <button type="submit" className={form.submit} disabled={saving || isLoading || !user || !title.trim() || uploads.landscape || uploads.square || (!!communityId && (!ready || !channel || !!channelError))}>
              Create event<ArrowRight size={16} />
            </button>
          </div>
          {!isLoading && !user && <p className={form.signIn}><Link href="/login?redirect=%2Fevents%2Fcreate">Sign in</Link> to create an event.</p>}
        </form>
      </main>
    </div>
  );
}
