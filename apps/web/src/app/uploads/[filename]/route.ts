import { readFile } from "fs/promises";
import path from "path";
import { DATA_DIR } from "@/lib/serverStore";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const SAFE_FILENAME = /^[a-f0-9-]+\.(?:png|jpe?g|webp)$/i;
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

// Serves files written by POST /api/v1/uploads. They live outside `public/`
// (in the shared .server_data directory) so this route streams them back.
export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!SAFE_FILENAME.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = filename.split(".").pop()!.toLowerCase();
  try {
    const data = await readFile(path.join(UPLOAD_DIR, filename));
    return new Response(data, {
      headers: {
        "Content-Type": CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
