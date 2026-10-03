"use client";

import { useState, useEffect } from "react";
import { syncEngine, SyncStatus } from "@/lib/sync/syncEngine";

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => syncEngine.getStatus());
  const [pendingCount, setPendingCount] = useState<number>(() => syncEngine.getPendingCount());
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => syncEngine.getLastSyncedAt());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus, newPending) => {
      setStatus(newStatus);
      setPendingCount(newPending);
      setLastSyncedAt(syncEngine.getLastSyncedAt());
    });
    return unsubscribe;
  }, []);

  const triggerSync = () => {
    syncEngine.flushQueue();
  };

  return {
    status,
    pendingCount,
    lastSyncedAt,
    triggerSync,
    isOnline: status !== "offline",
  };
}
