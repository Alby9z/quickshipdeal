import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { randomToken } from "@/lib/utils";
import { getCurrentUser } from "@/modules/auth/session";
import { publicProductWhere } from "@/modules/catalog/repository";
import { applicableVatBps, effectivePrice } from "@/modules/pricing/pricing";
import { getSetting } from "@/modules/settings/service";
import { computeTotals, type CouponInput } from "./totals";

export const CART_COOKIE = "qsd_cart";
const MAX_QTY = 20;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          promotions: { include: { promotion: true } },
          inventory: true,
        },
      },
      variant: { include: { inventory: true } },
    },
  },
} satisfies Prisma.CartInclude;
type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

async function findCart(): Promise<CartRow | null> {
  const user = await getCurrentUser();
  if (user) {
    return db.cart.findFirst({ where: { userId: user.id, status: "active" }, include: cartInclude, orderBy: { updatedAt: "desc" } });
  }
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { guestToken: token, status: "active" }, include: cartInclude });
}

async function getOrCreateCart(): Promise<CartRow> {
  const existing = await findCart();
  if (existing) return existing;
  const user = await getCurrentUser();
  if (user) return db.cart.create({ data: { userId: user.id }, include: cartInclude });
  const token = randomToken();
  (await cookies()).set(CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return db.cart.create({ data: { guestToken: token }, include: cartInclude });
}

function availableQuantity(product: CartRow["items"][number]["product"], variant: CartRow["items"][number]["variant"]): number {
  const availability = variant?.availability ?? product.availability;
  if (availability === "OUT_OF_STOCK" || availability === "DISCONTINUED") return 0;
  if (!product.trackInventory || availability === "ON_ORDER") return MAX_QTY;
  const inv = variant?.inventory ?? product.inventory;
  if (!inv) return MAX_QTY;
  return Math.max(0, Math.min(MAX_QTY, inv.quantity - inv.reserved));
}

export async function addToCart(productId: string, variantId: string | null, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) throw new AppError("Quantité invalide");
  const product = await db.product.findFirst({
    where: { id: productId, ...publicProductWhere() },
    include: { inventory: true, variants: { where: { isActive: true }, include: { inventory: true } } },
  });
  if (!product) throw new AppError("Ce produit n'est pas disponible.");
  if (product.variants.length > 0 && !variantId) throw new AppError("Veuillez choisir une variante.");
  const variant = variantId ? product.variants.find((v) => v.id === variantId) ?? null : null;
  if (variantId && !variant) throw new AppError("Variante indisponible.");

  const cart = await getOrCreateCart();
  const existing = cart.items.find((i) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null));
  const wanted = (existing?.quantity ?? 0) + quantity;
  const max = availableQuantity({ ...product, images: [], promotions: [] } as never, variant as never);
  if (max === 0) throw new AppError("Ce produit est en rupture de stock.");
  const finalQty = Math.min(wanted, max);

  if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { quantity: finalQty } });
  else await db.cartItem.create({ data: { cartId: cart.id, productId, variantId, quantity: finalQty } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return { quantity: finalQty, limited: finalQty < wanted };
}

export async function updateCartItem(itemId: string, quantity: number) {
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) throw new AppError("Article introuvable dans votre panier.");
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return;
  }
  const max = availableQuantity(item.product, item.variant);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity: Math.min(Math.max(1, Math.trunc(quantity)), Math.max(1, max)) } });
}

export async function setCartCoupon(code: string | null) {
  const cart = await getOrCreateCart();
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code ? code.trim().toUpperCase().slice(0, 40) : null } });
}

/** Fusionne le panier invité dans le panier du compte après connexion. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { guestToken: token }, include: { items: true } });
  if (!guest || guest.status !== "active") return;
  const userCart =
    (await db.cart.findFirst({ where: { userId, status: "active" }, include: { items: true } })) ??
    (await db.cart.create({ data: { userId }, include: { items: true } }));
  await db.$transaction(async (tx) => {
    for (const item of guest.items) {
      const match = userCart.items.find((i) => i.productId === item.productId && i.variantId === item.variantId);
      if (match) await tx.cartItem.update({ where: { id: match.id }, data: { quantity: Math.min(MAX_QTY, match.quantity + item.quantity) } });
      else await tx.cartItem.create({ data: { cartId: userCart.id, productId: item.productId, variantId: item.variantId, quantity: item.quantity } });
    }
    await tx.cart.update({ where: { id: guest.id }, data: { status: "merged", guestToken: null } });
    if (guest.couponCode && !userCart.couponCode) await tx.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
  });
  jar.delete(CART_COOKIE);
}

export async function validateCoupon(code: string, email?: string | null): Promise<{ coupon: (CouponInput & { id: string }) | null; error: string | null }> {
  const c = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const t = new Date();
  if (!c || !c.isActive) return { coupon: null, error: "Code promo invalide." };
  if (c.startsAt && c.startsAt > t) return { coupon: null, error: "Ce code n'est pas encore actif." };
  if (c.endsAt && c.endsAt <= t) return { coupon: null, error: "Ce code a expiré." };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { coupon: null, error: "Ce code a atteint sa limite d'utilisation." };
  if (c.maxUsesPerCustomer != null && email) {
    const used = await db.order.count({ where: { couponId: c.id, email, paymentStatus: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } } });
    if (used >= c.maxUsesPerCustomer) return { coupon: null, error: "Vous avez déjà utilisé ce code." };
  }
  return { coupon: { id: c.id, code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents }, error: null };
}

export type CartView = Awaited<ReturnType<typeof getCartView>>;

/**
 * Vue complète du panier, recalculée depuis la base à chaque appel :
 * prix actuels, disponibilité, coupon, livraison, TVA.
 */
export async function getCartView(opts: { shippingRateId?: string | null; country?: string; email?: string | null } = {}) {
  const cart = await findCart();
  const tax = await getSetting("tax");
  const warnings: string[] = [];
  const lines = (cart?.items ?? []).map((item) => {
    const p = item.product;
    const visible = p.status === "PUBLISHED" && !p.deletedAt;
    const base = effectivePrice({ ...p, promotions: p.promotions.map((x) => x.promotion) });
    const unitCents = item.variant?.priceCents != null ? item.variant.priceCents : base.unitCents;
    const max = visible ? availableQuantity(p, item.variant) : 0;
    if (!visible || max === 0) warnings.push(`« ${p.name} » n'est plus disponible et sera retiré de la commande.`);
    else if (item.quantity > max) warnings.push(`Quantité de « ${p.name} » limitée à ${max}.`);
    return {
      id: item.id,
      productId: p.id,
      variantId: item.variantId,
      slug: p.slug,
      name: p.name,
      variantName: item.variant?.name ?? null,
      sku: item.variant?.sku ?? p.sku,
      image: p.images[0] ?? null,
      quantity: item.quantity,
      purchasableQty: Math.min(item.quantity, max),
      unitCents,
      compareAtCents: base.compareAtCents,
      costCents: item.variant?.costPriceCents ?? p.costPriceCents,
      vatRateBps: applicableVatBps(p.vatRateBps, tax.vatMode),
      available: visible && max > 0,
      supplierId: p.supplierId,
      supplierReference: p.supplierReference,
      trackInventory: p.trackInventory,
      leadTime: p.leadTimeMinDays != null ? { min: p.leadTimeMinDays, max: p.leadTimeMaxDays ?? p.leadTimeMinDays } : null,
    };
  });
  const purchasable = lines.filter((l) => l.available && l.purchasableQty > 0);

  let coupon: (CouponInput & { id: string }) | null = null;
  let couponError: string | null = null;
  if (cart?.couponCode) {
    const v = await validateCoupon(cart.couponCode, opts.email);
    coupon = v.coupon;
    couponError = v.error;
  }

  const country = (opts.country ?? "FR").toUpperCase();
  const rates = await db.shippingRate.findMany({ where: { isActive: true, countries: { has: country } }, orderBy: [{ position: "asc" }, { priceCents: "asc" }], include: { carrier: true } });
  const rate = rates.find((r) => r.id === opts.shippingRateId) ?? rates[0] ?? null;

  const totals = computeTotals(
    purchasable.map((l) => ({ key: l.id, unitCents: l.unitCents, quantity: l.purchasableQty, vatRateBps: l.vatRateBps, costCents: l.costCents })),
    coupon,
    rate ? { priceCents: rate.priceCents, freeAboveCents: rate.freeAboveCents } : null,
    applicableVatBps(tax.defaultVatRateBps, tax.vatMode),
  );
  if (totals.couponError) couponError = totals.couponError;

  return {
    cartId: cart?.id ?? null,
    couponCode: cart?.couponCode ?? null,
    coupon: totals.couponApplied ? coupon : null,
    couponError,
    lines,
    purchasable,
    warnings,
    shippingRates: rates.map((r) => ({ id: r.id, name: r.name, priceCents: r.priceCents, freeAboveCents: r.freeAboveCents, minDays: r.minDays, maxDays: r.maxDays, carrierId: r.carrierId, carrierName: r.carrier?.name ?? null })),
    shippingRate: rate,
    totals,
    vatMode: tax.vatMode,
    itemCount: lines.reduce((a, l) => a + l.quantity, 0),
  };
}

export async function cartCount(): Promise<number> {
  const cart = await findCart();
  return cart?.items.reduce((a, i) => a + i.quantity, 0) ?? 0;
}
