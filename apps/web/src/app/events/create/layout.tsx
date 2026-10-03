import type { ReactNode } from "react";
import { EventCreationProvider } from "./EventCreationProvider";

export default function EventCreationLayout({ children }: { children: ReactNode }) {
  return <EventCreationProvider>{children}</EventCreationProvider>;
}
