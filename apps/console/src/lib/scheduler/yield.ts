/** Yields a turn back to the browser so a burst of work can't hog a frame —
 * tries the new Prioritized Task Scheduling API first, falls back through
 * requestIdleCallback (not in Safari) to a plain setTimeout(0). Feature-detected
 * since none of these three are universally available yet. */
export function scheduleYield(): Promise<void> {
  const schedulerApi = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (schedulerApi?.yield) {
    return schedulerApi.yield();
  }

  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (ric) {
    return new Promise<void>((resolve) => ric(() => resolve()));
  }

  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function demo(): void {
  // Nothing to assert synchronously — this is a timing primitive, not logic.
  // The real check is that it resolves at all, in any environment:
  void scheduleYield().then(() => {});
}
