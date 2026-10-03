import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const user = serverStore.getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await req.json();

    if (body.accountStatus) {
      serverStore.updateUserStatus(id, body.accountStatus);
    }

    if (body.verificationStatus) {
      serverStore.updateUserVerification(id, body.verificationStatus);
    }

    const updated = serverStore.getUserById(id);
    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}
