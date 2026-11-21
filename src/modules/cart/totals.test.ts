import { describe, expect, it } from "vitest";
import { computeTotals } from "./totals";

const lines = [
  { key: "a", unitCents: 1999, quantity: 2, vatRateBps: 2000, costCents: 800 },
  { key: "b", unitCents: 500, quantity: 1, vatRateBps: 550, costCents: 200 },
];

describe("computeTotals", () => {
  it("sans coupon ni livraison", () => {
    const t = computeTotals(lines, null, null, 2000);
    expect(t.subtotalCents).toBe(4498);
    expect(t.totalCents).toBe(4498);
    expect(t.costTotalCents).toBe(1800);
  });
  it("coupon pourcentage réparti sur les lignes", () => {
    const t = computeTotals(lines, { code: "X", type: "PERCENT", value: 1000, minSubtotalCents: null }, { priceCents: 490, freeAboveCents: null }, 2000);
    expect(t.discountCents).toBe(450);
    expect(Object.values(t.lineDiscounts).reduce((a, b) => a + b, 0)).toBe(450);
    expect(t.totalCents).toBe(4498 - 450 + 490);
  });
  it("coupon fixe plafonné au sous-total", () => {
    const t = computeTotals([{ key: "a", unitCents: 300, quantity: 1, vatRateBps: 0, costCents: 0 }], { code: "X", type: "FIXED", value: 1000, minSubtotalCents: null }, null, 0);
    expect(t.discountCents).toBe(300);
    expect(t.totalCents).toBe(0);
  });
  it("minimum de commande non atteint", () => {
    const t = computeTotals(lines, { code: "X", type: "FIXED", value: 500, minSubtotalCents: 10000 }, null, 0);
    expect(t.couponApplied).toBe(false);
    expect(t.discountCents).toBe(0);
    expect(t.couponError).toMatch(/au moins/);
  });
  it("livraison offerte au-delà du seuil et coupon livraison gratuite", () => {
    expect(computeTotals(lines, null, { priceCents: 590, freeAboveCents: 4000 }, 2000).shippingCents).toBe(0);
    expect(computeTotals(lines, null, { priceCents: 590, freeAboveCents: 5000 }, 2000).shippingCents).toBe(590);
    expect(computeTotals(lines, { code: "F", type: "FREE_SHIPPING", value: 0, minSubtotalCents: null }, { priceCents: 590, freeAboveCents: null }, 2000).shippingCents).toBe(0);
  });
  it("TVA à 0 en franchise", () => {
    const t = computeTotals(lines.map((l) => ({ ...l, vatRateBps: 0 })), null, { priceCents: 500, freeAboveCents: null }, 0);
    expect(t.taxCents).toBe(0);
  });
});
