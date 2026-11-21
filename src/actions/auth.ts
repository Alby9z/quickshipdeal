"use server";

import { getCurrentUser } from "@/modules/auth/session";
import { mergeGuestCart } from "@/modules/cart/service";

/** Appelée juste après la connexion : fusion du panier invité dans le compte. */
export async function afterSignInAction() {
  const user = await getCurrentUser();
  if (!user) return { isStaff: false };
  await mergeGuestCart(user.id).catch(() => undefined);
  return { isStaff: user.isStaff };
}
