import { NextResponse } from "next/server";
import { GO_BACKEND_URL, toUserSession } from "@/lib/authProxy";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";
import { serverStore } from "@/lib/serverStore";
import { validateUsername, isInternalId } from "@/lib/userFormat";

export async function PATCH(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (!token) {
    return NextResponse.json({ error: "Sign in to update your account." }, { status: 401 });
  }

  const session = verifySessionToken(decodeURIComponent(token));
  if (!session) {
    return NextResponse.json({ error: "Session invalid or expired. Please sign in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const userId = session.sub;
  const userEmail = session.email;

  let cleanUsername: string | undefined;
  if (typeof body.username === "string" && body.username.trim()) {
    const rawUsername = body.username.trim().toLowerCase().replace(/^@/, "");
    const valResult = validateUsername(rawUsername);
    if (!valResult.valid) {
      return NextResponse.json({ error: valResult.error }, { status: 400 });
    }

    // Check uniqueness against other users
    const existing = serverStore.getUserByUsername(rawUsername);
    if (existing && existing.id !== userId && existing.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: `The username @${rawUsername} is already taken. Please choose another.` },
        { status: 409 }
      );
    }
    cleanUsername = rawUsername;
  }

  const updatedName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
  const updatedAvatar = typeof body.avatar === "string" && body.avatar.trim() ? body.avatar.trim() : undefined;

  // If name or avatar is being updated, pass to Go backend
  let goUser: any = null;
  if (updatedName || updatedAvatar) {
    try {
      const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${decodeURIComponent(token)}`,
        },
        body: JSON.stringify({ name: updatedName, avatar: updatedAvatar }),
        cache: "no-store",
      });
      const data = await goRes.json().catch(() => ({}));
      if (goRes.ok && data.user) {
        goUser = data.user;
      }
    } catch {
      // If Go service is unreachable, continue with local update
    }
  }

  // Update serverStore user record
  const existingUser = serverStore.getUserById(userId);
  const finalName = updatedName || goUser?.name || existingUser?.name || session.name;
  const finalUsername = cleanUsername || existingUser?.username;
  const finalAvatar = updatedAvatar || goUser?.avatar || existingUser?.avatar;

  serverStore.saveUser({
    id: userId,
    name: finalName,
    email: userEmail,
    username: finalUsername,
    avatar: finalAvatar,
    accountStatus: existingUser?.accountStatus || "ACTIVE",
    verificationStatus: existingUser?.verificationStatus || "VERIFIED",
    accountType: (existingUser?.accountType || (session.role === "organizer" ? "ORGANIZER" : "ATTENDEE")),
    joinedDate: existingUser?.joinedDate || new Date().toISOString(),
    lastActive: new Date().toISOString(),
  });

  // If username was updated, update any events organized by this user
  if (cleanUsername) {
    const events = serverStore.getEvents();
    for (const ev of events) {
      if (ev.organizer_id === userId || ev.organizer_id === userEmail) {
        ev.organizer_username = cleanUsername;
        if (ev.hosts && ev.hosts.length > 0 && (isInternalId(ev.hosts[0]) || ev.hosts[0].startsWith("@"))) {
          ev.hosts[0] = `@${cleanUsername}`;
        }
      }
    }
  }

  return NextResponse.json({
    user: toUserSession({
      id: userId,
      email: userEmail,
      name: finalName,
      role: session.role,
      username: finalUsername,
      avatar: finalAvatar,
    }),
  });
}
