import type { ReactNode } from "react";
import { serverStore } from "@/lib/serverStore";
import MobileEventShell from "@/app/mobile/events/_components/MobileEventShell";

export default async function MobileDedicatedEventLayout(props: {
  children: ReactNode;
  params: Promise<any>;
}) {
  const params = await props.params;
  const id = params?.id || "";
  return (
    <MobileEventShell eventId={id} initialEvent={serverStore.getEventById(id)}>
      {props.children}
    </MobileEventShell>
  );
}
