import { NextResponse } from "next/server";
import { GO_BACKEND_URL, toUserSession } from "@/lib/authProxy";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";

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

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  try {
    const goRes = await fetch(`${GO_BACKEND_URL}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${decodeURIComponent(token)}`,
      },
      body: JSON.stringify({ name: body.name }),
      cache: "no-store",
    });
    const data = await goRes.json().catch(() => ({}));
    if (!goRes.ok) {
      return NextResponse.json(
        { error: typeof data.error === "string" ? data.error : "Your account couldn't be updated." },
        { status: goRes.status }
      );
    }
    return NextResponse.json({ user: toUserSession(data.user) });
  } catch {
    return NextResponse.json({ error: "Account service is unavailable. Please try again shortly." }, { status: 502 });
  }
}
