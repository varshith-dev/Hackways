import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/serverAuth";
import { uploadToAzureBlob } from "@/lib/azureBlob";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".server_data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export async function POST(req: Request) {
  const session = requireSession(req);
  if (session instanceof NextResponse) {
    const referer = req.headers.get("referer") || "";
    const origin = req.headers.get("origin") || "";
    // Allow upload if from console / same-origin app
    if (!referer.includes("/console") && !referer.includes("/events") && !origin) {
      return session;
    }
  }

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

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Primary: Direct upload to Azure Blob Storage (crinmedia)
  const azureUrl = await uploadToAzureBlob(buffer, filename, file.type);
  if (azureUrl) {
    return NextResponse.json({ url: azureUrl }, { status: 201 });
  }

  // 2. Secondary fallback: Local persistent disk
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
