import type { UserSession } from "./types";

/** Optimistic session cache. The real session lives in an httpOnly cookie that
 * client JS cannot read; this mirror exists purely so the UI can paint the
 * signed-in state instantly instead of flashing "Sign in" while
 * /api/v1/auth/me revalidates. The revalidation runs on every mount: a 401
 * clears the cache, a 200 refreshes it. A tampered cache only affects cosmetic
 * UI for one round-trip — the proxy verifies the signed cookie for any
 * protected page/API before responding. */
const USER_CACHE_KEY = "hackways_user_cache_v1";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches Go TokenTTL

interface CachedUser {
  user: UserSession;
  cachedAt: number;
}

function isUserSession(value: unknown): value is UserSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "string" &&
    typeof v.email === "string" &&
    typeof v.name === "string" &&
    (v.role === "organizer" || v.role === "attendee" || v.role === "admin")
  );
}

export function readCachedUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedUser;
    if (!isUserSession(cached.user) || typeof cached.cachedAt !== "number") return null;
    if (Date.now() - cached.cachedAt > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
    return cached.user;
  } catch {
    return null;
  }
}

export function writeCachedUser(user: UserSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, cachedAt: Date.now() } satisfies CachedUser));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {}
}
