"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEventCreation } from "@/app/events/create/EventCreationProvider";
import { useHostingCommunities } from "@/hooks/useHostingCommunities";
import { createChannel } from "@/lib/api";
import { createEventDraft } from "@/lib/createEventDraft";
import { readImageFile } from "@/lib/imageUpload";
import type { EventItem } from "@/lib/types";
import type { SelectOption } from "@/components/forms/Select";
import DateTimePicker from "@/components/forms/DateTimePicker";
import LocationInput from "@/components/forms/LocationInput";
import Select from "@/components/forms/Select";
import form from "@/components/forms/CreationForm.module.css";
import toggle from "./create.module.css";

function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateDetailsPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();
  const { prepare } = useEventCreation();
  const { channels, retry: reloadCommunities } = useHostingCommunities();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?redirect=%2Fcreate");
  }, [isLoading, user, router]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [eventType, setEventType] = useState<"FREE" | "PAID" | null>(null);
  const [price, setPrice] = useState("");
  const [eventMode, setEventMode] = useState<"IN_PERSON" | "ONLINE" | null>(null);
  const [channelChoice, setChannelChoice] = useState("");
  const [showNewCommunity, setShowNewCommunity] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [creatingCommunity, setCreatingCommunity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedChannel = channels.find((c) => c.id === channelChoice) || null;
  const channelOptions: SelectOption[] = [
    { id: "", label: "Just me" },
    ...channels.map((c) => ({ id: c.id, label: c.name })),
  ];

  async function handleCreateCommunity() {
    if (!user || !newCommunityName.trim() || creatingCommunity) return;
    setCreatingCommunity(true);
    setError("");
    try {
      const channel = await createChannel({ name: newCommunityName.trim(), description: "", owner_id: user.userId, owner_name: user.name || user.email });
      await refreshUser();
      reloadCommunities();
      setChannelChoice(channel.id);
      setNewCommunityName("");
      setShowNewCommunity(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create that community. Try again.");
    } finally {
      setCreatingCommunity(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) { setError("Sign in before creating an event."); return; }
    if (!title.trim()) { setError("Enter an event name."); return; }
    if (!when) { setError("Choose a date and time."); return; }

    setSubmitting(true);
    setError("");

    const id = `ev_${crypto.randomUUID()}`;
    const startDate = new Date(when);
    const capNum = 0;
    const cleanSlug = toSlug(title) || id;

    const draft: EventItem = {
      id,
      slug: cleanSlug,
      title: title.trim(),
      description: description.trim(),
      organizer_id: selectedChannel?.id ?? user.userId,
      organizer_type: selectedChannel ? "COMMUNITY" : "USER",
      ...(selectedChannel ? {
        channel_id: selectedChannel.id,
        channel_name: selectedChannel.name,
        channel_slug: selectedChannel.slug,
        channel_avatar: selectedChannel.avatar_url,
        channel_is_private: selectedChannel.is_private || selectedChannel.visibility === "PRIVATE",
        visibility: selectedChannel.is_private || selectedChannel.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      } : {}),
      status: "PUBLISHED",
      start_time: startDate.toISOString(),
      time_display: startDate.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      location: location.trim(),
      total_capacity: capNum,
      banner_url: coverImage || "",
      square_banner_url: coverImage || "",
      created_at: new Date().toISOString(),
      tiers: [
        {
          id: `tier_${id}`,
          event_id: id,
          name: "General Admission",
          total_capacity: capNum,
          remaining_capacity: capNum,
          price_cents: eventType === "PAID" && Number(price) > 0 ? Math.round(Number(price) * 100) : 0,
          approval_mode: "AUTO_APPROVE",
        },
      ],
      hosts: [selectedChannel?.name || user.name || user.email],
      host_users: [{ user_id: user.userId, name: user.name || user.email, email: user.email, role: "Primary Host" }],
    };

    try {
      const saved = await createEventDraft(draft);
      await refreshUser();
      router.push(`/events/${saved.slug || cleanSlug || saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save event. Please try again.");
      setSubmitting(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className={form.page}>
        <AppHeader eventNavigation />
        <main className={form.main} style={{ maxWidth: 840 }}><PageSkeleton rows={4} /></main>
      </div>
    );
  }

  return (
    <div className={form.page}>
      <AppHeader eventNavigation />
      <main className={form.main} style={{ maxWidth: 840 }}>
        <header className={form.heading}>
          <h1>Create an event</h1>
          <p>Start with the essentials.</p>
        </header>

        <form onSubmit={submit} aria-label="Event details">
          <fieldset className={form.fields} disabled={isLoading}>
            <legend className="sr-only">Event details</legend>

            <div className={form.field}>
              <label htmlFor="title">Event name</label>
              <input
                id="title"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Saturday Hack Night"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              <div className={form.field}>
                <label>Event type</label>
                <div className={toggle.toggleRow}>
                  <button type="button" className={toggle.toggleBtn} data-active={eventType === "FREE"} onClick={() => setEventType("FREE")}>Free</button>
                  <button type="button" className={toggle.toggleBtn} data-active={eventType === "PAID"} onClick={() => setEventType("PAID")}>Paid</button>
                  {eventType === "PAID" && (
                    <input
                      type="number"
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Price"
                      style={{ maxWidth: 100, marginLeft: 8 }}
                    />
                  )}
                </div>
              </div>

              <div className={form.field}>
                <label>Event mode</label>
                <div className={toggle.toggleRow}>
                  <button type="button" className={toggle.toggleBtn} data-active={eventMode === "IN_PERSON"} onClick={() => setEventMode("IN_PERSON")}>In-person</button>
                  <button type="button" className={toggle.toggleBtn} data-active={eventMode === "ONLINE"} onClick={() => setEventMode("ONLINE")}>Online</button>
                </div>
              </div>
            </div>

            <div className={form.field}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={2}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this event about?"
              />
            </div>



            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-10">
              <div className={form.field}>
                <label htmlFor="when">Date &amp; time</label>
                <DateTimePicker id="when" value={when} onChange={setWhen} />
              </div>

              <div className={form.field}>
                <label htmlFor="location">{eventMode === "ONLINE" ? "Meeting link" : "Location"}</label>
                {eventMode === "ONLINE" ? (
                  <input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Zoom, Meet, or Discord link"
                  />
                ) : (
                  <LocationInput
                    id="location"
                    value={location}
                    onChange={setLocation}
                    placeholder="Address or venue"
                  />
                )}
              </div>
            </div>

            <div className={toggle.noticeBox}>
              <p className={toggle.noticeText}>
                Host under a community, or create a new one.
              </p>
              <div className={toggle.noticeControl}>
                <Select
                  id="hostAs"
                  value={channelChoice}
                  onChange={setChannelChoice}
                  options={channelOptions}
                  extraAction={{ label: "+ Create new community", onClick: () => setShowNewCommunity(true) }}
                />
                {showNewCommunity && (
                  <div className={toggle.newCommunityRow}>
                    <input
                      value={newCommunityName}
                      onChange={(e) => setNewCommunityName(e.target.value)}
                      placeholder="Community name"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={form.submit}
                      onClick={handleCreateCommunity}
                      disabled={creatingCommunity || !newCommunityName.trim()}
                    >
                      {creatingCommunity ? "…" : "Create"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {error && <p className={form.error} role="alert">{error}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
            <button type="submit" className={form.submit} disabled={isLoading || submitting}>
              {submitting ? "Creating event..." : "Create event"}<ArrowRight size={16} />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
