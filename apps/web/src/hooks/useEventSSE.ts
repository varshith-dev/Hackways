"use client";

import { useEffect, useState, useCallback } from "react";
import { CapacitySnapshot } from "@/lib/types";

interface UseEventSSEProps {
  eventId: string;
  initialCapacity?: CapacitySnapshot | null;
  onUpdate?: (event: any) => void;
}

export function useEventSSE({ eventId, initialCapacity, onUpdate }: UseEventSSEProps) {
  const [capacity, setCapacity] = useState<CapacitySnapshot | null>(initialCapacity || null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [pulsing, setPulsing] = useState<boolean>(false);

  const triggerPulse = useCallback(() => {
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) {
      // Standalone mode: skip external port 8080 SSE connection to prevent ERR_CONNECTION_REFUSED
      return;
    }
    const sseUrl = `${apiBase}/api/v1/events/${eventId}/live`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("connected", () => {
        setIsConnected(true);
      });

      eventSource.addEventListener("capacity_update", (e) => {
        try {
          const payload = JSON.parse(e.data);
          triggerPulse();
          setLastActivity(`Live: Spot update for ${payload.user_name || "attendee"}`);

          if (payload.payload && typeof payload.payload.remaining_capacity === "number") {
            setCapacity((prev) => {
              if (!prev) return prev;
              const rem = payload.payload.remaining_capacity;
              return {
                ...prev,
                remaining_capacity: rem,
                confirmed_count: prev.total_capacity - rem,
                is_sold_out: rem <= 0,
              };
            });
          }

          if (onUpdate) onUpdate(payload);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      });

      eventSource.addEventListener("waitlist_promoted", (e) => {
        try {
          const payload = JSON.parse(e.data);
          triggerPulse();
          setLastActivity(`Spot opened: ${payload.user_name || "Waitlist user"} was promoted to Confirmed!`);
          if (onUpdate) onUpdate(payload);
        } catch (err) {
          console.error("SSE parse error", err);
        }
      });

      eventSource.addEventListener("capacity_reached", () => {
        triggerPulse();
        setCapacity((prev) => (prev ? { ...prev, remaining_capacity: 0, is_sold_out: true } : prev));
        setLastActivity("Tier is now SOLD OUT. Waitlist priority active.");
      });

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventId, triggerPulse, onUpdate]);

  return {
    capacity,
    setCapacity,
    isConnected,
    lastActivity,
    pulsing,
  };
}
