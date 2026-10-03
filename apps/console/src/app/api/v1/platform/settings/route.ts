import { NextResponse } from "next/server";
import { requireSession } from "@/lib/serverAuth";
import { serverStore } from "@/lib/serverStore";
import { isSuperAdminEmail, validateSettingsPatch } from "@/lib/platformSettings";

export async function GET(req: Request) {
  const session = requireSession(req);
  const settings = serverStore.getSettings();
  const isSuperAdmin = !(session instanceof NextResponse) && session.role === "admin" && isSuperAdminEmail(session.email);
  if (session instanceof NextResponse || !isSuperAdmin) {
    return NextResponse.json({
      settings: {
        moduleAccess: settings?.moduleAccess || {
          organizer: ["organizer", "admin"],
          marketing: ["organizer", "admin"],
          kpi: ["admin"],
          checkin: ["organizer", "admin"],
          finance: ["organizer", "admin"],
          team: ["organizer", "admin"],
          channels: ["organizer", "admin"],
        },
        platformFeePercent: typeof settings?.platformFeePercent === "number" ? settings.platformFeePercent : 4,
        paymentGateways: {
          razorpay: {
            keyId: settings?.paymentGateways?.razorpay?.keyId || "",
            enabled: Boolean(settings?.paymentGateways?.razorpay?.enabled),
          },
        },
      },
      canManage: false,
    });
  }
  return NextResponse.json({
    settings,
    canManage: true,
  });
}

export async function PATCH(req: Request) {
  const session = requireSession(req, ["admin"]);
  if (session instanceof NextResponse) return session;
  if (!isSuperAdminEmail(session.email)) {
    return NextResponse.json({ error: "Only the platform super admin can change these settings." }, { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
  const { patch, error } = validateSettingsPatch(body);
  if (!patch) {
    return NextResponse.json({ error: error || "Nothing to update." }, { status: 400 });
  }

  const settings = serverStore.saveSettings(patch, session.email);
  return NextResponse.json({ settings, canManage: true });
}
