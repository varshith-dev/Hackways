import { NextResponse } from "next/server";
import { GO_BACKEND_URL, toUserSession } from "@/lib/authProxy";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";

// Deliberately not a local JWT decode: the token's claims are frozen at
// issuance, so a decode-only /me kept showing the name/role as of login even
// after a real update (e.g. via PATCH /api/v1/users/me) changed the row.
// Proxying to Go's /me, which re-reads the user by ID, is the only way this
// reflects current state.
export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
      cache: "no-store",
    });
    if (!goRes.ok) {
      return NextResponse.json({ user: null }, { status: goRes.status === 401 ? 401 : 200 });
    }
    const data = await goRes.json();
    return NextResponse.json({ user: toUserSession(data.user) });
  } catch {
    return NextResponse.json({ user: null }, { status: 502 });
  }
}
