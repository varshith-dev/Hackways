import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const OAUTH_STATE_COOKIE = "google_oauth_state";

// request.url on a self-hosted `next start` server reflects the box's own
// bind address (http://127.0.0.1:3000), not the Host header nginx forwards —
// absolute URLs built from it would send Google a localhost redirect_uri.
// SITE_URL is the one trustworthy source for "what domain are we actually on".
export function siteUrl(): string {
  return process.env.SITE_URL || "http://localhost:3000";
}

/** Starts the Google sign-in flow: stash a CSRF state value, redirect to Google's consent screen. */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", siteUrl()));
  }

  const reqUrl = new URL(req.url);
  const redirectTarget = reqUrl.searchParams.get("redirect") || "/";
  // The redirect target rides along inside state itself — Google round-trips
  // it back to the callback unchanged, so there's no second cookie to manage.
  const state = `${randomBytes(24).toString("hex")}.${encodeURIComponent(redirectTarget)}`;
  const redirectUri = new URL("/api/v1/auth/google/callback", siteUrl()).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // the round trip to Google and back only needs minutes, not days
  });
  // A cached copy of this redirect would carry someone else's state cookie
  // with it (Cloudflare strips Set-Cookie from cached responses, so a second
  // visitor would get redirected to Google with no state cookie at all) —
  // every visit here must mint and set its own.
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
