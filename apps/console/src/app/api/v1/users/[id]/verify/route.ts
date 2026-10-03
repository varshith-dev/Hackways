import { NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { sendEmail, escapeHtml } from "@/lib/mailman";
import { requireSession } from "@/lib/serverAuth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const user = serverStore.getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = crypto.randomUUID();
  serverStore.updateUserVerification(user.id, "PENDING", token);

  const verifyUrl = `https://hackways.me/verify?token=${token}&id=${encodeURIComponent(user.id)}`;

  const emailResult = await sendEmail({
    to: user.email,
    recipientName: user.name || "User",
    subject: "Verify your Hackways account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #09090b;">Verify your Hackways account</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin-bottom: 24px;">
          Hi ${escapeHtml(user.name || "there")},<br/><br/>
          Please verify your email address by clicking the button below. Once verified, you will have unrestricted access to host events, book passes, and manage registrations.
        </p>
        <div style="margin: 28px 0;">
          <a href="${verifyUrl}" style="background-color: #09090b; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
            Verify My Account
          </a>
        </div>
        <p style="font-size: 12px; color: #71717a; margin-top: 32px; border-top: 1px solid #f4f4f5; pt: 16px;">
          Or copy and paste this verification link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
    `,
    text: `Verify your Hackways account: ${verifyUrl}`,
  });

  serverStore.addUserCommunication(user.id, {
    channel: "EMAIL",
    subject: "Account Verification Request",
    content: `Verification email dispatched with secure token. Status set to PENDING. (Mailman delivery: ${emailResult.success ? "DELIVERED" : "QUEUED/SIMULATED"})`,
  });

  return NextResponse.json({
    success: true,
    verificationStatus: "PENDING",
    emailDispatched: emailResult.success,
    token,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const user = serverStore.getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body.status === "UNVERIFIED" ? "UNVERIFIED" : body.status === "PENDING" ? "PENDING" : "VERIFIED";

  serverStore.updateUserVerification(user.id, status);

  serverStore.addUserNote(user.id, {
    author: "Super Admin",
    category: "MODERATION",
    content: `Manual verification status updated to ${status}.`,
  });

  return NextResponse.json({
    success: true,
    verificationStatus: status,
  });
}
