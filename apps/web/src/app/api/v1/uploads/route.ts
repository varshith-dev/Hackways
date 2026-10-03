import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/serverAuth";
import { DATA_DIR } from "@/lib/serverStore";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

// Persists event banners, channel logos, and other user images to disk so
// they survive a hard refresh (previously held only as base64 data URIs,
// which also bloated the JSON store enough to crash SSR on /home).
export async function POST(req: Request) {
  const session = requireSession(req);
  if (session instanceof NextResponse) return session;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Choose a PNG, JPG, or WebP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "This image is too large. Choose one smaller than 5MB." }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
