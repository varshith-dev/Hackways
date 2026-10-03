import type { HTMLAttributes } from "react";
import styles from "./Skeleton.module.css";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.block} ${className}`} aria-hidden="true" {...props} />;
}

/** Page-level loading skeleton: title bar plus a few content rows, matching the
 * app's underline-field layout so the swap to real content doesn't jump. */
export function PageSkeleton({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`${styles.page} ${className}`} role="status" aria-label="Loading">
      <Skeleton className={styles.title} />
      {Array.from({ length: rows }).map((_, i) => (
        <div className={styles.row} key={i}>
          <Skeleton className={styles.label} />
          <Skeleton className={styles.value} />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Small inline loader for dialogs, panels, and Suspense fallbacks. */
export function InlineSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.inline} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={styles.line} style={{ width: `${88 - i * 14}%` }} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
