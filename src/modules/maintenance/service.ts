import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { siteUrl } from "@/lib/env";
import { stripeClient } from "@/integrations/stripe/client";
import { activeTrackingAdapter } from "@/integrations/tracking";
import { releaseOrder } from "@/modules/checkout/release";
import { addTrackingEvent } from "@/modules/shipping/service";
import { notifyAdmins } from "@/modules/audit/service";
import { sendEmail } from "@/modules/emails/service";
import { getSetting } from "@/modules/settings/service";
import type { ShipmentStatus } from "@prisma/client";

/** Passe en « publié » les articles programmés dont la date est atteinte. */
export async function publishScheduledPosts(now = new Date()) {
  const r = await db.blogPost.updateMany({ where: { status: "SCHEDULED", publishAt: { lte: now } }, data: { status: "PUBLISHED" } });
  return r.count;
}

/**
 * Commandes restées « en attente de paiement » : on interroge Stripe pour connaître l'état réel
 * de la session. Rien n'est jamais marqué payé ici — seul le webhook le fait.
 */
export async function reconcilePendingOrders(now = new Date(), maxAgeMinutes = 90) {
  const stale = await db.order.findMany({ where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(now.getTime() - maxAgeMinutes * 60000) } }, take: 100 });
  const stripe = stripeClient();
  let released = 0;
  for (const o of stale) {
    try {
      if (stripe && o.stripeCheckoutSessionId) {
        const s = await stripe.checkout.sessions.retrieve(o.stripeCheckoutSessionId);
        if (s.status === "open") continue; // encore payable : Stripe l'expirera lui-même
        if (s.payment_status === "paid" || s.status === "complete") {
          await notifyAdmins({ level: "warning", type: "webhook_missing", title: `Paiement ${o.number} confirmé chez Stripe mais webhook non reçu`, body: "Vérifiez la configuration du webhook Stripe puis rejouez l'événement depuis le tableau de bord Stripe.", link: `/admin/commandes/${o.id}` });
          continue;
        }
      }
      await releaseOrder(o.id, "Session de paiement expirée ou abandonnée");
      released++;
    } catch (e) {
      logger.error({ err: e, orderId: o.id }, "Rapprochement commande en attente impossible");
    }
  }
  return released;
}

/** Relance de panier abandonné : uniquement si activée ET client connecté ayant accepté les e-mails marketing. */
export async function remindAbandonedCarts(now = new Date()) {
  const store = await getSetting("store");
  if (!store.abandonedCartEnabled) return 0;
  const before = new Date(now.getTime() - store.abandonedCartDelayHours * 3600000);
  const after = new Date(now.getTime() - 7 * 86400000);
  const carts = await db.cart.findMany({
    where: { status: "active", abandonedReminderSentAt: null, updatedAt: { lt: before, gt: after }, items: { some: {} }, user: { isBlocked: false, deletedAt: null, profile: { marketingOptIn: true } } },
    include: { user: true },
    take: 200,
  });
  let sent = 0;
  for (const c of carts) {
    if (!c.user) continue;
    const r = await sendEmail({ type: "abandoned_cart", to: c.user.email, data: { cartUrl: `${siteUrl()}/panier`, unsubscribeUrl: `${siteUrl()}/compte/profil` }, idempotencyKey: `abandoned:${c.id}`, marketingConsent: true });
    await db.cart.update({ where: { id: c.id }, data: { abandonedReminderSentAt: now } });
    if (r) sent++;
  }
  return sent;
}

/** Alerte stock faible (une notification par produit et par jour). */
export async function lowStockAlerts() {
  const rows = await db.$queryRaw<{ id: string; name: string; available: number; threshold: number }[]>`
    SELECT p."id", p."name", (i."quantity" - i."reserved")::int AS available, i."lowStockThreshold"::int AS threshold
    FROM "Product" p JOIN "Inventory" i ON i."productId" = p."id"
    WHERE p."status" = 'PUBLISHED' AND p."deletedAt" IS NULL AND p."trackInventory" = true AND (i."quantity" - i."reserved") <= i."lowStockThreshold"`;
  const since = new Date(Date.now() - 86400000);
  let created = 0;
  for (const r of rows) {
    const already = await db.notification.findFirst({ where: { type: "low_stock", link: `/admin/produits/${r.id}`, createdAt: { gte: since } } });
    if (already) continue;
    await notifyAdmins({ level: r.available <= 0 ? "error" : "warning", type: "low_stock", title: r.available <= 0 ? `Rupture : ${r.name}` : `Stock faible : ${r.name}`, body: `${r.available} disponible(s), seuil ${r.threshold}.`, link: `/admin/produits/${r.id}` });
    created++;
  }
  return created;
}

/** Suivi automatique : uniquement si un fournisseur de suivi est réellement configuré. Sinon, rien n'est inventé. */
export async function syncTracking() {
  const adapter = activeTrackingAdapter();
  if (!adapter?.fetch) return { skipped: true as const, updated: 0 };
  const shipments = await db.shipment.findMany({ where: { status: { in: ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] }, trackingNumber: { not: null } }, include: { carrier: true }, take: 200, orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } } });
  let updated = 0;
  for (const s of shipments) {
    try {
      const res = await adapter.fetch(s.trackingNumber!, s.carrier?.code);
      const events = [...res.events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      for (const [i, e] of events.entries()) {
        const last = i === events.length - 1;
        const ev = await addTrackingEvent({ shipmentId: s.id, occurredAt: e.occurredAt, description: e.description, location: e.location, status: (last ? res.status : s.status) as ShipmentStatus, source: adapter.key, notify: last });
        if (ev) updated++;
      }
      await db.shipment.update({ where: { id: s.id }, data: { lastCheckedAt: new Date(), ...(res.estimatedDeliveryAt ? { estimatedDeliveryAt: res.estimatedDeliveryAt } : {}) } });
    } catch (e) {
      logger.warn({ err: e, shipmentId: s.id }, "Suivi transporteur indisponible");
    }
  }
  return { skipped: false as const, updated };
}
