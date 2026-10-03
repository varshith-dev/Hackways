import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./sessionToken";
import type { UserSession } from "./types";

export const GO_BACKEND_URL = process.env.RSVP_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // must match auth.TokenTTL in the Go service

/** The Go service's User JSON uses "id"; the frontend's UserSession type uses
 * "userId" everywhere (see lib/types.ts). Every response that hands a Go user
 * object to the client goes through this, so the two never drift apart again. */
export function toUserSession(goUser: { id: string; email: string; name: string; role: string }): UserSession {
  return {
    userId: goUser.id,
    email: goUser.email,
    name: goUser.name,
    role: goUser.role as UserSession["role"],
  };
}

/** Forwards a signup/login body to the Go auth service and, on success, sets the httpOnly session cookie. */
export async function proxyAuth(path: "signup" | "login", body: unknown): Promise<NextResponse> {
  let goRes: Response;
  try {
    goRes = await fetch(`${GO_BACKEND_URL}/api/v1/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "Account service is unavailable. Please try again shortly." },
      { status: 502 }
    );
  }

  const data = await goRes.json().catch(() => ({}));
  if (!goRes.ok) {
    return NextResponse.json(data, { status: goRes.status });
  }

  const res = NextResponse.json({ user: toUserSession(data.user) }, { status: goRes.status });
  res.cookies.set(SESSION_COOKIE_NAME, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
