import type { ReactNode } from "react";
import { EventCreationProvider } from "@/app/events/create/EventCreationProvider";

export default function CreateLayout({ children }: { children: ReactNode }) {
  return <EventCreationProvider>{children}</EventCreationProvider>;
}
