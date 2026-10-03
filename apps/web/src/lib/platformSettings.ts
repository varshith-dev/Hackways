import type { SessionRole } from "./sessionToken";

/** Accounts allowed to open /console/super-admin and change module access,
 * the platform fee, and payment gateways. Configurable via env (comma
 * separated) so this isn't hardcoded in production; falls back to the known
 * operator email for local dev. */
export const SUPER_ADMIN_EMAILS: string[] = (process.env.SUPER_ADMIN_EMAILS || "varshith.code@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email: string | undefined | null): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Console modules a super admin can allot to roles. `users` and
 * `super-admin` are permanently admin-only and not part of the matrix. */
export const CONSOLE_MODULES = [
  { id: "organizer", label: "Organizer console" },
  { id: "marketing", label: "Marketing suite" },
  { id: "kpi", label: "Platform analytics" },
  { id: "checkin", label: "Door check-in" },
  { id: "finance", label: "Payouts & finance" },
  { id: "team", label: "Co-organizer" },
  { id: "channels", label: "Communities" },
] as const;

export type ConsoleModuleId = (typeof CONSOLE_MODULES)[number]["id"];

export interface GatewayConfig {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  accountId?: string;
  publishableKey?: string;
  autoFailoverThreshold?: string;
  enabled?: boolean;
}

export interface PlatformSettings {
  /** module id -> roles allowed to open it */
  moduleAccess: Record<ConsoleModuleId, SessionRole[]>;
  /** platform fee collected on top of the ticket price for paid events, in percent */
  platformFeePercent: number;
  /** global payment gateway configurations managed by super admin */
  paymentGateways?: {
    razorpay?: GatewayConfig;
    stripe?: GatewayConfig;
    phonepe?: GatewayConfig;
  };
  updatedAt: string;
  updatedBy: string;
}

export function defaultPlatformSettings(): PlatformSettings {
  return {
    moduleAccess: {
      organizer: ["organizer", "admin"],
      marketing: ["organizer", "admin"],
      kpi: ["admin"],
      checkin: ["organizer", "admin"],
      finance: ["organizer", "admin"],
      team: ["organizer", "admin"],
      channels: ["organizer", "admin"],
    },
    platformFeePercent: 3,
    paymentGateways: {
      razorpay: { enabled: false },
      stripe: { enabled: false },
      phonepe: { enabled: false },
    },
    updatedAt: "",
    updatedBy: "",
  };
}

export function canAccessModule(settings: PlatformSettings, moduleId: string, role: SessionRole): boolean {
  if (moduleId === "users" || moduleId === "super-admin") return role === "admin";
  const allowed = settings.moduleAccess[moduleId as ConsoleModuleId];
  return allowed ? allowed.includes(role) : false;
}

/** Validate a PATCH body; returns a sanitized partial or an error string. */
export function validateSettingsPatch(body: unknown): { patch?: Partial<Pick<PlatformSettings, "moduleAccess" | "platformFeePercent" | "paymentGateways">>; error?: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request payload." };
  const input = body as Record<string, unknown>;
  const patch: Partial<Pick<PlatformSettings, "moduleAccess" | "platformFeePercent" | "paymentGateways">> = {};

  if (input.platformFeePercent !== undefined) {
    const fee = Number(input.platformFeePercent);
    if (!Number.isFinite(fee) || fee < 0 || fee > 50) {
      return { error: "Platform fee must be a number between 0 and 50." };
    }
    patch.platformFeePercent = Math.round(fee * 100) / 100;
  }

  if (input.paymentGateways !== undefined && typeof input.paymentGateways === "object" && input.paymentGateways !== null) {
    patch.paymentGateways = input.paymentGateways as PlatformSettings["paymentGateways"];
  }

  if (input.moduleAccess !== undefined) {
    if (!input.moduleAccess || typeof input.moduleAccess !== "object") return { error: "moduleAccess must be an object." };
    const validRoles: SessionRole[] = ["attendee", "organizer", "admin"];
    const matrix = {} as Record<ConsoleModuleId, SessionRole[]>;
    for (const mod of CONSOLE_MODULES) {
      const value = (input.moduleAccess as Record<string, unknown>)[mod.id];
      if (value === undefined) continue;
      if (!Array.isArray(value) || value.length === 0 || !value.every((r) => validRoles.includes(r as SessionRole))) {
        return { error: `Access for "${mod.label}" must be a non-empty list of roles.` };
      }
      matrix[mod.id] = [...new Set(value as SessionRole[])];
    }
    if (Object.keys(matrix).length > 0) patch.moduleAccess = matrix;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update." };
  return { patch };
}
