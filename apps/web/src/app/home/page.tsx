import React, { Suspense } from "react";
import ExploreViewClient from "./ExploreViewClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Discover events | Hackways" };
export const dynamic = "force-dynamic";

// No server-fetched initialEvents: this used to read a legacy file-based
// demo store (.server_data/platform_store.json) that's entirely disconnected
// from the real Postgres-backed events the rest of the app uses — and whose
// accumulated base64 banner images had bloated a single page load to ~10MB,
// crashing the tab. useEventBrowser (client-side, in ExploreViewClient) was
// already overwriting that data with a real fetch to /api/v1/events moments
// after mount regardless, so nothing is lost here — just a brief loading
// skeleton on first paint instead of stale demo content.
export default function ExplorePage() {
  // Suspense is required because the client view reads ?category= via useSearchParams.
  return (
    <Suspense fallback={null}>
      <ExploreViewClient />
    </Suspense>
  );
}
