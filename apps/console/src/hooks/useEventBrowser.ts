"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventItem } from "@/lib/types";
import { getStoredEvents, getUserTickets, type UserTicket } from "@/lib/api";
import type { UserSession } from "@/lib/types";

export function useEventNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, []);
  return now;
}

export function useRegistrationTickets(user: UserSession | null) {
  const [snapshot, setSnapshot] = useState<{
    identity: string; tickets: UserTicket[]; error: string;
  }>({ identity: "", tickets: [], error: "" });
  const identity = user ? `${user.userId}:${user.email.toLowerCase()}` : "guest";
  const sync = useCallback(() => {
    try {
      const tickets = user ? getUserTickets(undefined, { strict: true }).filter((ticket) =>
        ticket.user_id === user.userId || ticket.user_email.toLowerCase() === user.email.toLowerCase()
      ) : [];
      setSnapshot({ identity, tickets, error: "" });
    } catch (cause) {
      console.error("Unable to read registrations", cause);
      setSnapshot((current) => ({
        identity,
        tickets: current.identity === identity ? current.tickets : [],
        error: "We couldn't read your registrations. Check that browser storage is allowed, then retry.",
      }));
    }
  }, [identity, user]);

  useEffect(() => {
    const initial = window.setTimeout(sync, 0);
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === "hackways_tickets_v7") sync();
    };
    window.addEventListener("hackways_tickets_updated", sync);
    window.addEventListener("storage", storage);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("hackways_tickets_updated", sync);
      window.removeEventListener("storage", storage);
    };
  }, [sync]);

  return {
    tickets: snapshot.identity === identity ? snapshot.tickets : [],
    error: snapshot.identity === identity ? snapshot.error : "",
    loading: snapshot.identity !== identity,
    retry: sync,
  };
}

export function useEventBrowser(initialEvents: EventItem[] = []) {
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/events`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Event request failed (${response.status})`);
        const data = await response.json();
        if (!Array.isArray(data.events)) throw new Error("Invalid event response");
        if (!controller.signal.aborted) {
          setEvents(data.events);
          setError("");
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        console.error("Unable to refresh events", cause);
        setEvents((current) => current.length ? current : getStoredEvents());
        setError("We couldn't refresh events. Please retry.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const sync = () => setEvents(getStoredEvents());
    const storage = (event: StorageEvent) => {
      if (event.key === "hackways_events_v7" || event.key === null) sync();
    };
    window.addEventListener("hackways_events_updated", sync);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("hackways_events_updated", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);

  return { events, loading, error, retry: () => setRevision((value) => value + 1) };
}

function readSaved(key: string): string[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    throw new Error("Saved events could not be read");
  }
  return value;
}

export function useSavedEvents(userId?: string) {
  const key = `hackways_saved_events_v1:${userId || "guest"}`;
  const [snapshot, setSnapshot] = useState<{ key: string; ids: string[] }>({ key: "", ids: [] });
  const [error, setError] = useState("");
  const ids = snapshot.key === key ? snapshot.ids : [];

  useEffect(() => {
    const sync = () => {
      try {
        setSnapshot({ key, ids: readSaved(key) });
        setError("");
      } catch (cause) {
        console.error("Unable to read saved events", cause);
        setError("Saved events are unavailable. Allow browser storage and reload to try again.");
      }
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("hackways_saved_events_updated", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hackways_saved_events_updated", sync);
    };
  }, [key]);

  const toggle = useCallback((id: string) => {
    try {
      const current = readSaved(key);
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      localStorage.setItem(key, JSON.stringify(next));
      setSnapshot({ key, ids: next });
      setError("");
      window.dispatchEvent(new Event("hackways_saved_events_updated"));
    } catch (cause) {
      console.error("Unable to save event", cause);
      setError("This event couldn't be saved. Allow browser storage, then try again.");
    }
  }, [key]);

  return { ids, toggle, error };
}
