import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Statuts de délivrabilité Resend (signés Svix). Met à jour l'historique des e-mails. */
export async function POST(req: Request) {
  const secret = env().RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Non configuré" }, { status: 503 });
  const body = await req.text();
  let evt: { type: string; data: { email_id?: string } };
  try {
    evt = new Webhook(secret).verify(body, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as unknown as typeof evt;
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }
  const id = evt.data.email_id;
  if (id) {
    const status = evt.type === "email.delivered" ? "DELIVERED" : evt.type === "email.bounced" ? "BOUNCED" : evt.type === "email.failed" ? "FAILED" : null;
    if (status) await db.emailLog.updateMany({ where: { resendId: id }, data: { status } });
  }
  return NextResponse.json({ received: true });
}
