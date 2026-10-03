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
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const success = serverStore.addUserCommunication(id, {
      channel: body.channel || "EMAIL",
      subject: body.subject || "Message from Organizer",
      content: body.content,
    });

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = serverStore.getUserById(id);
    return NextResponse.json({ success: true, user: updated }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to dispatch communication" }, { status: 500 });
  }
}
