import { redirect } from "next/navigation";

export default async function MobileDedicatedEventRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/m/console/events/${encodeURIComponent(id)}/overview`);
}
