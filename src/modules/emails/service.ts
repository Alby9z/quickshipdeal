import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { deliverViaResend } from "@/integrations/resend/client";
import { enqueue, QUEUES } from "@/jobs/queues";
import { getSetting } from "@/modules/settings/service";
import { MARKETING_TYPES, renderEmail, type EmailPayloads, type EmailType } from "./templates";

const MAX_ATTEMPTS = 5;

/**
 * Demande l'envoi d'un e-mail transactionnel déclenché par un événement réel.
 * idempotencyKey (ex. "order_confirmation:<orderId>") garantit un seul envoi par événement.
 */
export async function sendEmail<T extends EmailType>(args: {
  type: T;
  to: string;
  data: EmailPayloads[T];
  idempotencyKey: string;
  relatedOrderId?: string;
  marketingConsent?: boolean;
}) {
  if (MARKETING_TYPES.includes(args.type) && !args.marketingConsent) {
    logger.warn({ type: args.type }, "E-mail marketing bloqué : pas de consentement");
    return null;
  }
  const template = await db.emailTemplate.findUnique({ where: { key: args.type } });
  if (template && !template.isEnabled) return null;

  const existing = await db.emailLog.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
  if (existing) return existing; // déjà demandé : pas de doublon

  const business = await getSetting("business");
  const rendered = renderEmail(args.type, args.data, { siteUrl: siteUrl(), business }, template?.intro);
  const log = await db.emailLog
    .create({
      data: {
        idempotencyKey: args.idempotencyKey,
        to: args.to,
        subject: template?.subject && template.subject.trim() ? template.subject : rendered.subject,
        type: args.type,
        payload: args.data as Prisma.InputJsonValue,
        relatedOrderId: args.relatedOrderId,
      },
    })
    .catch(async (e: unknown) => {
      // Course entre deux appels simultanés : la contrainte unique a gagné.
      if ((e as { code?: string }).code === "P2002")
        return db.emailLog.findUniqueOrThrow({ where: { idempotencyKey: args.idempotencyKey } });
      throw e;
    });
  if (log.status !== "QUEUED" || log.attempts > 0) return log;

  const queued = await enqueue(QUEUES.emails, "deliver", { emailLogId: log.id }, `email:${log.id}`).catch(() => false);
  if (!queued) await deliverEmail(log.id); // pas de Redis : envoi immédiat
  return log;
}

/** Envoie réellement un e-mail journalisé. Appelé par le worker (avec tentatives) ou en direct. */
export async function deliverEmail(emailLogId: string) {
  const log = await db.emailLog.findUnique({ where: { id: emailLogId } });
  if (!log || log.status === "SENT" || log.status === "DELIVERED") return log;
  if (log.attempts >= MAX_ATTEMPTS) return log;

  const business = await getSetting("business");
  const template = await db.emailTemplate.findUnique({ where: { key: log.type } });
  const rendered = renderEmail(log.type as EmailType, log.payload as never, { siteUrl: siteUrl(), business }, template?.intro);

  const result = await deliverViaResend({ to: log.to, subject: log.subject, html: rendered.html, idempotencyKey: log.idempotencyKey });
  if (result.status === "not_configured") {
    return db.emailLog.update({
      where: { id: log.id },
      data: { status: "SKIPPED_NOT_CONFIGURED", error: "Resend non configuré (RESEND_API_KEY / EMAIL_FROM)", attempts: { increment: 1 } },
    });
  }
  if (result.status === "error") {
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: result.error, attempts: { increment: 1 } },
    });
    throw new Error(`Échec d'envoi e-mail ${log.id} : ${result.error}`); // le worker réessaiera
  }
  return db.emailLog.update({
    where: { id: log.id },
    data: { status: "SENT", resendId: result.id, sentAt: new Date(), error: null, attempts: { increment: 1 } },
  });
}

/** Relance manuelle depuis l'admin. */
export async function retryEmail(emailLogId: string) {
  await db.emailLog.update({ where: { id: emailLogId }, data: { status: "QUEUED", attempts: 0, error: null } });
  const queued = await enqueue(QUEUES.emails, "deliver", { emailLogId }, `email:${emailLogId}:retry:${Date.now()}`).catch(() => false);
  if (!queued) await deliverEmail(emailLogId).catch(() => undefined);
}
