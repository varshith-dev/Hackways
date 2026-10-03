import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { ShortLinkTracker } from "@/lib/types";
import { requireSession } from "@/lib/serverAuth";

export async function GET(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  const links = serverStore.getShortLinks();
  return NextResponse.json({ short_links: links });
}

export async function POST(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    let {
      code,
      title,
      destination_url,
      scope,
      event_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = body;

    if (!destination_url) {
      return NextResponse.json(
        { error: "destination_url is required" },
        { status: 400 }
      );
    }

    // Generate random 6-char slug if not provided
    if (!code || !code.trim()) {
      code = Math.random().toString(36).substring(2, 8);
    } else {
      code = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    }

    const newLink: ShortLinkTracker = {
      id: body.id || `slk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      title: title?.trim() || `Link to ${destination_url}`,
      destination_url: destination_url.trim(),
      scope: scope === "EVENT" ? "EVENT" : "PLATFORM",
      event_id: event_id || undefined,
      utm_source: utm_source?.trim() || undefined,
      utm_medium: utm_medium?.trim() || undefined,
      utm_campaign: utm_campaign?.trim() || undefined,
      utm_term: utm_term?.trim() || undefined,
      utm_content: utm_content?.trim() || undefined,
      clicks: body.clicks || 0,
      unique_visitors: body.unique_visitors || 0,
      created_at: body.created_at || new Date().toISOString(),
    };

    const saved = serverStore.saveShortLink(newLink);
    return NextResponse.json({ short_link: saved });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save short link" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(req.url);
    const idOrCode = searchParams.get("id") || searchParams.get("code");
    if (!idOrCode) {
      return NextResponse.json({ error: "id or code required" }, { status: 400 });
    }
    const success = serverStore.deleteShortLink(idOrCode);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete short link" },
      { status: 500 }
    );
  }
}
