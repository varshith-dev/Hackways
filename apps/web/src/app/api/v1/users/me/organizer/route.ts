import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, signSessionToken } from "@/lib/sessionToken";
import { serverStore } from "@/lib/serverStore";
import { toUserSession, GO_BACKEND_URL } from "@/lib/authProxy";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const session = verifySessionToken(decodeURIComponent(token));
  if (!session) {
    return NextResponse.json({ error: "Session invalid or expired." }, { status: 401 });
  }

  // Update role to organizer if attendee
  const newRole = session.role === "admin" ? "admin" : "organizer";

  // Attempt to update Go backend if accessible
  try {
    await fetch(`${GO_BACKEND_URL}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${decodeURIComponent(token)}`,
      },
      body: JSON.stringify({ role: newRole }),
      cache: "no-store",
    }).catch(() => {});
  } catch {}

  // Update serverStore user record
  const existingUser = serverStore.getUserById(session.sub);
  serverStore.saveUser({
    id: session.sub,
    name: session.name,
    email: session.email,
    username: existingUser?.username,
    avatar: existingUser?.avatar,
    accountStatus: existingUser?.accountStatus || "ACTIVE",
    verificationStatus: existingUser?.verificationStatus || "VERIFIED",
    accountType: newRole === "admin" ? "ADMIN" : "ORGANIZER",
    joinedDate: existingUser?.joinedDate || new Date().toISOString(),
    lastActive: new Date().toISOString(),
  });

  const nextToken = signSessionToken({
    sub: session.sub,
    email: session.email,
    name: session.name,
    role: newRole,
  });

  const res = NextResponse.json({
    ok: true,
    user: toUserSession({
      id: session.sub,
      email: session.email,
      name: session.name,
      role: newRole,
      username: existingUser?.username,
      avatar: existingUser?.avatar,
    }),
  });

  res.cookies.set(SESSION_COOKIE_NAME, nextToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
