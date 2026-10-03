"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Check, ImagePlus, Link2, LoaderCircle, Trash2, Zap } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getEvent, getEventSync, saveEvent } from "@/lib/api";
import { readImageFile } from "@/lib/imageUpload";
import type { EventItem } from "@/lib/types";
import styles from "./MobileEventSetup.module.css";

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
}

export default function MobileEventSetup({ eventId, initialEvent }: {
  eventId: string; initialEvent: EventItem | null;
}) {
  const { showToast } = useToast();
  const [event, setEvent] = useState<EventItem | null>(initialEvent ?? getEventSync(eventId));
  const [title, setTitle] = useState(event?.title ?? "");
  const [slug, setSlug] = useState(event?.slug ?? toSlug(event?.title ?? ""));
  const [slugEdited, setSlugEdited] = useState(!!event?.slug);
  const [description, setDescription] = useState(event?.description ?? "");
  const [startTime, setStartTime] = useState(event?.start_time ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [banner, setBanner] = useState(event?.banner_url ?? "");
  const [squareBanner, setSquareBanner] = useState(event?.square_banner_url ?? "");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(event?.visibility ?? "PUBLIC");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Track whether the user has typed anything — background refresh must never
  // clobber in-progress edits with older server data.
  const touched = useRef(false);
  const markTouched = () => { touched.current = true; };

  useEffect(() => {
    let cancelled = false;
    getEvent(eventId).then((result) => {
      if (cancelled || !result) return;
      setEvent(result);
      if (!touched.current) {
        setTitle(result.title ?? "");
        setSlug(result.slug ?? toSlug(result.title ?? ""));
        setSlugEdited(!!result.slug);
        setDescription(result.description ?? "");
        setStartTime(result.start_time ?? "");
        setLocation(result.location ?? "");
        setBanner(result.banner_url ?? "");
        setSquareBanner(result.square_banner_url ?? "");
        setVisibility(result.visibility ?? "PUBLIC");
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  const dirty = !!event && (
    title !== event.title || slug !== (event.slug ?? "") || description !== (event.description ?? "") ||
    startTime !== (event.start_time ?? "") || location !== (event.location ?? "") ||
    banner !== (event.banner_url ?? "") || squareBanner !== (event.square_banner_url ?? "") ||
    visibility !== (event.visibility ?? "PUBLIC")
  );

  async function persist(nextStatus?: EventItem["status"]) {
    if (!event || saving || publishing) return;
    if (!title.trim()) { showToast("Enter an event name before saving."); return; }
    if (nextStatus) setPublishing(true); else setSaving(true);
    const updated: EventItem = {
      ...event,
      title: title.trim(),
      slug: slug.trim() || toSlug(title) || event.id,
      description: description.trim(),
      start_time: startTime || event.start_time,
      location: location.trim(),
      banner_url: banner,
      square_banner_url: squareBanner,
      visibility: event.channel_is_private ? "PRIVATE" : visibility,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
    try {
      // Wait for the server to confirm before claiming success — a banner
      // removal or rename that only landed in localStorage is not a save.
      const res = await fetch(`/api/v1/events/${encodeURIComponent(event.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = await res.json().catch(() => ({}));
      const confirmed: EventItem = data.event && typeof data.event === "object" ? data.event : updated;
      saveEvent(confirmed);
      setEvent(confirmed);
      setSlug(confirmed.slug || "");
      touched.current = false;
      showToast(nextStatus === "PUBLISHED" ? "Event published." : "Changes saved.");
    } catch (cause) {
      console.error("Event save failed", cause);
      showToast("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  if (!event) {
    return (
      <div className={styles.missing}>
        <h1>Event not found</h1>
        <p>This event isn&apos;t available on this device.</p>
        <Link href="/my-events">Back to my events</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.field}>
        <label htmlFor="mobile-event-name">Event name</label>
        <input
          id="mobile-event-name"
          value={title}
          maxLength={120}
          onChange={(e) => {
            markTouched();
            setTitle(e.target.value);
            if (!slugEdited) setSlug(toSlug(e.target.value));
          }}
          placeholder="Give your event a name"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="mobile-event-slug">Event link</label>
        <div className={styles.slugRow}>
          <span>/events/</span>
          <input
            id="mobile-event-slug"
            value={slug}
            maxLength={140}
            onChange={(e) => { setSlugEdited(true); setSlug(toSlug(e.target.value)); }}
            placeholder="your-event"
          />
        </div>
        <Link className={styles.previewLink} href={`/events/${encodeURIComponent(slug || event.id)}`}>
          Preview public page
        </Link>
      </div>

      <div className={styles.field}>
        <label htmlFor="mobile-event-description">Description<span>Optional</span></label>
        <textarea
          id="mobile-event-description"
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => { markTouched(); setDescription(e.target.value); }}
          placeholder="What is this event about?"
        />
      </div>

      <section className={styles.section}>
        <h2>Schedule & venue</h2>
        <div className={styles.field}>
          <label htmlFor="mobile-event-start">Date & time</label>
          <input
            id="mobile-event-start"
            type="datetime-local"
            value={startTime ? startTime.slice(0, 16) : ""}
            onChange={(e) => { markTouched(); setStartTime(e.target.value); }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="mobile-event-location">Location</label>
          <input
            id="mobile-event-location"
            value={location}
            maxLength={200}
            onChange={(e) => { markTouched(); setLocation(e.target.value); }}
            placeholder="Venue or online link"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Artwork<span>16:9 banner and 1:1 poster</span></h2>
        <div className={styles.artworkRow}>
          <ArtworkTile
            id="mobile-banner"
            label="Banner"
            ratio="16 / 9"
            value={banner}
            onChange={(v) => { markTouched(); setBanner(v); }}
          />
          <ArtworkTile
            id="mobile-square-banner"
            label="Poster"
            ratio="1 / 1"
            value={squareBanner}
            onChange={(v) => { markTouched(); setSquareBanner(v); }}
          />
        </div>
      </section>

      {!event.channel_is_private && (
        <section className={styles.section}>
          <h2>Visibility</h2>
          <div className={styles.segmented} role="radiogroup" aria-label="Event visibility">
            {(["PUBLIC", "PRIVATE"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={visibility === option}
                className={visibility === option ? styles.segmentActive : ""}
                onClick={() => { markTouched(); setVisibility(option); }}
              >
                {option === "PUBLIC" ? "Public" : "Private"}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            {visibility === "PUBLIC"
              ? "Anyone can find this event on Discover."
              : "Only people with the link can open this event."}
          </p>
        </section>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          disabled={!dirty || saving || publishing}
          onClick={() => persist()}
        >
          {saving ? <LoaderCircle size={16} className={styles.spinner} /> : <Check size={16} />}
          Save draft
        </button>
        {event.status !== "PUBLISHED" && (
          <button
            type="button"
            className={styles.primary}
            disabled={saving || publishing}
            onClick={() => persist("PUBLISHED")}
          >
            {publishing ? <LoaderCircle size={16} className={styles.spinner} /> : <Zap size={16} />}
            Publish
          </button>
        )}
      </div>
    </div>
  );
}

function ArtworkTile({ id, label, ratio, value, onChange }: {
  id: string; label: string; ratio: string; value: string; onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [useLink, setUseLink] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await readImageFile(file));
      setUseLink(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.tile}>
      <button
        type="button"
        className={styles.tileSurface}
        style={{ aspectRatio: ratio }}
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={value ? `Change ${label.toLowerCase()} image` : `Upload ${label.toLowerCase()} image`}
      >
        {busy ? <LoaderCircle size={20} className={styles.spinner} /> : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`${label} preview`} onError={() => setError("This image link couldn't load.")} />
        ) : <ImagePlus size={22} strokeWidth={1.5} />}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label={`${label} image file`}
        onChange={upload}
      />
      <div className={styles.tileMeta}>
        <span>{label}</span>
        <div>
          <button type="button" onClick={() => setUseLink(!useLink)} aria-expanded={useLink} aria-label={`${label} image link`}>
            <Link2 size={13} />
          </button>
          {value && (
            <button type="button" onClick={() => { onChange(""); setError(""); }} aria-label={`Remove ${label.toLowerCase()} image`}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      {useLink && (
        <div className={styles.field}>
          <label htmlFor={id} className="sr-only">{label} image URL</label>
          <input
            id={id}
            type="url"
            value={value.startsWith("data:") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}
      {error && <p className={styles.tileError} role="alert">{error}</p>}
    </div>
  );
}
