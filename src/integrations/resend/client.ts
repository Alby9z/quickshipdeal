import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null | undefined;
export function resendClient(): Resend | null {
  if (client !== undefined) return client;
  const key = env().RESEND_API_KEY;
  client = key ? new Resend(key) : null;
  return client;
}

export async function deliverViaResend(msg: { to: string; subject: string; html: string; idempotencyKey: string }) {
  const c = resendClient();
  const from = env().EMAIL_FROM;
  if (!c || !from) return { status: "not_configured" as const };
  const { data, error } = await c.emails.send(
    { from, to: msg.to, subject: msg.subject, html: msg.html, replyTo: env().EMAIL_REPLY_TO },
    { idempotencyKey: msg.idempotencyKey.slice(0, 256) },
  );
  if (error) return { status: "error" as const, error: `${error.name}: ${error.message}` };
  return { status: "sent" as const, id: data?.id };
}
