import { createHmac, timingSafeEqual } from "crypto";

// Verifies the HMAC-signed session tokens issued by the Go rsvp-core auth
// service (see services/rsvp-core/internal/auth/auth.go). Both sides must
// share AUTH_SECRET — same format, same default, so tokens issued by one
// verify on the other.
const AUTH_SECRET = process.env.AUTH_SECRET || "hackways-dev-secret-change-in-production";
export const SESSION_COOKIE_NAME = "hackways_session";

export type SessionRole = "attendee" | "organizer" | "admin";

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
  role: SessionRole;
  exp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
}

/** Reissues a session token in the same format the Go auth service signs
 * (see services/rsvp-core/internal/auth/auth.go Issue) — needed wherever a
 * role changes outside that service (e.g. the legacy channel-creation route,
 * which never round-trips through Go) so the browser's cookie reflects it
 * immediately instead of requiring a re-login. */
export function signSessionToken(claims: Omit<SessionClaims, "exp">, ttlSeconds = 7 * 24 * 60 * 60): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Only ever accepts a real HMAC-signed token. A previous fallback here parsed
// the raw cookie as plain JSON and trusted whatever `role`/`sub` it contained
// with no signature check at all — a full auth bypass (anyone could set
// `role: "admin"` directly). That path only ever existed to support the dead
// client-side session writer in lib/auth.ts (setClientSession/getClientSession,
// unused anywhere — the real flow is AuthProvider.tsx's httpOnly cookie) and
// has been removed; nothing else ever depended on it.
export function verifySessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.exp || Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}
