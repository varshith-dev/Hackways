"use client";

import { EventItem } from "@/lib/types";
import { saveEventAsync, checkInAttendee, StoredAttendee, StoredOrder } from "@/lib/api";

export type SyncStatus = "online" | "syncing" | "offline" | "error";

export interface QueuedMutation {
  id: string;
  timestamp: number;
  action: "save_event" | "checkin_attendee" | "update_attendee" | "custom";
  payload: any;
  retries: number;
  status: "pending" | "processing" | "failed";
  error?: string;
}

const MUTATION_QUEUE_KEY = "hackways_offline_mutation_queue_v1";
const SYNC_EVENT_NAME = "hackways_sync_status_change";

class OfflineSyncEngine {
  private status: SyncStatus = typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online";
  private isFlushing = false;
  private listeners = new Set<(status: SyncStatus, pendingCount: number) => void>();
  private lastSyncedAt: number = Date.now();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      // Periodic background sync every 15 seconds when online
      setInterval(() => {
        if (navigator.onLine && !this.isFlushing && this.getQueue().length > 0) {
          this.flushQueue();
        }
      }, 15000);
    }
  }

  private handleOnline = () => {
    this.status = "online";
    this.notify();
    this.flushQueue();
  };

  private handleOffline = () => {
    this.status = "offline";
    this.notify();
  };

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getPendingCount(): number {
    return this.getQueue().filter((q) => q.status !== "processing").length;
  }

  public getLastSyncedAt(): number {
    return this.lastSyncedAt;
  }

  public subscribe(cb: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.listeners.add(cb);
    cb(this.status, this.getPendingCount());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const pendingCount = this.getPendingCount();
    this.listeners.forEach((cb) => cb(this.status, pendingCount));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT_NAME, {
          detail: { status: this.status, pendingCount, lastSyncedAt: this.lastSyncedAt },
        })
      );
    }
  }

  public getQueue(): QueuedMutation[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedMutation[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
      this.notify();
    } catch {
      // storage quota or private mode fallback
    }
  }

  public enqueueMutation(action: QueuedMutation["action"], payload: any): string {
    const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mutation: QueuedMutation = {
      id,
      timestamp: Date.now(),
      action,
      payload,
      retries: 0,
      status: "pending",
    };

    const queue = this.getQueue();
    queue.push(mutation);
    this.saveQueue(queue);

    if (navigator.onLine) {
      setTimeout(() => this.flushQueue(), 50);
    } else {
      this.status = "offline";
      this.notify();
    }

    return id;
  }

  public async flushQueue(): Promise<void> {
    if (this.isFlushing || typeof window === "undefined" || !navigator.onLine) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isFlushing = true;
    this.status = "syncing";
    this.notify();

    const remainingQueue: QueuedMutation[] = [];

    for (const mutation of queue) {
      try {
        let success = false;
        if (mutation.action === "save_event") {
          await saveEventAsync(mutation.payload);
          success = true;
        } else if (mutation.action === "checkin_attendee") {
          await checkInAttendee(mutation.payload.attendeeId, mutation.payload.checkinCode);
          success = true;
        } else {
          // Custom / generic action fallback
          success = true;
        }

        if (!success) {
          mutation.retries += 1;
          if (mutation.retries < 5) {
            remainingQueue.push(mutation);
          }
        }
      } catch (err: any) {
        mutation.retries += 1;
        mutation.error = err?.message || "Sync network error";
        if (mutation.retries < 5) {
          remainingQueue.push(mutation);
        }
      }
    }

    this.saveQueue(remainingQueue);
    this.isFlushing = false;
    this.lastSyncedAt = Date.now();
    this.status = remainingQueue.length > 0 ? "error" : "online";
    this.notify();
  }
}

// Global Singleton Instance
export const syncEngine = new OfflineSyncEngine();
