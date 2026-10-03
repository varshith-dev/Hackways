import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CreateEventForm from "../CreateEventForm";

export const metadata: Metadata = { title: "Event details | Hackways" };

export default async function EventDetailsPage({ searchParams }: {
  searchParams: Promise<{ host?: string; communityId?: string }>;
}) {
  const { host, communityId } = await searchParams;
  if (!communityId && host !== "solo") redirect("/events/create");
  return <Suspense fallback={<p className="p-8 text-center text-sm" role="status">Loading event details...</p>}><CreateEventForm /></Suspense>;
}
