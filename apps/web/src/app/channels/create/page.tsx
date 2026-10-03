import type { Metadata } from "next";
import CommunityCreateForm from "./CommunityCreateForm";

export const metadata: Metadata = { title: "Create a community | Hackways" };

export default async function CreateCommunityPage({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <CommunityCreateForm continueToEvent={next === "event"} />;
}
