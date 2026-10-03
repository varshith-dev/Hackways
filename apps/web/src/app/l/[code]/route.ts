import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) {
    return NextResponse.redirect(new URL("/", req.url), { status: 307 });
  }

  const shortLink = serverStore.getShortLinkByCode(code);
  if (!shortLink) {
    return NextResponse.redirect(new URL("/", req.url), { status: 307 });
  }

  // Increment click counter
  serverStore.recordShortLinkClick(code);

  // Construct target redirect destination
  try {
    let dest = shortLink.destination_url.trim();
    const isAbsolute = dest.startsWith("http://") || dest.startsWith("https://");
    const targetUrl = isAbsolute ? new URL(dest) : new URL(dest.startsWith("/") ? dest : `/${dest}`, req.url);

    // Append UTM tags if present on the tracker
    if (shortLink.utm_source && !targetUrl.searchParams.has("utm_source")) {
      targetUrl.searchParams.set("utm_source", shortLink.utm_source);
    }
    if (shortLink.utm_medium && !targetUrl.searchParams.has("utm_medium")) {
      targetUrl.searchParams.set("utm_medium", shortLink.utm_medium);
    }
    if (shortLink.utm_campaign && !targetUrl.searchParams.has("utm_campaign")) {
      targetUrl.searchParams.set("utm_campaign", shortLink.utm_campaign);
    }
    if (shortLink.utm_term && !targetUrl.searchParams.has("utm_term")) {
      targetUrl.searchParams.set("utm_term", shortLink.utm_term);
    }
    if (shortLink.utm_content && !targetUrl.searchParams.has("utm_content")) {
      targetUrl.searchParams.set("utm_content", shortLink.utm_content);
    }
    targetUrl.searchParams.set("sc", shortLink.code);

    return NextResponse.redirect(targetUrl, { status: 307 });
  } catch {
    return NextResponse.redirect(new URL("/", req.url), { status: 307 });
  }
}
