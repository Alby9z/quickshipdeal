import type { AvailabilityStatus, Supplier } from "@prisma/client";
import { db, type Tx } from "@/lib/db";
import { logger } from "@/lib/logger";
import { supplierAdapter, adapterStatus } from "@/integrations/suppliers";
import type { SupplierCatalogItem } from "@/integrations/suppliers/adapter";
import { notifyAdmins } from "@/modules/audit/service";
import { notifyStatusChange, transitionOrder } from "@/modules/orders/service";
import { priceFromMarginRule } from "@/modules/pricing/pricing";

/**
 * Met à jour une référence fournisseur et, si elle est liée à un produit :
 * - enregistre le nouveau prix d'achat (historique),
 * - n'ajuste le prix de vente QUE si la règle de marge automatique est activée,
 * - sinon crée une alerte quand le coût change.
 * Retourne true si le prix d'achat a changé.
 */
export async function applySupplierItem(tx: Tx, supplier: Supplier, item: SupplierCatalogItem): Promise<{ priceChanged: boolean }> {
  const existing = await tx.supplierProduct.findUnique({ where: { supplierId_externalSku: { supplierId: supplier.id, externalSku: item.externalSku } } });
  const priceChanged = existing?.costPriceCents != null && item.costPriceCents != null && existing.costPriceCents !== item.costPriceCents;
  const sp = await tx.supplierProduct.upsert({
    where: { supplierId_externalSku: { supplierId: supplier.id, externalSku: item.externalSku } },
    create: {
      supplierId: supplier.id,
      externalSku: item.externalSku,
      externalId: item.externalId,
      title: item.title,
      costPriceCents: item.costPriceCents,
      currency: item.currency ?? "EUR",
      availability: item.availability ?? "IN_STOCK",
      stockQuantity: item.stockQuantity,
      rawData: (item.raw ?? undefined) as never,
      lastSyncedAt: new Date(),
    },
    update: {
      title: item.title ?? undefined,
      costPriceCents: item.costPriceCents ?? undefined,
      availability: item.availability ?? undefined,
      stockQuantity: item.stockQuantity ?? undefined,
      lastSyncedAt: new Date(),
      ...(priceChanged ? { lastPriceChangeAt: new Date() } : {}),
    },
  });

  if (!sp.productId) return { priceChanged };
  const product = await tx.product.findUnique({ where: { id: sp.productId } });
  if (!product) return { priceChanged };

  const data: { costPriceCents?: number; availability?: AvailabilityStatus; priceCents?: number } = {};
  if (item.availability && item.availability !== product.availability) data.availability = item.availability;
  if (item.costPriceCents != null && item.costPriceCents !== product.costPriceCents) {
    data.costPriceCents = item.costPriceCents;
    await tx.priceHistory.create({
      data: { productId: product.id, field: "costPriceCents", oldValueCents: product.costPriceCents, newValueCents: item.costPriceCents, source: "supplier_sync", reason: `Synchro ${supplier.name}` },
    });
    if (supplier.autoApplyMargin) {
      const suggested = priceFromMarginRule(item.costPriceCents, { type: supplier.marginRuleType, value: supplier.marginRuleValue }, product.vatRateBps);
      if (suggested != null && suggested !== product.priceCents) {
        data.priceCents = suggested;
        await tx.priceHistory.create({
          data: { productId: product.id, field: "priceCents", oldValueCents: product.priceCents, newValueCents: suggested, source: "margin_rule", reason: `Règle de marge ${supplier.name}` },
        });
      }
    } else {
      await notifyAdmins(
        {
          level: "warning",
          type: "supplier_price_change",
          title: `Prix d'achat modifié : ${product.name}`,
          body: `${(product.costPriceCents / 100).toFixed(2)} € → ${(item.costPriceCents / 100).toFixed(2)} € chez ${supplier.name}. Le prix de vente n'a pas été modifié.`,
          link: `/admin/produits/${product.id}`,
        },
        tx,
      );
    }
  }
  if (Object.keys(data).length) await tx.product.update({ where: { id: product.id }, data });
  return { priceChanged };
}

/** Synchronisation d'un fournisseur (appelée par le worker). Journalisée dans SupplierSync. */
export async function runSupplierSync(supplierId: string, kind: "import" | "prices" | "stock", triggeredById?: string) {
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const sync = await db.supplierSync.create({ data: { supplierId, kind, status: "RUNNING", startedAt: new Date(), triggeredById } });
  const adapter = supplierAdapter(supplier.type);
  if (!supplier.isEnabled || !adapter.configured() || !adapter.fetchCatalog) {
    const msg = !supplier.isEnabled ? "Fournisseur désactivé" : `${adapter.label} : intégration non configurée`;
    await db.supplierSync.update({ where: { id: sync.id }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: msg } });
    return sync.id;
  }
  let total = 0, updated = 0, priceChanges = 0, errors = 0;
  const log: string[] = [];
  try {
    for (let page = 1; page < 1000; page++) {
      const { items, hasMore } = await adapter.fetchCatalog(supplier, page);
      for (const item of items) {
        total++;
        try {
          const r = await db.$transaction((tx) => applySupplierItem(tx, supplier, item));
          updated++;
          if (r.priceChanged) priceChanges++;
        } catch (e) {
          errors++;
          if (log.length < 100) log.push(`${item.externalSku}: ${(e as Error).message}`);
        }
      }
      if (!hasMore) break;
    }
    await db.supplierSync.update({
      where: { id: sync.id },
      data: { status: errors ? "PARTIAL" : "SUCCESS", finishedAt: new Date(), itemsTotal: total, itemsUpdated: updated, priceChanges, errorsCount: errors, log },
    });
  } catch (e) {
    logger.error({ err: e, supplierId }, "Synchronisation fournisseur en échec");
    await db.supplierSync.update({ where: { id: sync.id }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: (e as Error).message, itemsTotal: total, itemsUpdated: updated, errorsCount: errors + 1, log } });
    await notifyAdmins({ level: "error", type: "supplier_sync_failed", title: `Synchronisation ${supplier.name} en échec`, body: (e as Error).message, link: `/admin/fournisseurs/${supplier.id}` });
  }
  return sync.id;
}

/**
 * Transmission d'une commande payée aux fournisseurs.
 * Si l'API du fournisseur n'est pas configurée, les lignes passent en « à transmettre manuellement »
 * et l'administrateur est alerté — aucune transmission n'est simulée.
 */
export async function placeSupplierOrders(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { supplier: true } } } });
  if (order.paymentStatus !== "SUCCEEDED") return;
  let manual = 0, sent = 0;
  for (const item of order.items) {
    if (item.supplierOrderRef) continue;
    const supplier = item.supplier;
    const adapter = supplier ? supplierAdapter(supplier.type) : null;
    if (supplier && supplier.isEnabled && adapter?.configured() && adapter.placeOrder) {
      const res = await adapter.placeOrder(supplier, {
        orderNumber: order.number,
        email: order.email,
        shippingAddress: order.shippingAddress as Record<string, unknown>,
        lines: [{ externalSku: item.supplierReference ?? item.sku, quantity: item.quantity }],
      });
      await db.orderItem.update({ where: { id: item.id }, data: { supplierOrderRef: res.externalOrderId, supplierStatus: res.status } });
      sent++;
    } else {
      await db.orderItem.update({ where: { id: item.id }, data: { supplierStatus: "A_TRANSMETTRE_MANUELLEMENT" } });
      manual++;
    }
  }
  if (manual > 0) {
    await notifyAdmins({ level: "warning", type: "supplier_order_manual", title: `Commande ${order.number} : ${manual} ligne(s) à transmettre au fournisseur`, body: "Transmettez la commande puis saisissez la référence fournisseur.", link: `/admin/commandes/${order.id}` });
  }
  if (sent > 0 && manual === 0) {
    const r = await db.$transaction((tx) => transitionOrder(tx, order.id, "SUPPLIER_ORDERED", { message: "Commande transmise au fournisseur" }));
    if (r.changed) await notifyStatusChange(order.id, "SUPPLIER_ORDERED");
  }
}

/** Saisie manuelle de la référence de commande fournisseur par l'administrateur. */
export async function markSupplierOrdered(orderId: string, itemIds: string[], supplierOrderRef: string, actorId: string) {
  const res = await db.$transaction(async (tx) => {
    await tx.orderItem.updateMany({ where: { orderId, id: { in: itemIds } }, data: { supplierOrderRef, supplierStatus: "TRANSMISE" } });
    const remaining = await tx.orderItem.count({ where: { orderId, supplierOrderRef: null } });
    if (remaining === 0) return transitionOrder(tx, orderId, "SUPPLIER_ORDERED", { actorId, message: "Commande transmise au fournisseur" });
    return { changed: false };
  });
  if (res.changed) await notifyStatusChange(orderId, "SUPPLIER_ORDERED");
}

export { adapterStatus };
