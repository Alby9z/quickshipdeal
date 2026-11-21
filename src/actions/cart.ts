"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { toActionError, type ActionResult } from "@/lib/errors";
import { addToCart, setCartCoupon, updateCartItem, validateCoupon } from "@/modules/cart/service";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { clientIp } from "@/lib/rate-limit";

const addSchema = z.object({ productId: z.string().min(1), variantId: z.string().optional().nullable(), quantity: z.coerce.number().int().min(1).max(20) });

export async function addToCartAction(input: z.input<typeof addSchema>): Promise<ActionResult<{ limited: boolean }>> {
  try {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`cart:${ip}`, 60, 60)).ok) return { ok: false, error: "Trop de requêtes, réessayez dans un instant." };
    const d = addSchema.parse(input);
    const r = await addToCart(d.productId, d.variantId ?? null, d.quantity);
    revalidatePath("/", "layout");
    return { ok: true, data: { limited: r.limited }, message: r.limited ? "Quantité ajustée au stock disponible." : "Ajouté au panier" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  try {
    await updateCartItem(z.string().min(1).parse(itemId), z.number().int().min(0).max(20).parse(quantity));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function applyCouponAction(code: string): Promise<ActionResult> {
  try {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`coupon:${ip}`, 10, 300)).ok) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };
    const c = z.string().trim().min(2).max(40).parse(code);
    const v = await validateCoupon(c);
    if (!v.coupon) return { ok: false, error: v.error ?? "Code invalide." };
    await setCartCoupon(c);
    revalidatePath("/panier");
    revalidatePath("/commande");
    return { ok: true, message: "Code appliqué" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  await setCartCoupon(null);
  revalidatePath("/panier");
  revalidatePath("/commande");
  return { ok: true };
}
