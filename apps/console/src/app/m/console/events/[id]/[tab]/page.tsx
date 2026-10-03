import MobileEventPage from "@/app/mobile/events/_components/MobileEventPage";

export default async function MobileConsoleEventTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  return <MobileEventPage id={id} tab={tab} />;
}
