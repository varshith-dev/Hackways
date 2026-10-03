import { NextResponse } from "next/server";
import { GO_BACKEND_URL } from "@/lib/authProxy";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";
import { OAUTH_STATE_COOKIE, siteUrl } from "../route";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // must match auth.TokenTTL in the Go service

function failure(reason: string) {
  return NextResponse.redirect(new URL(`/login?error=${reason}`, siteUrl()));
}

/** Finishes the Google sign-in flow: exchange the code, verify the identity with Google itself, hand off to the Go auth service. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // The cookie's raw wire value is percent-encoded (it contains a literal "%"
  // from state's own encodeURIComponent'd redirect target), but
  // url.searchParams.get("state") already decoded Google's query param once
  // — comparing against the raw cookie slice without decoding it the same
  // way means a "/" redirect target can never match.
  const cookieHeader = req.headers.get("cookie") || "";
  const rawExpectedState = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);
  const expectedState = rawExpectedState ? decodeURIComponent(rawExpectedState) : undefined;

  if (!code || !state || !expectedState || state !== expectedState) {
    return failure("google_state_mismatch");
  }
  const redirectTarget = decodeURIComponent(state.split(".")[1] || "/") || "/";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return failure("google_not_configured");
  }

  const redirectUri = new URL("/api/v1/auth/google/callback", siteUrl()).toString();

  // 1. Exchange the authorization code for tokens, at Google — never trust a
  // code we didn't just mint the exchange for ourselves.
  let accessToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return failure("google_token_exchange_failed");
    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    if (!accessToken) return failure("google_token_exchange_failed");
  } catch {
    return failure("google_unreachable");
  }

  // 2. Ask Google who that access token actually belongs to — this is the
  // verification step; we never decode Google's id_token ourselves.
  let profile: { sub?: string; email?: string; email_verified?: boolean; name?: string };
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) return failure("google_profile_failed");
    profile = await profileRes.json();
  } catch {
    return failure("google_unreachable");
  }

  if (!profile.sub || !profile.email || !profile.email_verified) {
    return failure("google_email_unverified");
  }

  // 3. Hand the verified identity to the Go auth service — same find-or-create
  // + session-issuing path signup/login use, over the loopback-only backend.
  let goRes: Response;
  try {
    goRes = await fetch(`${GO_BACKEND_URL}/api/v1/auth/oauth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, name: profile.name, google_id: profile.sub }),
    });
  } catch {
    return failure("account_service_unavailable");
  }

  const data = await goRes.json().catch(() => ({}));
  if (!goRes.ok) {
    return failure("google_account_failed");
  }

  // Must be a same-site path — never follow state into an off-site redirect.
  const safeTarget = redirectTarget.startsWith("/") && !redirectTarget.startsWith("//") ? redirectTarget : "/";

  // Route admins straight to the super-admin dashboard when no explicit
  // redirect was requested (the state only carries "/" or "/home" in that case).
  const isGenericTarget = safeTarget === "/" || safeTarget === "/home";
  const userRole = data.user?.role ?? "";
  const finalTarget = isGenericTarget && userRole === "admin"
    ? "/console/super-admin/overview"
    : safeTarget;

  const res = NextResponse.redirect(new URL(finalTarget, siteUrl()));
  res.cookies.set(SESSION_COOKIE_NAME, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
