"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { EventItem, EventTeam } from "@/lib/types";
import { getEventSync, saveEvent, StoredAttendee, StoredOrder } from "@/lib/api";
import { syncEngine } from "@/lib/sync/syncEngine";

export type EventTabKey =
  | "overview"
  | "setup"
  | "tickets"
  | "orders"
  | "attendees"
  | "teams"
  | "check-in"
  | "marketing"
  | "communications"
  | "staff"
  | "finance"
  | "analytics"
  | "integrations"
  | "settings";

interface EventWorkspaceContextType {
  eventId: string;
  event: EventItem | null;
  activeTab: EventTabKey;
  switchTab: (tab: EventTabKey) => void;
  orders: StoredOrder[];
  attendees: StoredAttendee[];
  teams: EventTeam[];
  setOrders: React.Dispatch<React.SetStateAction<StoredOrder[]>>;
  setAttendees: React.Dispatch<React.SetStateAction<StoredAttendee[]>>;
  setTeams: React.Dispatch<React.SetStateAction<EventTeam[]>>;
  updateEventOptimistically: (updated: EventItem) => Promise<void>;
  reloadEvent: () => void;
}

const EventWorkspaceContext = createContext<EventWorkspaceContextType | null>(null);

export function useEventWorkspace() {
  const ctx = useContext(EventWorkspaceContext);
  if (!ctx) {
    throw new Error("useEventWorkspace must be used within an EventWorkspaceProvider");
  }
  return ctx;
}

export function useOptionalEventWorkspace() {
  return useContext(EventWorkspaceContext);
}

interface EventWorkspaceProviderProps {
  eventId: string;
  initialTab?: string;
  initialEvent?: EventItem | null;
  initialOrders?: StoredOrder[];
  initialAttendees?: StoredAttendee[];
  initialTeams?: EventTeam[];
  children: React.ReactNode;
}

export function EventWorkspaceProvider({
  eventId,
  initialTab = "overview",
  initialEvent,
  initialOrders = [],
  initialAttendees = [],
  initialTeams = [],
  children,
}: EventWorkspaceProviderProps) {
  // Fast local resolution
  const resolvedInitialEvent = initialEvent || (typeof window !== "undefined" ? getEventSync(eventId) : null);
  const [event, setEvent] = useState<EventItem | null>(() => resolvedInitialEvent);
  const [activeTab, setActiveTab] = useState<EventTabKey>(() => (initialTab as EventTabKey) || "overview");
  const [orders, setOrders] = useState<StoredOrder[]>(() => initialOrders);
  const [attendees, setAttendees] = useState<StoredAttendee[]>(() => initialAttendees);
  const [teams, setTeams] = useState<EventTeam[]>(() => initialTeams);

  // Sync event from store or props
  useEffect(() => {
    if (resolvedInitialEvent && !event) {
      setEvent(resolvedInitialEvent);
    }
  }, [resolvedInitialEvent, event]);

  // Synchronize browser URL shallowly without triggering full page unmounts
  const switchTab = useCallback(
    (nextTab: EventTabKey) => {
      setActiveTab(nextTab);
      if (typeof window !== "undefined") {
        const targetSlug = event?.slug || eventId;
        const targetUrl = `/console/events/${encodeURIComponent(targetSlug)}/${nextTab}`;
        window.history.replaceState(null, "", targetUrl);
        window.dispatchEvent(new CustomEvent("hackways_event_tab_changed", { detail: { tab: nextTab } }));
      }
    },
    [event?.slug, eventId]
  );

  // Listen to external tab change requests (e.g. from TwoColumnSidebar railbar)
  useEffect(() => {
    const handleExternalTabChange = (e: any) => {
      if (e.detail?.tab && e.detail.tab !== activeTab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener("hackways_event_tab_changed", handleExternalTabChange);
    return () => {
      window.removeEventListener("hackways_event_tab_changed", handleExternalTabChange);
    };
  }, [activeTab]);

  // Optimistic update: instantly save in local state & localStorage, then queue background sync
  const updateEventOptimistically = useCallback(
    async (updated: EventItem) => {
      setEvent(updated);
      saveEvent(updated); // Sync synchronous local write
      syncEngine.enqueueMutation("save_event", updated); // Queue background sync
    },
    []
  );

  const reloadEvent = useCallback(() => {
    const refreshed = getEventSync(eventId);
    if (refreshed) {
      setEvent(refreshed);
    }
  }, [eventId]);

  const value = useMemo(
    () => ({
      eventId,
      event,
      activeTab,
      switchTab,
      orders,
      attendees,
      teams,
      setOrders,
      setAttendees,
      setTeams,
      updateEventOptimistically,
      reloadEvent,
    }),
    [eventId, event, activeTab, switchTab, orders, attendees, teams, updateEventOptimistically, reloadEvent]
  );

  return <EventWorkspaceContext.Provider value={value}>{children}</EventWorkspaceContext.Provider>;
}
