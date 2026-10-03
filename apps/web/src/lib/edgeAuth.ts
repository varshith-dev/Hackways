export const SESSION_COOKIE_NAME = "hackways_session";

export type SessionRole = "attendee" | "organizer" | "admin";

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
  role: SessionRole;
  exp: number;
}

export async function verifySessionTokenEdge(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  try {
    const rawB64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(rawB64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const claims = JSON.parse(jsonStr) as SessionClaims;
    if (!claims.exp || Date.now() / 1000 > claims.exp) return null;

    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      enc.encode(process.env.AUTH_SECRET || "hackways-dev-secret-change-in-production"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigB64 = sig.replace(/-/g, "+").replace(/_/g, "/");
    const binarySig = atob(sigB64);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await globalThis.crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
    if (!isValid) return null;

    return claims;
  } catch {
    return null;
  }
}
