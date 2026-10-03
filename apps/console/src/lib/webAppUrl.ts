// In production on hackways.me, all routes (/events, /login, /channels, /profile, /console)
// are reverse-proxied under the exact same domain (hackways.me).
// In development, Next.js apps run on port 3000 (web) and 3001 (console).
export const WEB_APP_URL =
  process.env.NEXT_PUBLIC_WEB_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? window.location.origin
    : process.env.NODE_ENV === "production"
    ? "https://hackways.me"
    : "http://localhost:3000");

export function webAppHref(path: string): string {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    // Both apps are unified on same domain via Nginx proxy in production
    return path.startsWith("/") ? path : `/${path}`;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${WEB_APP_URL}${cleanPath}`;
}
