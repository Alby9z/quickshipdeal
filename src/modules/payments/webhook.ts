import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { notifyAdmins } from "@/modules/audit/service";
import { sendEmail } from "@/modules/emails/service";
import { enqueue, QUEUES } from "@/jobs/queues";
import { orderSummaryForEmail, transitionOrder } from "@/modules/orders/service";
import { releaseOrder } from "@/modules/checkout/release";
import { createInvoiceForOrder } from "@/modules/orders/invoice";

type AfterCommit = (() => Promise<unknown>)[];

/**
 * Traitement idempotent d'un événement Stripe déjà vérifié (signature contrôlée par la route).
 * Un événement déjà traité est ignoré grâce à ProcessedWebhookEvent (clé primaire = event.id).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<{ duplicate: boolean }> {
  const after: AfterCommit = [];
  try {
    await db.$transaction(
      async (tx) => {
        await tx.processedWebhookEvent.create({ data: { id: event.id, provider: "stripe", type: event.type } });
        await dispatch(tx, event, after);
      },
      { timeout: 20_000 },
    );
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { duplicate: true };
    throw e; // Stripe réessaiera
  }
  for (const fn of after) {
    try {
      await fn();
    } catch (err) {
      logger.error({ err, eventId: event.id }, "Action post-webhook en échec");
    }
  }
  return { duplicate: false };
}

async function dispatch(tx: Tx, event: Stripe.Event, after: AfterCommit) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid") await markOrderPaid(tx, s, after);
      break;
    }
    case "checkout.session.async_payment_failed": {
      const s = event.data.object as Stripe.Checkout.Session;
      await markPaymentFailed(tx, s.metadata?.orderId, null, "Paiement différé refusé", after);
      break;
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.metadata?.orderId;
      if (orderId) after.push(() => releaseOrder(orderId, "Session de paiement expirée"));
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await markPaymentFailed(tx, pi.metadata?.orderId, pi.last_payment_error?.code ?? null, pi.last_payment_error?.message ?? "Paiement refusé", after);
      break;
    }
    case "charge.refunded":
    case "refund.created":
    case "refund.updated": {
      const refunds: Stripe.Refund[] =
        event.type === "charge.refunded" ? ((event.data.object as Stripe.Charge).refunds?.data ?? []) : [event.data.object as Stripe.Refund];
      for (const r of refunds) await syncRefund(tx, r, after);
      break;
    }
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed": {
      const d = event.data.object as Stripe.Dispute;
      const piId = typeof d.payment_intent === "string" ? d.payment_intent : d.payment_intent?.id;
      if (!piId) break;
      const payment = await tx.payment.findUnique({ where: { stripePaymentIntentId: piId }, include: { order: true } });
      if (!payment) break;
      await tx.payment.update({
        where: { id: payment.id },
        data: { disputeId: d.id, disputeStatus: d.status, ...(event.type === "charge.dispute.created" ? { status: "DISPUTED" } : {}) },
      });
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: event.type === "charge.dispute.closed" && d.status === "won" ? "SUCCEEDED" : "DISPUTED" } });
      await notifyAdmins({ level: "error", type: "dispute", title: `Litige ${d.status} — ${payment.order.number}`, body: `Motif : ${d.reason}`, link: `/admin/commandes/${payment.orderId}` }, tx);
      break;
    }
    default:
      break;
  }
}

async function markOrderPaid(tx: Tx, s: Stripe.Checkout.Session, after: AfterCommit) {
  const orderId = s.metadata?.orderId ?? s.client_reference_id;
  if (!orderId) throw new Error(`Session ${s.id} sans référence de commande`);
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
  if (!order) throw new Error(`Commande ${orderId} introuvable pour la session ${s.id}`);
  if (order.paymentStatus === "SUCCEEDED") return; // déjà confirmée

  // Contrôle de cohérence : montant et devise doivent correspondre exactement.
  if (s.amount_total !== order.totalCents || (s.currency ?? "").toUpperCase() !== order.currency) {
    await notifyAdmins({ level: "error", type: "payment_mismatch", title: `Montant incohérent — ${order.number}`, body: `Stripe : ${s.amount_total} ${s.currency}, commande : ${order.totalCents} ${order.currency}`, link: `/admin/commandes/${order.id}` }, tx);
    throw new Error(`Montant payé incohérent pour la commande ${order.number}`);
  }

  const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
  const wasCancelled = order.status === "CANCELLED";

  await tx.payment.updateMany({
    where: { orderId: order.id, status: { in: ["PENDING", "FAILED", "CANCELLED"] } },
    data: { status: "SUCCEEDED", stripePaymentIntentId: piId, amountCents: s.amount_total ?? order.totalCents, paymentMethodType: s.payment_method_types?.[0] ?? null },
  });
  await tx.order.update({
    where: { id: order.id },
    data: { paymentStatus: "SUCCEEDED", paidAt: new Date(), stripePaymentIntentId: piId, stripeCheckoutSessionId: s.id },
  });

  // Stock : la réservation devient une sortie définitive.
  for (const i of order.items) {
    if (!i.product?.trackInventory) continue;
    const where = i.variantId ? { variantId: i.variantId } : { productId: i.productId! };
    const inv = await tx.inventory.findUnique({ where: where as never });
    if (!inv) continue;
    if (wasCancelled) {
      // Paiement arrivé après expiration (rare) : sortie directe sans réservation.
      await tx.$executeRaw`UPDATE "Inventory" SET "quantity" = GREATEST(0, "quantity" - ${i.quantity}), "updatedAt" = now() WHERE "id" = ${inv.id}`;
    } else {
      await tx.$executeRaw`UPDATE "Inventory" SET "quantity" = GREATEST(0, "quantity" - ${i.quantity}), "reserved" = GREATEST(0, "reserved" - ${i.quantity}), "updatedAt" = now() WHERE "id" = ${inv.id}`;
    }
    const after = await tx.inventory.findUnique({ where: { id: inv.id } });
    if (after && after.quantity - after.reserved <= after.lowStockThreshold) {
      await tx.product.update({ where: { id: i.productId! }, data: { availability: after.quantity - after.reserved <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK" } });
    }
  }
  for (const i of order.items) {
    if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { salesCount: { increment: i.quantity } } });
  }
  if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
  if (order.userId) await tx.cart.updateMany({ where: { userId: order.userId, status: "active" }, data: { status: "converted" } });

  await transitionOrder(tx, order.id, "PAID", { message: "Paiement confirmé par Stripe", force: wasCancelled });
  await transitionOrder(tx, order.id, "CONFIRMED", { message: "Commande validée" });
  if (wasCancelled) {
    await notifyAdmins({ level: "warning", type: "late_payment", title: `Paiement reçu après expiration — ${order.number}`, body: "Vérifier la disponibilité fournisseur.", link: `/admin/commandes/${order.id}` }, tx);
  }
  const invoice = await createInvoiceForOrder(tx, order.id);

  after.push(async () => {
    const full = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    await sendEmail({ type: "order_confirmation", to: full.email, data: { order: orderSummaryForEmail(full) }, idempotencyKey: `order_confirmation:${full.id}`, relatedOrderId: full.id });
    await sendEmail({
      type: "invoice_available",
      to: full.email,
      data: { orderNumber: full.number, invoiceNumber: invoice.number, url: full.userId ? `${siteUrl()}/compte/commandes/${full.number}` : `${siteUrl()}/suivi-commande?commande=${full.number}&cle=${full.guestAccessToken}` },
      idempotencyKey: `invoice_available:${invoice.id}`,
      relatedOrderId: full.id,
    });
    // Déclenchement du traitement fournisseur (asynchrone, avec tentatives).
    const queued = await enqueue(QUEUES.supplierOrders, "place", { orderId: full.id }, `supplier-order:${full.id}`).catch(() => false);
    if (!queued) {
      await notifyAdmins({ level: "warning", type: "supplier_order_manual", title: `Commande ${full.number} à transmettre au fournisseur`, body: "File de tâches indisponible : transmission manuelle requise.", link: `/admin/commandes/${full.id}` });
    }
  });
}

async function markPaymentFailed(tx: Tx, orderId: string | undefined, code: string | null, message: string, after: AfterCommit) {
  if (!orderId) return;
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === "SUCCEEDED") return;
  await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "FAILED", failureCode: code, failureMessage: message.slice(0, 500) } });
  await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
  await tx.orderEvent.create({ data: { orderId, toStatus: order.status, message: "Tentative de paiement refusée", isPublic: false } });
  after.push(() =>
    sendEmail({ type: "payment_failed", to: order.email, data: { orderNumber: order.number, retryUrl: `${siteUrl()}/panier` }, idempotencyKey: `payment_failed:${orderId}:${code ?? "x"}`, relatedOrderId: orderId }),
  );
}

async function syncRefund(tx: Tx, r: Stripe.Refund, after: AfterCommit) {
  const status: Prisma.RefundUpdateInput["status"] =
    r.status === "succeeded" ? "SUCCEEDED" : r.status === "failed" ? "FAILED" : r.status === "canceled" ? "CANCELLED" : "PENDING";
  const piId = typeof r.payment_intent === "string" ? r.payment_intent : r.payment_intent?.id;
  let refund = await tx.refund.findUnique({ where: { stripeRefundId: r.id } });
  if (!refund && r.metadata?.refundId) refund = await tx.refund.findUnique({ where: { id: r.metadata.refundId } });
  if (!refund) {
    // Remboursement effectué directement depuis le tableau de bord Stripe.
    const order = piId ? await tx.order.findUnique({ where: { stripePaymentIntentId: piId } }) : null;
    if (!order) return;
    refund = await tx.refund.create({ data: { orderId: order.id, amountCents: r.amount, stripeRefundId: r.id, reason: "Remboursement effectué depuis Stripe", status: "PENDING" } });
  }
  const wasSucceeded = refund.status === "SUCCEEDED";
  await tx.refund.update({ where: { id: refund.id }, data: { status, stripeRefundId: r.id } });
  if (status !== "SUCCEEDED" || wasSucceeded) return;

  const order = await tx.order.findUniqueOrThrow({ where: { id: refund.orderId } });
  const refunded = Math.min(order.totalCents, order.refundedCents + refund.amountCents);
  const full = refunded >= order.totalCents;
  await tx.order.update({ where: { id: order.id }, data: { refundedCents: refunded, paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  await tx.payment.updateMany({ where: { orderId: order.id, status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "DISPUTED"] } }, data: { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  await transitionOrder(tx, order.id, full ? "REFUNDED" : "PARTIALLY_REFUNDED", { message: `Remboursement de ${(refund.amountCents / 100).toFixed(2)} €`, force: true });
  await createInvoiceForOrder(tx, order.id, { creditNoteCents: refund.amountCents });
  after.push(() =>
    sendEmail({ type: "refund_confirmed", to: order.email, data: { orderNumber: order.number, amountCents: refund!.amountCents }, idempotencyKey: `refund_confirmed:${refund!.id}`, relatedOrderId: order.id }),
  );
}
