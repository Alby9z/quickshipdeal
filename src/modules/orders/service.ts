import type { OrderStatus, Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { AppError, NotFoundError } from "@/lib/errors";
import { audit } from "@/modules/audit/service";
import { sendEmail } from "@/modules/emails/service";
import type { EmailType } from "@/modules/emails/templates";
import { canTransition, ORDER_STATUS_LABELS } from "./status";

export function orderTrackingUrl(order: { number: string; guestAccessToken: string | null; userId: string | null }) {
  if (order.userId) return `${siteUrl()}/compte/commandes/${order.number}`;
  return `${siteUrl()}/suivi-commande?commande=${encodeURIComponent(order.number)}&cle=${order.guestAccessToken ?? ""}`;
}

/**
 * Change le statut d'une commande en respectant la machine à états,
 * enregistre l'événement (timeline) et l'audit, dans la transaction fournie.
 */
export async function transitionOrder(
  tx: Tx,
  orderId: string,
  to: OrderStatus,
  opts: { actorId?: string | null; message?: string; isPublic?: boolean; force?: boolean } = {},
) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Commande introuvable");
  if (order.status === to) return { order, changed: false };
  if (!opts.force && !canTransition(order.status, to)) {
    throw new AppError(`Transition interdite : ${ORDER_STATUS_LABELS[order.status]} → ${ORDER_STATUS_LABELS[to]}`, "INVALID_TRANSITION");
  }
  const updated = await tx.order.update({
    where: { id: orderId },
    data: {
      status: to,
      ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}),
    },
  });
  await tx.orderEvent.create({
    data: { orderId, fromStatus: order.status, toStatus: to, message: opts.message, isPublic: opts.isPublic ?? true, actorId: opts.actorId ?? null },
  });
  await audit({ actorId: opts.actorId, action: "order.status", entityType: "Order", entityId: orderId, changes: { from: order.status, to } }, tx);
  return { order: updated, changed: true };
}

/** E-mail client associé à un statut (appelé APRÈS la transaction). */
const STATUS_EMAIL: Partial<Record<OrderStatus, EmailType>> = {
  SUPPLIER_ORDERED: "order_supplier_sent",
  SUPPLIER_PROCESSING: "order_processing",
  DELIVERED: "order_delivered",
  CANCELLED: "order_cancelled",
};

export async function notifyStatusChange(orderId: string, status: OrderStatus, reason?: string) {
  const type = STATUS_EMAIL[status];
  if (!type) return;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const trackingUrl = orderTrackingUrl(order);
  const data =
    type === "order_cancelled"
      ? { orderNumber: order.number, reason: reason ?? null }
      : { orderNumber: order.number, trackingUrl };
  await sendEmail({ type, to: order.email, data: data as never, idempotencyKey: `${type}:${order.id}`, relatedOrderId: order.id });
}

/** Changement manuel de statut par un administrateur. */
/** Statuts que seul un webhook Stripe peut poser : jamais de paiement ou remboursement déclaré à la main. */
export const WEBHOOK_ONLY_STATUSES: OrderStatus[] = ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"];

export async function adminSetOrderStatus(orderId: string, to: OrderStatus, actorId: string, message?: string) {
  if (WEBHOOK_ONLY_STATUSES.includes(to)) throw new AppError("Ce statut est posé automatiquement par Stripe (paiement ou remboursement confirmé).");
  const res = await db.$transaction((tx) => transitionOrder(tx, orderId, to, { actorId, message }));
  if (res.changed) await notifyStatusChange(orderId, to, message);
  return res.order;
}

export function orderSummaryForEmail(order: Prisma.OrderGetPayload<{ include: { items: true } }>) {
  return {
    number: order.number,
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    discountCents: order.discountCents,
    items: order.items.map((i) => ({ name: i.variantName ? `${i.productName} (${i.variantName})` : i.productName, quantity: i.quantity, lineTotalCents: i.lineTotalCents })),
    trackingUrl: orderTrackingUrl(order),
  };
}
