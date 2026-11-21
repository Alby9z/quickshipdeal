import { allocate, percentOf, vatIncluded } from "@/lib/money";

export type TotalsLine = { key: string; unitCents: number; quantity: number; vatRateBps: number; costCents: number };
export type CouponInput = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotalCents: number | null;
};
export type ShippingInput = { priceCents: number; freeAboveCents: number | null } | null;

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  costTotalCents: number;
  lineDiscounts: Record<string, number>;
  couponApplied: boolean;
  couponError: string | null;
};

/**
 * Calcul pur des totaux (testé unitairement). Tous les montants sont en centimes.
 * - La remise coupon est répartie sur les lignes au prorata (pour la TVA et les factures).
 * - La TVA est la part incluse dans les prix TTC, ligne par ligne, puis sur la livraison au taux normal.
 */
export function computeTotals(lines: TotalsLine[], coupon: CouponInput | null, shipping: ShippingInput, shippingVatBps: number): Totals {
  const lineTotals = lines.map((l) => l.unitCents * l.quantity);
  const subtotalCents = lineTotals.reduce((a, b) => a + b, 0);
  const costTotalCents = lines.reduce((a, l) => a + l.costCents * l.quantity, 0);

  let discountCents = 0;
  let freeShipping = false;
  let couponApplied = false;
  let couponError: string | null = null;
  if (coupon) {
    if (coupon.minSubtotalCents != null && subtotalCents < coupon.minSubtotalCents) {
      couponError = `Ce code nécessite un panier d'au moins ${(coupon.minSubtotalCents / 100).toFixed(2).replace(".", ",")} €.`;
    } else {
      couponApplied = true;
      if (coupon.type === "PERCENT") discountCents = percentOf(subtotalCents, Math.min(coupon.value, 10000));
      else if (coupon.type === "FIXED") discountCents = Math.min(coupon.value, subtotalCents);
      else freeShipping = true;
    }
  }
  const shares = allocate(discountCents, lineTotals);
  const lineDiscounts: Record<string, number> = {};
  lines.forEach((l, i) => (lineDiscounts[l.key] = shares[i] ?? 0));

  let shippingCents = 0;
  if (shipping && !freeShipping) {
    const afterDiscount = subtotalCents - discountCents;
    shippingCents = shipping.freeAboveCents != null && afterDiscount >= shipping.freeAboveCents ? 0 : shipping.priceCents;
  }

  const taxCents =
    lines.reduce((acc, l, i) => acc + vatIncluded((lineTotals[i] ?? 0) - (shares[i] ?? 0), l.vatRateBps), 0) +
    vatIncluded(shippingCents, shippingVatBps);

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    costTotalCents,
    lineDiscounts,
    couponApplied,
    couponError,
  };
}
