import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function GET(req: Request) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const users = serverStore.getUsers();
    return NextResponse.json({ users, count: users.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const data = await req.json();
    if (!data.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = {
      id: data.id || `usr_${Date.now()}`,
      name: data.name || data.email.split("@")[0],
      email: data.email,
      phone: data.phone || "",
      avatar: data.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || data.email)}`,
      accountStatus: data.accountStatus || "ACTIVE",
      verificationStatus: data.verificationStatus || "VERIFIED",
      accountType: data.accountType || "ATTENDEE",
      joinedDate: data.joinedDate || new Date().toISOString(),
      lastActive: new Date().toISOString(),
      notes: data.notes || [],
      communications: data.communications || [],
    };

    const saved = serverStore.saveUser(user);
    return NextResponse.json({ user: saved, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save user" }, { status: 500 });
  }
}
