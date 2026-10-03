import type { Metadata } from "next";
import PricingView from "@/components/pages/PricingView";

export const metadata: Metadata = {
  title: "Pricing — Hackways",
  description:
    "Transparent pricing for event drops. Zero platform fees on free community events.",
};

export default function PricingPage() {
  return <PricingView />;
}
