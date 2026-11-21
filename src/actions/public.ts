"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { toActionError, type ActionResult } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { randomToken } from "@/lib/utils";
import { sendEmail } from "@/modules/emails/service";
import { nextTicketNumber } from "@/modules/orders/numbering";
import { getCurrentUser } from "@/modules/auth/session";

/** Inscription newsletter en double opt-in : rien n'est envoyé avant la confirmation. */
export async function subscribeNewsletterAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`nl:${ip}`, 5, 600)).ok) return { ok: false, error: "Trop de tentatives." };
    const email = z.string().trim().toLowerCase().email().max(200).parse(form.get("email"));
    if (form.get("consent") !== "on") return { ok: false, error: "Merci de cocher la case de consentement." };
    const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.status === "confirmed") return { ok: true, message: "Vous êtes déjà inscrit(e)." };
    const token = randomToken();
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email, status: "pending", confirmToken: token, consentSource: "footer", consentIp: ip },
      update: { status: "pending", confirmToken: token, consentSource: "footer", consentIp: ip, unsubscribedAt: null },
    });
    await sendEmail({ type: "newsletter_confirm", to: email, data: { url: `${siteUrl()}/newsletter/confirmation?t=${token}` }, idempotencyKey: `newsletter_confirm:${email}:${token}` });
    return { ok: true, message: "Vérifiez votre boîte mail pour confirmer votre inscription." };
  } catch (e) {
    return toActionError(e);
  }
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  subject: z.string().trim().min(3).max(150),
  orderNumber: z.string().trim().max(40).optional(),
  category: z.enum(["question", "complaint", "gdpr", "other"]),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional(), // pot de miel anti-robot
});

export async function contactAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`contact:${ip}`, 3, 600)).ok) return { ok: false, error: "Trop de messages envoyés. Réessayez plus tard." };
    const parsed = contactSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { ok: false, error: "Merci de vérifier les champs du formulaire.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    const d = parsed.data;
    const user = await getCurrentUser();
    const order = d.orderNumber ? await db.order.findFirst({ where: { number: d.orderNumber, email: d.email } }) : null;
    const ticket = await db.$transaction(async (tx) =>
      tx.supportTicket.create({
        data: {
          number: await nextTicketNumber(tx),
          email: d.email,
          name: d.name,
          subject: d.subject,
          category: d.category,
          userId: user?.id,
          orderId: order?.id,
          messages: { create: { body: d.message, authorId: user?.id } },
        },
      }),
    );
    await sendEmail({ type: "contact_received", to: d.email, data: { name: d.name, subject: d.subject, ticketNumber: ticket.number }, idempotencyKey: `contact_received:${ticket.id}` });
    return { ok: true, message: `Message envoyé. Référence : ${ticket.number}` };
  } catch (e) {
    return toActionError(e);
  }
}
