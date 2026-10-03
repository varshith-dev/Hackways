"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AppHeader } from "@/components/app-shell/AppHeader";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEventCreation } from "../EventCreationProvider";
import form from "@/components/forms/CreationForm.module.css";
import styles from "./setup.module.css";

export default function EventSetup() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { draft, save } = useEventCreation();
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const authorized = !!user && draft?.host_users?.[0]?.user_id === user.userId;
  const detailsHref = draft?.channel_id
    ? `/events/create/details?communityId=${encodeURIComponent(draft.channel_id)}`
    : "/events/create/details?host=solo";

  useEffect(() => {
    if (isLoading || !draft || !authorized) return;
    let active = true;
      save().then((event) => {
        if (!active) return;
        setComplete(true);
        router.replace(`/console/events/${encodeURIComponent(event.slug || event.id)}/overview`);
      }).catch((cause) => {
      if (!active) return;
      console.error("Unable to set up event", cause);
      setError(cause instanceof Error ? cause.message : "Your event couldn't be saved. Please try again.");
    });
    return () => { active = false; };
  }, [isLoading, draft, authorized, save, router, attempt]);

  const unavailable = !isLoading && (!draft || !authorized);
  const progress = complete ? 100 : 25;

  return (
    <div className={form.page}>
      <AppHeader eventNavigation />
      <main className={styles.main}>
        {unavailable ? <>
          <h1>Start with your event details</h1>
          <p>This setup session is no longer available.</p>
          <Link className={form.submit} href="/events/create">Back to event creation</Link>
        </> : error ? <>
          <h1>We couldn&apos;t finish setup</h1>
          <p role="alert">{error}</p>
          <div className={styles.actions}>
            <Link href={detailsHref}>Edit details</Link>
            <button className={form.submit} onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Try again</button>
          </div>
        </> : <>
          <div className={styles.progress} role="progressbar" aria-label="Event setup" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={complete ? "Event saved. Opening your dashboard." : "Saving your event."}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className={styles.track} cx="60" cy="60" r="48" />
              <circle className={styles.fill} cx="60" cy="60" r="48" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress} />
            </svg>
            {complete && <Check className={styles.check} size={28} strokeWidth={2.5} aria-hidden="true" />}
          </div>
          <div role="status" aria-live="polite">
            <h1>{complete ? "Your event is ready" : "Setting up your event"}</h1>
            <p>{complete ? "Opening your dashboard..." : "Please hold on."}</p>
          </div>
        </>}
      </main>
    </div>
  );
}
