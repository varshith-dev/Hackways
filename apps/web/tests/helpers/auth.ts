import { createHmac } from "crypto";
import type { Page } from "@playwright/test";

// Must match src/lib/sessionToken.ts default (dev-only fallback secret).
const SECRET = process.env.AUTH_SECRET || "hackways-dev-secret-change-in-production";

export interface TestUser {
  userId: string;
  email: string;
  name: string;
  role: "attendee" | "organizer" | "admin";
}

/** Sign a session token exactly as the Go auth service would. */
export function makeSessionToken(user: TestUser): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.userId, email: user.email, name: user.name, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 })
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", SECRET).update(payload).digest("base64url")}`;
}

/** Seed a fully signed-in session: signed cookie (middleware) + optimistic
 * user cache (instant client hydration). */
export async function seedAuth(page: Page, user: TestUser): Promise<void> {
  const token = makeSessionToken(user);
  // Match playwright.config.ts baseURL — a cookie's host must equal the host
  // the test navigates to, or middleware never sees the session.
  await page.context().addCookies([{ name: "hackways_session", value: token, url: "http://localhost:3000" }]);
  await page.addInitScript((u) => {
    localStorage.setItem("hackways_user_cache_v1", JSON.stringify({ user: u, cachedAt: Date.now() }));
  }, user);
}
