import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/sessionToken";

export async function GET() {
  try {
    const channels = serverStore.getChannels();
    return NextResponse.json({ channels, count: channels.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch channels" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await req.json();
    if (!data.name) {
      return NextResponse.json({ error: "Community name is required" }, { status: 400 });
    }

    const channel = {
      id: data.id || `ch_${Date.now()}`,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
      description: data.description || "",
      owner_id: session.sub,
      owner_name: session.name,
      avatar_url: data.avatar_url,
      banner_url: data.banner_url,
      follower_count: data.follower_count || 0,
      verified: !!data.verified,
      created_at: data.created_at || new Date().toISOString(),
      members: data.members || [],
    };

    const saved = serverStore.saveChannel(channel);
    const res = NextResponse.json({ channel: saved, success: true }, { status: 201 });

    // Same reasoning as event creation (see the Go handler): hosting a
    // community isn't role-gated, but the console that manages it is
    // organizer/admin only. Promote on first hosting so the console doesn't
    // silently bounce a brand-new host back to the landing page.
    if (session.role === "attendee") {
      const token = signSessionToken({ sub: session.sub, email: session.email, name: session.name, role: "organizer" });
      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save community" }, { status: 500 });
  }
}
