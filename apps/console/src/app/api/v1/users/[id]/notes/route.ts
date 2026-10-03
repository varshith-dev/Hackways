import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.content) {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }

    const success = serverStore.addUserNote(id, {
      author: body.author || "Admin",
      category: body.category || "INTERNAL",
      content: body.content,
    });

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = serverStore.getUserById(id);
    return NextResponse.json({ success: true, user: updated }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add note" }, { status: 500 });
  }
}
