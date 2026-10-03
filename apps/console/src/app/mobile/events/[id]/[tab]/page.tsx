import MobileEventPage from "../../_components/MobileEventPage";

export default async function MobileEventTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  return <MobileEventPage id={id} tab={tab} />;
}
