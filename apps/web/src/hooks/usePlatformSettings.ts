"use client";

import { useEffect, useState } from "react";
import type { PlatformSettings } from "@/lib/platformSettings";

interface PlatformSnapshot {
  settings: PlatformSettings;
  canManage: boolean;
}

let cache: PlatformSnapshot | null = null;
let lastError = "";
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function load(): Promise<void> {
  inflight ??= fetch("/api/v1/platform/settings", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in required." : `Settings unavailable (${res.status}).`);
      const data = await res.json();
      if (!data.settings) throw new Error("Invalid settings response.");
      cache = { settings: data.settings, canManage: !!data.canManage };
      lastError = "";
    })
    .catch((cause) => {
      console.error("Unable to load platform settings", cause);
      lastError = "Console permissions couldn't be loaded. Retry in a moment.";
    })
    .finally(() => {
      inflight = null;
      notify();
    });
  return inflight;
}

/** Loads the platform module-access matrix + fee config once per session.
 * Every consumer (layout gate, dashboards, super admin) shares one fetch and
 * is notified on completion — no consumer may be left waiting on another's
 * promise chain. Server is authoritative; this mirrors it for console UI. */
export function usePlatformSettings() {
  const [snapshot, setSnapshot] = useState(cache);
  const [loaded, setLoaded] = useState(!!cache);
  const [error, setError] = useState(lastError);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => {
      setSnapshot(cache);
      setLoaded(true);
      setError(lastError);
    };
    listeners.add(listener);
    if (cache || lastError) listener();
    else void load();
    return () => {
      listeners.delete(listener);
    };
  }, [version]);

  return {
    settings: snapshot?.settings ?? null,
    canManage: snapshot?.canManage ?? false,
    loaded,
    error,
    retry: () => {
      cache = null;
      lastError = "";
      setLoaded(false);
      setError("");
      setVersion((v) => v + 1);
    },
    // Called after a successful super-admin save so every mounted console updates.
    applyUpdate: (settings: PlatformSettings) => {
      cache = { settings, canManage: true };
      lastError = "";
      notify();
    },
  };
}

export function invalidatePlatformSettingsCache() {
  cache = null;
  lastError = "";
}
