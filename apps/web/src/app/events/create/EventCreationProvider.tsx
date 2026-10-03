"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createEventDraft } from "@/lib/createEventDraft";
import type { EventItem } from "@/lib/types";

const EventCreationContext = createContext<{
  draft: EventItem | null;
  prepare: (draft: EventItem) => void;
  save: () => Promise<EventItem>;
} | null>(null);

export function EventCreationProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<EventItem | null>(null);
  const request = useRef<Promise<EventItem> | null>(null);
  const prepare = useCallback((event: EventItem) => {
    request.current = null;
    setDraft(event);
  }, []);
  const save = useCallback(() => {
    if (!draft) return Promise.reject(new Error("Add your event details before continuing."));
    // Share the same request across setup-page remounts; retries keep the draft ID.
    if (!request.current) {
      request.current = createEventDraft(draft).catch((cause) => {
        request.current = null;
        throw cause;
      });
    }
    return request.current;
  }, [draft]);

  return <EventCreationContext.Provider value={{ draft, prepare, save }}>{children}</EventCreationContext.Provider>;
}

export function useEventCreation() {
  const context = useContext(EventCreationContext);
  if (!context) throw new Error("Event creation must be inside EventCreationProvider.");
  return context;
}
