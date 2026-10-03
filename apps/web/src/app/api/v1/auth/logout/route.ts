import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/sessionToken";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
