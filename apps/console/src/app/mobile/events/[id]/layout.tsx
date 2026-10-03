import type { ReactNode } from "react";
import { serverStore } from "@/lib/serverStore";
import MobileEventShell from "../_components/MobileEventShell";

export default async function MobileEventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <MobileEventShell eventId={id} initialEvent={serverStore.getEventById(id)}>
      {children}
    </MobileEventShell>
  );
}
