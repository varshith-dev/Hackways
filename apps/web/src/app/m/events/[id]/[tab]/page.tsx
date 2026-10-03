import { redirect } from "next/navigation";

export default async function MobileDedicatedEventTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  redirect(`/m/console/events/${encodeURIComponent(id)}/${encodeURIComponent(tab)}`);
}
