import MobileEventPage from "../_components/MobileEventPage";

export default async function MobileEventRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MobileEventPage id={id} tab="overview" />;
}
