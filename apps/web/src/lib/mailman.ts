// Server-side only — MAILMAN_SECRET_KEY must never reach the client bundle,
// so nothing in this file may be imported from a "use client" component.
// Docs: https://mailman.cloudrails.in/docs

// Was http:// — port 443 was unreachable from this VM when this was first
// wired in (confirmed, not assumed, by a real test send). Re-verified fixed
// before switching back.
const MAILMAN_SEND_URL = "https://mailman.cloudrails.in/api/v1/send";

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  recipientName?: string;
  replyTo?: string;
  variables?: Record<string, string>;
  /** Prevents a retried/duplicate call from sending (and billing) the same
   * email twice — Mailman returns the original cached response instead. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const accessCode = process.env.MAILMAN_ACCESS_CODE;
  const secretKey = process.env.MAILMAN_SECRET_KEY;
  if (!accessCode || !secretKey) {
    return { success: false, error: "Mailman is not configured" };
  }

  try {
    const res = await fetch(MAILMAN_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-access-code": accessCode,
        "x-api-secret-key": secretKey,
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      },
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || `Mailman request failed (${res.status})` };
    }
    return { success: true, messageId: data.messageId };
  } catch {
    return { success: false, error: "Mailman is unreachable" };
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
