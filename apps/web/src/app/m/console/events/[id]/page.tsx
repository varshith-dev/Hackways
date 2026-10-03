import { redirect } from "next/navigation";

export default async function MobileConsoleEventRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/m/console/events/${encodeURIComponent(id)}/overview`);
}
