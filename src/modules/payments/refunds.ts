import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { stripeClient } from "@/integrations/stripe/client";
import { audit } from "@/modules/audit/service";

/**
 * Demande un remboursement Stripe (total ou partiel).
 * Le remboursement est créé en attente ; seul le webhook Stripe le confirme.
 */
export async function requestRefund(args: { orderId: string; amountCents: number; reason?: string; actorId: string; returnRequestId?: string }) {
  const stripe = stripeClient();
  if (!stripe) throw new AppError("Stripe n'est pas configuré : remboursement impossible depuis le site.", "NOT_CONFIGURED", 503);
  if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) throw new AppError("Montant de remboursement invalide.");

  const refund = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: args.orderId }, include: { refunds: true } });
    if (!order) throw new AppError("Commande introuvable.");
    if (!order.stripePaymentIntentId || !["SUCCEEDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(order.paymentStatus))
      throw new AppError("Cette commande n'a pas de paiement remboursable.");
    const pending = order.refunds.filter((r) => r.status === "PENDING").reduce((a, r) => a + r.amountCents, 0);
    const remaining = order.totalCents - order.refundedCents - pending;
    if (args.amountCents > remaining) throw new AppError(`Montant supérieur au reste remboursable (${(remaining / 100).toFixed(2)} €).`);
    const r = await tx.refund.create({
      data: { orderId: order.id, amountCents: args.amountCents, reason: args.reason, requestedById: args.actorId, returnRequestId: args.returnRequestId, status: "PENDING" },
    });
    await audit({ actorId: args.actorId, action: "order.refund.request", entityType: "Order", entityId: order.id, changes: { amountCents: args.amountCents, reason: args.reason ?? null } }, tx);
    return { r, paymentIntent: order.stripePaymentIntentId };
  });

  try {
    const sr = await stripe.refunds.create(
      { payment_intent: refund.paymentIntent, amount: args.amountCents, reason: "requested_by_customer", metadata: { refundId: refund.r.id, orderId: args.orderId } },
      { idempotencyKey: `refund:${refund.r.id}` },
    );
    await db.refund.update({ where: { id: refund.r.id }, data: { stripeRefundId: sr.id, status: sr.status === "failed" ? "FAILED" : "PENDING" } });
  } catch (e) {
    await db.refund.update({ where: { id: refund.r.id }, data: { status: "FAILED" } });
    throw new AppError(`Stripe a refusé le remboursement : ${(e as Error).message}`);
  }
  return refund.r;
}
