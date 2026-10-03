import { redirect } from "next/navigation";

export default async function MobileOrganizerTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (tab === "events") redirect("/m/console");
  if (tab === "analytics") redirect("/m/console/kpi");
  if (tab === "marketing") redirect("/m/console/marketing");
  if (tab === "finance") redirect("/m/console/finance");
  redirect("/m/console");
}
