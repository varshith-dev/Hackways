import Image from "next/image";

const assets = {
  events: "no-events.png",
  tickets: "no-tickets.png",
  users: "no users & no participants.png",
  participants: "no users & no participants.png",
  revenue: "no-revenue.png",
  communities: "community-group.png",
  analytics: "analytics.png",
  broadcast: "brodcast-megaphone.png",
  refunds: "REFUND.png",
  venue: "VENUE.png",
  flag: "Flag.png",
} as const;

export type DashboardArtworkKind = keyof typeof assets;

export default function DashboardArtwork({ kind, size = 64 }: { kind: DashboardArtworkKind; size?: number }) {
  return <Image src={`/dashboard-assets/${assets[kind]}`} alt="" width={size} height={size} unoptimized
    style={{ width: size, height: size, objectFit: "contain", marginInline: "auto" }} />;
}
