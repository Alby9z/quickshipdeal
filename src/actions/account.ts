"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { toActionError, type ActionResult } from "@/lib/errors";
import { getCurrentUser } from "@/modules/auth/session";

export async function toggleWishlistAction(productId: string): Promise<ActionResult<{ inWishlist: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Connectez-vous pour utiliser les favoris." };
    const id = z.string().min(1).parse(productId);
    const wl = await db.wishlist.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    const existing = await db.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wl.id, productId: id } } });
    if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
    else await db.wishlistItem.create({ data: { wishlistId: wl.id, productId: id } });
    revalidatePath("/compte/favoris");
    return { ok: true, data: { inWishlist: !existing } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function recordViewAction(productId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.recentlyViewed
    .upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId }, update: { viewedAt: new Date() } })
    .catch(() => undefined);
}
