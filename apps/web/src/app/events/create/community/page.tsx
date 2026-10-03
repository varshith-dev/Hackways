import type { Metadata } from "next";
import CommunityPicker from "./CommunityPicker";

export const metadata: Metadata = { title: "Choose a community | Hackways" };

export default function ChooseCommunityPage() {
  return <CommunityPicker />;
}
