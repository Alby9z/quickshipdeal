"use server";

import { headers } from "next/headers";
import { checkoutSchema, type CheckoutInput } from "@/modules/checkout/schemas";
import { startCheckout } from "@/modules/checkout/service";
import { toActionError, type ActionResult } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function checkoutAction(input: CheckoutInput): Promise<ActionResult<{ url: string }>> {
  try {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`checkout:${ip}`, 10, 600)).ok) return { ok: false, error: "Trop de tentatives de paiement. Réessayez dans quelques minutes." };
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Merci de vérifier le formulaire.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    const r = await startCheckout(parsed.data);
    return { ok: true, data: { url: r.url } };
  } catch (e) {
    return toActionError(e);
  }
}
