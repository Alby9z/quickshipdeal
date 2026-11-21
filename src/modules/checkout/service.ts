import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { randomToken } from "@/lib/utils";
import { stripeClient } from "@/integrations/stripe/client";
import { getCurrentUser } from "@/modules/auth/session";
import { getCartView } from "@/modules/cart/service";
import { nextOrderNumber } from "@/modules/orders/numbering";
import { getSetting } from "@/modules/settings/service";
import type { CheckoutInput } from "./schemas";
import { releaseOrder } from "./release";
export { releaseOrder };

/**
 * Crée la commande (EN ATTENTE DE PAIEMENT) à partir du panier recalculé côté serveur,
 * réserve le stock, puis ouvre une session Stripe Checkout.
 * La commande ne passe à « payée » que via le webhook Stripe signé.
 */
export async function startCheckout(input: CheckoutInput) {
  const stripe = stripeClient();
  if (!stripe) throw new AppError("Le paiement en ligne n'est pas encore activé sur la boutique.", "NOT_CONFIGURED", 503);

  const user = await getCurrentUser();
  const store = await getSetting("store");
  if (!user && !store.allowGuestCheckout) throw new AppError("Veuillez vous connecter pour commander.");

  const view = await getCartView({ shippingRateId: input.shippingRateId, country: input.shipping.country, email: input.email });
  if (view.purchasable.length === 0) throw new AppError("Votre panier est vide ou ses articles ne sont plus disponibles.");
  if (!view.shippingRate || view.shippingRate.id !== input.shippingRateId)
    throw new AppError("Ce mode de livraison n'est pas disponible pour ce pays.");
  if (view.totals.totalCents < 50) throw new AppError("Montant de commande trop faible.");

  const billing = input.billingSameAsShipping ? input.shipping : input.billing!;
  const guestAccessToken = randomToken(18);

  const order = await db.$transaction(async (tx) => {
    // Réservation de stock atomique : échoue si la quantité disponible a changé entre-temps.
    for (const l of view.purchasable) {
      if (!l.trackInventory) continue;
      const where = l.variantId ? { variantId: l.variantId } : { productId: l.productId };
      const inv = await tx.inventory.findUnique({ where: where as never });
      if (!inv) continue;
      const res = await tx.$executeRaw`
        UPDATE "Inventory" SET "reserved" = "reserved" + ${l.purchasableQty}, "updatedAt" = now()
        WHERE "id" = ${inv.id} AND "quantity" - "reserved" >= ${l.purchasableQty}`;
      if (res !== 1) throw new AppError(`Stock insuffisant pour « ${l.name} ». Merci de mettre à jour votre panier.`);
    }

    const number = await nextOrderNumber(tx, store.orderPrefix);
    return tx.order.create({
      data: {
        number,
        userId: user?.id ?? null,
        email: input.email,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        subtotalCents: view.totals.subtotalCents,
        discountCents: view.totals.discountCents,
        shippingCents: view.totals.shippingCents,
        taxCents: view.totals.taxCents,
        totalCents: view.totals.totalCents,
        costTotalCents: view.totals.costTotalCents,
        couponCode: view.coupon?.code ?? null,
        couponId: view.coupon?.id ?? null,
        shippingMethod: view.shippingRate!.name,
        carrierId: view.shippingRate!.carrierId,
        shippingAddress: input.shipping,
        billingAddress: billing,
        customerNote: input.customerNote || null,
        acceptedTermsAt: new Date(),
        termsVersion: store.termsVersion,
        guestAccessToken,
        items: {
          create: view.purchasable.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.name,
            variantName: l.variantName,
            sku: l.sku,
            imageUrl: l.image?.url ?? null,
            unitPriceCents: l.unitCents,
            unitCostCents: l.costCents,
            vatRateBps: l.vatRateBps,
            quantity: l.purchasableQty,
            lineTotalCents: l.unitCents * l.purchasableQty,
            discountCents: view.totals.lineDiscounts[l.id] ?? 0,
            supplierId: l.supplierId,
            supplierReference: l.supplierReference,
          })),
        },
        payments: { create: { amountCents: view.totals.totalCents, status: "PENDING" } },
        events: { create: { toStatus: "PENDING_PAYMENT", message: "Commande créée, en attente de paiement" } },
      },
    });
  });

  try {
    const session = await createStripeSession(order.id);
    await db.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
    return { url: session.url!, orderNumber: order.number };
  } catch (e) {
    logger.error({ err: e, orderId: order.id }, "Création de session Stripe impossible");
    await releaseOrder(order.id, "Échec de création du paiement");
    throw new AppError("Le paiement n'a pas pu être initialisé. Merci de réessayer.");
  }
}

async function createStripeSession(orderId: string): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient()!;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, user: { include: { profile: true } } } });
  const base = siteUrl();

  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (order.discountCents > 0) {
    const coupon = await stripe.coupons.create(
      { amount_off: order.discountCents, currency: order.currency.toLowerCase(), duration: "once", max_redemptions: 1, name: order.couponCode ?? "Remise" },
      { idempotencyKey: `coupon:${order.id}` },
    );
    discounts = [{ coupon: coupon.id }];
  }

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "fr",
      customer_email: order.user?.profile?.stripeCustomerId ? undefined : order.email,
      customer: order.user?.profile?.stripeCustomerId ?? undefined,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.number },
      payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.number } },
      line_items: order.items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: i.unitPriceCents,
          product_data: { name: i.variantName ? `${i.productName} — ${i.variantName}` : i.productName, metadata: { sku: i.sku } },
        },
      })),
      discounts,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: order.shippingMethod ?? "Livraison",
            fixed_amount: { amount: order.shippingCents, currency: order.currency.toLowerCase() },
          },
        },
      ],
      success_url: `${base}/commande/confirmation?commande=${encodeURIComponent(order.number)}&cle=${order.guestAccessToken}`,
      cancel_url: `${base}/panier?paiement=annule`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 h
    },
    { idempotencyKey: `checkout:${order.id}` },
  );
}

