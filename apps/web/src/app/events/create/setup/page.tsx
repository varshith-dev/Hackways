import type { Metadata } from "next";
import EventSetup from "./EventSetup";

export const metadata: Metadata = { title: "Setting up your event | Hackways" };

export default function EventSetupPage() {
  return <EventSetup />;
}
