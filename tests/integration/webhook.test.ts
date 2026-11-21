import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { handleStripeEvent } from "@/modules/payments/webhook";
import { resetDb, makePendingOrder, checkoutCompletedEvent } from "./helpers";

describe("webhook Stripe : passage au statut payé", () => {
  beforeEach(resetDb);

  it("confirme la commande, sort le stock, émet la facture et journalise les e-mails", async () => {
    const { order, product, quantity } = await makePendingOrder();
    const r = await handleStripeEvent(checkoutCompletedEvent(order, "evt_ok_1"));
    expect(r.duplicate).toBe(false);
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { invoices: true, payments: true, events: true } });
    expect(o.status).toBe("CONFIRMED");
    expect(o.paymentStatus).toBe("SUCCEEDED");
    expect(o.paidAt).not.toBeNull();
    expect(o.payments[0]?.status).toBe("SUCCEEDED");
    expect(o.invoices).toHaveLength(1);
    expect(o.invoices[0]?.number).toMatch(/^F-\d{4}-\d{6}$/);
    const inv = await db.inventory.findUniqueOrThrow({ where: { productId: product.id } });
    expect(inv.quantity).toBe(10 - quantity);
    expect(inv.reserved).toBe(0);
    const p = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(p.salesCount).toBe(quantity);
    const emails = await db.emailLog.findMany({ where: { relatedOrderId: order.id } });
    expect(emails.map((e) => e.type).sort()).toEqual(["invoice_available", "order_confirmation"]);
    expect(emails.map((e) => e.status)).toEqual(["SKIPPED_NOT_CONFIGURED", "SKIPPED_NOT_CONFIGURED"]); // Resend non configuré : rien n'est prétendu envoyé
  });

  it("est idempotent : un événement rejoué ne compte pas deux fois", async () => {
    const { order, product } = await makePendingOrder({ quantity: 1 });
    await handleStripeEvent(checkoutCompletedEvent(order, "evt_dup"));
    const again = await handleStripeEvent(checkoutCompletedEvent(order, "evt_dup"));
    expect(again.duplicate).toBe(true);
    // Même session renvoyée sous un autre identifiant d'événement : toujours un seul encaissement.
    await handleStripeEvent(checkoutCompletedEvent(order, "evt_dup_2"));
    const inv = await db.inventory.findUniqueOrThrow({ where: { productId: product.id } });
    expect(inv.quantity).toBe(9);
    expect(await db.invoice.count({ where: { orderId: order.id } })).toBe(1);
    expect(await db.emailLog.count({ where: { relatedOrderId: order.id, type: "order_confirmation" } })).toBe(1);
  });

  it("refuse un montant incohérent et laisse la commande en attente", async () => {
    const { order } = await makePendingOrder();
    await expect(handleStripeEvent(checkoutCompletedEvent(order, "evt_bad", order.totalCents - 100))).rejects.toThrow(/incohérent/);
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.status).toBe("PENDING_PAYMENT");
    expect(await db.processedWebhookEvent.count({ where: { id: "evt_bad" } })).toBe(0); // Stripe pourra réessayer
  });

  it("numérote les factures sans trou", async () => {
    const a = await makePendingOrder({ quantity: 1 });
    const b = await makePendingOrder({ quantity: 1 });
    await handleStripeEvent(checkoutCompletedEvent(a.order, "evt_n1"));
    await handleStripeEvent(checkoutCompletedEvent(b.order, "evt_n2"));
    const nums = (await db.invoice.findMany({ orderBy: { issuedAt: "asc" } })).map((i) => Number(i.number.slice(-6)));
    expect(nums).toEqual([1, 2]);
  });
});
