import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SessionClaims, SessionRole, verifySessionToken } from "./sessionToken";

function tokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1)) : undefined;
}

export function getSession(req: Request): SessionClaims | null {
  return verifySessionToken(tokenFromRequest(req));
}

/**
 * Verifies the caller is authenticated and, if roles are given, holds one of them.
 * Returns the claims on success, or a ready-to-return NextResponse on failure —
 * callers do `const s = requireSession(req); if (s instanceof NextResponse) return s;`
 */
export function requireSession(
  req: Request,
  roles?: SessionRole[]
): SessionClaims | NextResponse {
  const claims = getSession(req);
  if (!claims) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (roles && !roles.includes(claims.role)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }
  return claims;
}

/**
 * Reports whether the caller may read/cancel an RSVP: either they can name
 * the email it was registered under (the only proof an anonymous,
 * account-less attendee has), or they're signed in as that attendee, an
 * admin, or the organizer of the event it belongs to.
 */
export function canAccessAttendee(
  req: Request,
  attendeeEmail: string,
  eventOrganizerId: string | undefined,
  claimedEmail?: string
): boolean {
  if (claimedEmail && claimedEmail.trim().toLowerCase() === attendeeEmail.trim().toLowerCase()) {
    return true;
  }
  const session = getSession(req);
  if (!session) return false;
  if (session.role === "admin" || session.email.toLowerCase() === attendeeEmail.trim().toLowerCase()) {
    return true;
  }
  if (session.role === "organizer" && eventOrganizerId && session.sub === eventOrganizerId) {
    return true;
  }
  return false;
}
