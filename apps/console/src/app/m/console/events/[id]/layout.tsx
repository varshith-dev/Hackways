import { ReactNode } from "react";
import MobileEventShell from "@/app/mobile/events/_components/MobileEventShell";
import { serverStore } from "@/lib/serverStore";

export default async function MobileConsoleEventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialEvent = serverStore.getEventById(id);

  return (
    <MobileEventShell eventId={id} initialEvent={initialEvent}>
      {children}
    </MobileEventShell>
  );
}
