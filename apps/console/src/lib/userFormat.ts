/**
 * Utilities for user usernames and safe display formatting.
 * Strictly prevents internal UUIDs and IDs from ever leaking into the UI.
 */

/**
 * Checks if a string is a UUID or an internal ID (usr_, att_, ev_, etc.).
 */
export function isInternalId(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  // Standard UUID regex (with or without dashes)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{32}$/i.test(trimmed)) return true;
  // Prefixed entity IDs
  if (/^(usr|att|ev|tier|org|team|ch)_[a-zA-Z0-9_\-]+$/i.test(trimmed)) return true;
  return false;
}

/**
 * Auto-allots a clean username from a user's name, email, or id.
 * Format is strictly lowercase alphanumeric + underscore, 3-30 chars.
 */
export function generateAutoUsername(name?: string | null, email?: string | null, id?: string | null): string {
  let base = "";

  if (name && !isInternalId(name)) {
    base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  if (!base && email) {
    const prefix = email.split("@")[0] || "";
    base = prefix
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  if (!base && id) {
    const hex = id.replace(/[^a-z0-9]/gi, "").toLowerCase();
    base = `host_${hex.slice(0, 6)}`;
  }

  if (!base) {
    base = "host";
  }

  if (base.length < 3) {
    const suffix = (id || "123").replace(/[^a-z0-9]/gi, "").toLowerCase();
    base = `${base}_${suffix.slice(0, 4)}`;
  }

  return base.slice(0, 30);
}

/**
 * Validates a username string.
 * Must be 3 to 30 characters of lowercase letters, numbers, and underscores.
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const clean = username.trim().toLowerCase().replace(/^@/, "");
  if (!clean) {
    return { valid: false, error: "Username cannot be empty." };
  }
  if (clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long." };
  }
  if (clean.length > 30) {
    return { valid: false, error: "Username cannot exceed 30 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return { valid: false, error: "Username may only contain lowercase letters, numbers, and underscores." };
  }
  return { valid: true };
}

/**
 * Safely resolves and formats an organizer or host display name.
 * Strictly guarantees raw UUIDs are never returned to the user interface.
 */
export function formatOrganizerDisplay(opts: {
  hostName?: string | null;
  channelName?: string | null;
  username?: string | null;
  name?: string | null;
  organizerId?: string | null;
}): string {
  if (opts.hostName && !isInternalId(opts.hostName)) {
    return opts.hostName;
  }
  if (opts.channelName && !isInternalId(opts.channelName)) {
    return opts.channelName;
  }
  if (opts.username && !isInternalId(opts.username)) {
    const clean = opts.username.trim().replace(/^@/, "");
    return `@${clean}`;
  }
  if (opts.name && !isInternalId(opts.name)) {
    return opts.name;
  }
  if (opts.organizerId) {
    const auto = generateAutoUsername(null, null, opts.organizerId);
    return `@${auto}`;
  }
  return "Event Host";
}
