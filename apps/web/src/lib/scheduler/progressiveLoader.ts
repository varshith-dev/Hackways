import { PriorityQueue } from "./priorityQueue";
import { ConcurrencyLimiter } from "./concurrencyLimiter";
import { LRUCache } from "./lruCache";
import { scheduleYield } from "./yield";

export type LoadPriority = "high" | "medium" | "low";

const PRIORITY_RANK: Record<LoadPriority, number> = { high: 0, medium: 1, low: 2 };

export interface ScheduleLoadOptions {
  priority?: LoadPriority;
  /** Caches the resolved value under this key if provided; a repeat call
   * with the same cacheKey returns the cached value without re-running fn. */
  cacheKey?: string;
  /** How long a cached result stays fresh. Defaults to 60s. */
  ttlMs?: number;
}

interface QueuedTask {
  run: () => Promise<void>;
}

// One shared instance per app/tab — a page-local queue would defeat the
// point of capping concurrency across everything loading at once.
const queue = new PriorityQueue<QueuedTask>();
const limiter = new ConcurrencyLimiter(3);
const cache = new LRUCache<unknown>(200);
let pumping = false;

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.size > 0) {
      const task = queue.pop();
      if (!task) break;
      // Fire-and-manage via the limiter; don't await here, or a slow task
      // would block popping the next (possibly higher-priority) one out of
      // the queue — the limiter itself is what actually caps concurrency.
      void limiter.run(task.run);
      await scheduleYield();
    }
  } finally {
    pumping = false;
  }
}

/**
 * Schedules `fn` to run through the shared priority queue + concurrency
 * limiter, caching its result if `cacheKey` is given. Wraps an existing
 * call site — fn's own return type and the rest of the call site are
 * unchanged; this is additive, not a replacement for lib/api.ts's functions.
 */
export function scheduleLoad<T>(fn: () => T | Promise<T>, options: ScheduleLoadOptions = {}): Promise<T> {
  const { priority = "medium", cacheKey, ttlMs = 60_000 } = options;

  if (cacheKey) {
    const cached = cache.get(cacheKey) as T | undefined;
    if (cached !== undefined) return Promise.resolve(cached);
  }

  return new Promise<T>((resolve, reject) => {
    queue.push(
      {
        run: async () => {
          try {
            const result = await fn();
            if (cacheKey) cache.set(cacheKey, result, ttlMs);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        },
      },
      PRIORITY_RANK[priority]
    );
    void pump();
  });
}

export function demo(): void {
  // Logical smoke check: a cached value short-circuits fn entirely.
  let calls = 0;
  const load = () => {
    calls++;
    return Promise.resolve(calls);
  };
  scheduleLoad(load, { cacheKey: "demo-key", ttlMs: 60_000 })
    .then(() => scheduleLoad(load, { cacheKey: "demo-key" }))
    .then((second) => {
      if (calls !== 1) throw new Error(`scheduleLoad cache did not prevent a second call (calls=${calls})`);
      if (second !== 1) throw new Error("scheduleLoad returned a stale/wrong cached value");
    });
}
