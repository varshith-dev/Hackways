const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Uploads to the server's persistent file store (/api/v1/uploads) and
// returns the permanent URL it's saved at. Previously this read the file as
// a base64 data URI and handed that back directly — held only in memory/the
// JSON store, never written to disk, so it vanished on a hard refresh and
// bloated the store enough to crash SSR.
export async function readImageFile(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("This image is too large. Choose one smaller than 5MB.");
  }

  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/v1/uploads", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "This image couldn't be uploaded. Please try again.");
  }
  return data.url as string;
}
