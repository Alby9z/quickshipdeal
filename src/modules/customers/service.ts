import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { audit } from "@/modules/audit/service";
import { nextReturnNumber } from "@/modules/orders/numbering";
import { sendEmail } from "@/modules/emails/service";
import { transitionOrder } from "@/modules/orders/service";
import { getSetting } from "@/modules/settings/service";

/** Export RGPD (droit d'accès / portabilité) : toutes les données personnelles du compte. */
export async function exportUserData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, emailVerified: true, createdAt: true,
      profile: { select: { firstName: true, lastName: true, phone: true, marketingOptIn: true, marketingOptInAt: true } },
      addresses: { where: { deletedAt: null } },
      orders: { include: { items: true, shipments: true, invoices: { select: { number: true, issuedAt: true, totalCents: true } } } },
      reviews: true,
      returnRequests: true,
      supportTickets: { include: { messages: true } },
      wishlist: { include: { items: { select: { productId: true, createdAt: true } } } },
      sessions: { select: { createdAt: true, ipAddress: true, userAgent: true, expiresAt: true } },
    },
  });
  const newsletter = await db.newsletterSubscriber.findUnique({ where: { email: user.email } });
  return { exportedAt: new Date().toISOString(), user, newsletter };
}

/**
 * Suppression du compte (droit à l'effacement) : les données personnelles sont anonymisées.
 * Les commandes et factures sont conservées (obligation comptable de 10 ans) mais détachées du compte.
 */
export async function anonymizeUser(userId: string, actorId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const open = await db.order.count({ where: { userId, status: { in: ["PAID", "CONFIRMED", "SUPPLIER_PROCESSING", "SUPPLIER_ORDERED", "AWAITING_SHIPMENT", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RETURN_REQUESTED"] } } });
  if (open > 0) throw new AppError("Des commandes sont en cours : la suppression sera possible après leur livraison ou clôture.");
  const anonEmail = `supprime-${user.id}@anonyme.invalid`;
  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.cart.deleteMany({ where: { userId } });
    await tx.wishlist.deleteMany({ where: { userId } });
    await tx.recentlyViewed.deleteMany({ where: { userId } });
    await tx.customerProfile.updateMany({ where: { userId }, data: { firstName: null, lastName: null, phone: null, marketingOptIn: false, notesInternal: null } });
    await tx.newsletterSubscriber.deleteMany({ where: { email: user.email } });
    await tx.order.updateMany({ where: { userId }, data: { userId: null } });
    await tx.user.update({ where: { id: userId }, data: { name: "Compte supprimé", email: anonEmail, image: null, deletedAt: new Date(), anonymizedAt: new Date(), isBlocked: true } });
    await audit({ actorId, action: "customer.anonymize", entityType: "User", entityId: userId }, tx);
  });
}

/** Demande de retour (rétractation ou réclamation) par le client. */
export async function createReturnRequest(args: { userId: string | null; orderId: string; items: { orderItemId: string; quantity: number }[]; reason: string; details?: string; isWithdrawal: boolean }) {
  const store = await getSetting("store");
  const order = await db.order.findUniqueOrThrow({ where: { id: args.orderId }, include: { items: true, shipments: true } });
  if (args.userId && order.userId !== args.userId) throw new AppError("Commande introuvable.");
  if (!["DELIVERED", "PARTIALLY_REFUNDED", "SHIPPED", "IN_TRANSIT", "DELIVERY_FAILED"].includes(order.status)) throw new AppError("Cette commande ne peut pas faire l'objet d'un retour pour le moment.");
  const deliveredAt = order.shipments.find((s) => s.deliveredAt)?.deliveredAt;
  if (args.isWithdrawal && deliveredAt && Date.now() - deliveredAt.getTime() > store.returnWindowDays * 24 * 3600 * 1000)
    throw new AppError(`Le délai de rétractation de ${store.returnWindowDays} jours est dépassé. Vous pouvez toutefois faire une réclamation au titre de la garantie légale.`);
  const valid = args.items.filter((i) => order.items.some((oi) => oi.id === i.orderItemId && i.quantity > 0 && i.quantity <= oi.quantity));
  if (valid.length === 0) throw new AppError("Sélectionnez au moins un article.");
  const rr = await db.$transaction(async (tx) => {
    const r = await tx.returnRequest.create({
      data: { number: await nextReturnNumber(tx), orderId: order.id, userId: args.userId, reason: args.reason, details: args.details, items: valid, isWithdrawal: args.isWithdrawal },
    });
    if (order.status === "DELIVERED") await transitionOrder(tx, order.id, "RETURN_REQUESTED", { actorId: args.userId, message: `Demande de retour ${r.number}` });
    return r;
  });
  await sendEmail({ type: "return_received", to: order.email, data: { returnNumber: rr.number, orderNumber: order.number }, idempotencyKey: `return_received:${rr.id}`, relatedOrderId: order.id });
  return rr;
}

/** Avis client : uniquement sur un article livré, une fois par ligne de commande, modéré avant publication. */
export async function submitReview(args: { userId: string; orderItemId: string; rating: number; title?: string; body: string }) {
  const item = await db.orderItem.findUnique({ where: { id: args.orderItemId }, include: { order: true } });
  if (!item || item.order.userId !== args.userId || !item.productId) throw new AppError("Article introuvable.");
  if (!["DELIVERED", "RETURN_REQUESTED", "RETURN_RECEIVED", "PARTIALLY_REFUNDED"].includes(item.order.status)) throw new AppError("Vous pourrez laisser un avis après la livraison.");
  if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new AppError("Note invalide.");
  return db.review.upsert({
    where: { orderItemId: item.id },
    create: { productId: item.productId, userId: args.userId, orderItemId: item.id, rating: args.rating, title: args.title, body: args.body, status: "PENDING" },
    update: { rating: args.rating, title: args.title, body: args.body, status: "PENDING" },
  });
}

/** Recalcule la note moyenne d'un produit à partir des avis APPROUVÉS uniquement. */
export async function recomputeRating(productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await db.product.update({ where: { id: productId }, data: { ratingAverage: agg._count ? agg._avg.rating : null, ratingCount: agg._count } });
}
