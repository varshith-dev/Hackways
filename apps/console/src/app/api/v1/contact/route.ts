import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { sendEmail, escapeHtml } from "@/lib/mailman";

const CONTACT_INBOX = "team@hackways.io";

// Same content within the same 10-minute window => same key, so a network
// retry (or an impatient double-click) can't send the message twice; the
// window keeps a legitimately resent identical message, days later, from
// being silently swallowed forever.
function idempotencyKeyFor(email: string, message: string): string {
  const window = Math.floor(Date.now() / (10 * 60 * 1000));
  return createHash("sha256").update(`contact:${email}:${message}:${window}`).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.message !== "string"
  ) {
    return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
  }

  const name = body.name.trim();
  const email = body.email.trim();
  const message = body.message.trim();
  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
  }

  const result = await sendEmail({
    to: CONTACT_INBOX,
    subject: `Message from ${name}`,
    replyTo: email,
    recipientName: "Hackways",
    text: `${message}\n\n—\n${name}\n${email}`,
    html: `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p>—<br>${escapeHtml(name)}<br>${escapeHtml(email)}</p>`,
    idempotencyKey: idempotencyKeyFor(email, message),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Couldn't send your message. Please email us directly instead." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
