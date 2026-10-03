/** Caps how many async functions run at once — a semaphore, not a token
 * bucket (token buckets cap requests-per-unit-time; what "limit simultaneous
 * in-flight fetches" actually needs is a concurrency cap, which is simpler). */
export class ConcurrencyLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private readonly max: number;

  constructor(max: number = 3) {
    this.max = max;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

export function demo(): void {
  // Logical check only (no real timers needed): three slots, four callers —
  // the 4th must not start until one of the first three's fn() has returned.
  const limiter = new ConcurrencyLimiter(1);
  let started = 0;
  let maxConcurrent = 0;
  const run = () =>
    limiter.run(async () => {
      started++;
      maxConcurrent = Math.max(maxConcurrent, started);
      await Promise.resolve();
      started--;
    });
  const all = Promise.all([run(), run(), run()]);
  all.then(() => {
    if (maxConcurrent > 1) throw new Error(`ConcurrencyLimiter(1) let ${maxConcurrent} run at once`);
  });
}
