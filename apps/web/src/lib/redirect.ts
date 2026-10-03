/** Only same-origin relative paths are valid post-auth redirect targets.
 * Rejects absolute URLs, protocol-relative URLs, and anything not starting
 * with exactly one slash. */
export function safeRedirectTarget(value: string | null | undefined, fallback = "/home"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    // eslint-disable-next-line no-new
    new URL(value, "http://local");
  } catch {
    return fallback;
  }
  return value;
}
