/**
 * Fabrique de données de TEST (base qsd_test uniquement, vidée avant chaque test).
 * Ces données ne sont jamais chargées en développement ni en production.
 */
import { db } from "@/lib/db";

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("qsd_test")) throw new Error("Refus : les tests doivent tourner sur la base de test");
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

let n = 0;
export async function makeProduct(opts: { priceCents?: number; costPriceCents?: number; stock?: number; supplierId?: string } = {}) {
  n++;
  return db.product.create({
    data: {
      name: `Produit de test ${n}`, slug: `produit-test-${n}-${Date.now()}`, sku: `TEST-${n}-${Date.now()}`, status: "PUBLISHED", priceCents: opts.priceCents ?? 2990, costPriceCents: opts.costPriceCents ?? 1000,
      vatRateBps: 2000, trackInventory: true, supplierId: opts.supplierId, inventory: { create: { quantity: opts.stock ?? 10, reserved: 0 } },
    },
    include: { inventory: true },
  });
}

/** Commande en attente de paiement, avec stock réservé comme le ferait le checkout. */
export async function makePendingOrder(opts: { quantity?: number; createdAt?: Date } = {}) {
  const p = await makeProduct();
  const quantity = opts.quantity ?? 2;
  await db.inventory.update({ where: { productId: p.id }, data: { reserved: quantity } });
  const line = p.priceCents * quantity;
  const order = await db.order.create({
    data: {
      number: `TEST-${Date.now()}-${n}`, email: "client@example.test", status: "PENDING_PAYMENT", paymentStatus: "PENDING",
      subtotalCents: line, shippingCents: 490, taxCents: Math.round((line * 2000) / 12000), totalCents: line + 490, costTotalCents: p.costPriceCents * quantity,
      shippingAddress: { firstName: "Test", lastName: "Client", line1: "1 rue de Test", postalCode: "75001", city: "Paris", country: "FR" },
      billingAddress: { firstName: "Test", lastName: "Client", line1: "1 rue de Test", postalCode: "75001", city: "Paris", country: "FR" },
      acceptedTermsAt: new Date(), guestAccessToken: `tok-${Date.now()}-${n}`, stripeCheckoutSessionId: `cs_test_${Date.now()}_${n}`,
      createdAt: opts.createdAt,
      items: { create: [{ productId: p.id, productName: p.name, sku: p.sku, unitPriceCents: p.priceCents, unitCostCents: p.costPriceCents, vatRateBps: 2000, quantity, lineTotalCents: line }] },
      payments: { create: { amountCents: line + 490, status: "PENDING" } },
    },
  });
  return { order, product: p, quantity };
}

export function checkoutCompletedEvent(order: { id: string; totalCents: number; stripeCheckoutSessionId: string | null }, id = `evt_test_${Date.now()}`, amount = order.totalCents) {
  return {
    id, type: "checkout.session.completed", object: "event", api_version: "2024-06-20", created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 0, request: null,
    data: { object: { id: order.stripeCheckoutSessionId, object: "checkout.session", payment_status: "paid", status: "complete", amount_total: amount, currency: "eur", metadata: { orderId: order.id }, client_reference_id: order.id, payment_intent: `pi_test_${order.id}`, payment_method_types: ["card"] } },
  } as never;
}

export async function makeStaff() {
  return db.user.create({ data: { email: `staff-${Date.now()}@example.test`, name: "Équipe test", emailVerified: true } });
}
