import { UserSession } from "./types";

const SESSION_COOKIE_NAME = "hackways_session";

export function getClientSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SESSION_COOKIE_NAME}=`));

    if (match) {
      const val = decodeURIComponent(match.split("=")[1]);
      return JSON.parse(val);
    }

    const stored = localStorage.getItem(SESSION_COOKIE_NAME);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Corrupted session
  }
  return null;
}

export function setClientSession(session: UserSession): void {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(session);
  const encoded = encodeURIComponent(serialized);
  document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=604800; SameSite=Lax`;
  localStorage.setItem(SESSION_COOKIE_NAME, serialized);
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return;

  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
  localStorage.removeItem(SESSION_COOKIE_NAME);
}
