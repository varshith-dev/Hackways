import { NextResponse } from "next/server";

// Proxies Photon (komoot's free OSM-based geocoder, purpose-built for
// typeahead) so the browser never calls it directly — keeps this swappable
// without touching the client, same as the Nominatim version this replaced.
// No API key, no billing, unlike Google Places.
const PHOTON_URL = "https://photon.komoot.io/api/";

interface PhotonFeature {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
}

function labelFor(p: PhotonFeature["properties"]): string {
  const parts = [
    [p.housenumber, p.street].filter(Boolean).join(" ") || undefined,
    p.name,
    p.city,
    p.state,
    p.country,
  ].filter(Boolean) as string[];
  return [...new Set(parts)].join(", ");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `${PHOTON_URL}?limit=5&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return NextResponse.json({ results: [] });

    const data: { features: PhotonFeature[] } = await res.json();
    return NextResponse.json({
      results: (data.features || []).map((f) => ({
        label: labelFor(f.properties),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
