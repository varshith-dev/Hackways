import { NextResponse } from "next/server";
import { proxyAuth } from "@/lib/authProxy";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  return proxyAuth("login", body);
}
