import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { sendEmail } from "@/modules/emails/service";
import { applySupplierItem, runSupplierSync } from "@/modules/suppliers/service";
import { createShipment, addTrackingEvent } from "@/modules/shipping/service";
import { adminSetOrderStatus } from "@/modules/orders/service";
import { reconcilePendingOrders, publishScheduledPosts, syncTracking } from "@/modules/maintenance/service";
import { handleStripeEvent } from "@/modules/payments/webhook";
import { ROLES } from "@/modules/auth/permissions";
import { resetDb, makeProduct, makePendingOrder, checkoutCompletedEvent, makeStaff } from "./helpers";

beforeEach(resetDb);

describe("e-mails", () => {
  it("une clé d'idempotence = un seul e-mail, marqué non envoyé sans Resend", async () => {
    const args = { type: "support_reply" as const, to: "client@example.test", data: { ticketNumber: "T-1", subject: "Test", message: "Bonjour", url: "http://localhost:3000" }, idempotencyKey: "test:support:1" };
    await sendEmail(args);
    await sendEmail(args);
    const logs = await db.emailLog.findMany({ where: { idempotencyKey: "test:support:1" } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.status).toBe("SKIPPED_NOT_CONFIGURED");
  });
  it("bloque un e-mail marketing sans consentement", async () => {
    const r = await sendEmail({ type: "abandoned_cart", to: "x@example.test", data: { cartUrl: "u", unsubscribeUrl: "u" }, idempotencyKey: "test:mkt" });
    expect(r).toBeNull();
    expect(await db.emailLog.count()).toBe(0);
  });
});

describe("fournisseurs", () => {
  it("une hausse du prix d'achat n'altère pas le prix de vente sans marge automatique, mais alerte", async () => {
    const supplier = await db.supplier.create({ data: { name: "Fournisseur test", type: "MANUAL", isEnabled: true } });
    const p = await makeProduct({ priceCents: 2990, costPriceCents: 1000, supplierId: supplier.id });
    await db.supplierProduct.create({ data: { supplierId: supplier.id, externalSku: "EXT-1", productId: p.id, costPriceCents: 1000 } });
    const r = await db.$transaction((tx) => applySupplierItem(tx, supplier, { externalSku: "EXT-1", costPriceCents: 1200 }));
    expect(r.priceChanged).toBe(true);
    const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.costPriceCents).toBe(1200);
    expect(after.priceCents).toBe(2990);
    expect(await db.priceHistory.count({ where: { productId: p.id, field: "costPriceCents" } })).toBe(1);
    expect(await db.notification.count({ where: { type: "supplier_price_change" } })).toBe(1);
  });
  it("applique la règle de marge seulement si elle est activée", async () => {
    const supplier = await db.supplier.create({ data: { name: "Auto", isEnabled: true, marginRuleType: "percent", marginRuleValue: 10000, autoApplyMargin: true } });
    const p = await makeProduct({ priceCents: 2990, costPriceCents: 1000, supplierId: supplier.id });
    await db.supplierProduct.create({ data: { supplierId: supplier.id, externalSku: "EXT-2", productId: p.id, costPriceCents: 1000 } });
    await db.$transaction((tx) => applySupplierItem(tx, supplier, { externalSku: "EXT-2", costPriceCents: 1500 }));
    const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.priceCents).not.toBe(2990);
    expect(after.priceCents % 100).toBe(90);
  });
  it("une synchro API non configurée échoue proprement, sans rien simuler", async () => {
    const supplier = await db.supplier.create({ data: { name: "BigBuy", type: "BIGBUY", isEnabled: true } });
    const id = await runSupplierSync(supplier.id, "prices");
    const sync = await db.supplierSync.findUniqueOrThrow({ where: { id } });
    expect(sync.status).toBe("FAILED");
    expect(sync.errorMessage).toMatch(/non configurée/);
    expect(sync.itemsUpdated).toBe(0);
  });
});

describe("commandes et livraison", () => {
  async function paidOrder() {
    const { order } = await makePendingOrder({ quantity: 1 });
    await handleStripeEvent(checkoutCompletedEvent(order, `evt_${order.id}`));
    return order;
  }

  it("interdit de déclarer un paiement ou un remboursement à la main", async () => {
    const { order } = await makePendingOrder();
    await expect(adminSetOrderStatus(order.id, "PAID", "admin")).rejects.toThrow(/Stripe/);
    const paid = await paidOrder();
    await expect(adminSetOrderStatus(paid.id, "REFUNDED", "admin")).rejects.toThrow(/Stripe/);
  });

  it("refuse une transition hors machine à états", async () => {
    const paid = await paidOrder();
    await expect(adminSetOrderStatus(paid.id, "DELIVERED", "admin")).rejects.toThrow(/Transition interdite/);
  });

  it("expédition puis événements transporteur : statuts et e-mails, sans doublon", async () => {
    const order = await paidOrder();
    const carrier = await db.carrier.create({ data: { name: "Colissimo", code: "colissimo-test", trackingUrlTemplate: "https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}" } });
    const staff = await makeStaff();
    const s = await createShipment({ orderId: order.id, carrierId: carrier.id, trackingNumber: "6A12345678901", actorId: staff.id });
    expect(s.trackingUrl).toContain("6A12345678901");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("SHIPPED");
    const at = new Date("2026-11-20T10:00:00Z");
    await addTrackingEvent({ shipmentId: s.id, occurredAt: at, description: "Colis livré", status: "DELIVERED" });
    await addTrackingEvent({ shipmentId: s.id, occurredAt: at, description: "Colis livré", status: "DELIVERED" });
    expect(await db.trackingEvent.count({ where: { shipmentId: s.id } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("DELIVERED");
    expect(await db.emailLog.count({ where: { relatedOrderId: order.id, type: "order_delivered" } })).toBe(1);
  });

  it("le suivi automatique ne fait rien tant qu'aucun service n'est configuré", async () => {
    expect(await syncTracking()).toEqual({ skipped: true, updated: 0 });
  });
});

describe("tâches planifiées", () => {
  it("libère le stock d'une commande impayée ancienne, jamais celui d'une récente", async () => {
    const old = await makePendingOrder({ quantity: 3, createdAt: new Date(Date.now() - 3 * 3600_000) });
    const recent = await makePendingOrder({ quantity: 1 });
    expect(await reconcilePendingOrders()).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: old.order.id } })).status).toBe("CANCELLED");
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: old.product.id } })).reserved).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: recent.order.id } })).status).toBe("PENDING_PAYMENT");
  });
  it("publie les articles programmés arrivés à échéance", async () => {
    await db.blogPost.create({ data: { title: "A", slug: "a", content: "x", status: "SCHEDULED", publishAt: new Date(Date.now() - 1000) } });
    await db.blogPost.create({ data: { title: "B", slug: "b", content: "x", status: "SCHEDULED", publishAt: new Date(Date.now() + 86400_000) } });
    expect(await publishScheduledPosts()).toBe(1);
  });
});

describe("rôles", () => {
  it("le support ne peut ni rembourser ni modifier les prix ou les rôles", () => {
    for (const p of ["order:refund", "price:write", "user:write", "settings:write"] as const) expect(ROLES.SUPPORT!.permissions).not.toContain(p);
    expect(ROLES.ADMIN!.permissions).not.toContain("user:write");
    expect(ROLES.CUSTOMER!.permissions).toEqual([]);
  });
});
