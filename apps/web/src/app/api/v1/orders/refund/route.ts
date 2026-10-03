import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSession } from "@/lib/serverAuth";

export async function POST(req: Request) {
  const session = requireSession(req, ["organizer", "admin"]);
  if (session instanceof NextResponse) return session;

  try {
    const { orderId, reason } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId parameter" }, { status: 400 });
    }

    const result = serverStore.refundOrder(orderId, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: result.message, order: result.order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process refund" }, { status: 500 });
  }
}
