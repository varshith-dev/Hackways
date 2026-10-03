import type { Metadata } from "next";
import MyEventsView from "./MyEventsView";

export const metadata: Metadata = { title: "My events | Hackways" };

export default function MyEventsPage() {
  return <MyEventsView />;
}
