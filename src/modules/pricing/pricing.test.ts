import { describe, expect, it } from "vitest";
import { applicableVatBps, effectivePrice, priceFromMarginRule, validatePricing } from "./pricing";

const base = { priceCents: 2000, salePriceCents: null, saleStartsAt: null, saleEndsAt: null, costPriceCents: 800, vatRateBps: 2000 };

describe("effectivePrice", () => {
  it("prix normal sans promotion", () => {
    expect(effectivePrice(base)).toEqual({ unitCents: 2000, compareAtCents: null, onSale: false, discountPercent: null });
  });
  it("prix promo dans sa fenêtre", () => {
    const now = new Date("2026-06-15");
    const p = { ...base, salePriceCents: 1500, saleStartsAt: new Date("2026-06-01"), saleEndsAt: new Date("2026-06-30") };
    expect(effectivePrice(p, now)).toMatchObject({ unitCents: 1500, compareAtCents: 2000, onSale: true, discountPercent: 25 });
    expect(effectivePrice(p, new Date("2026-07-01")).onSale).toBe(false);
  });
  it("ignore un prix promo supérieur au prix", () => {
    expect(effectivePrice({ ...base, salePriceCents: 2500 }).unitCents).toBe(2000);
  });
  it("applique la meilleure promotion active", () => {
    const p = { ...base, promotions: [{ type: "PERCENT" as const, value: 1000, startsAt: new Date(0), endsAt: null, isActive: true }, { type: "FIXED" as const, value: 500, startsAt: new Date(0), endsAt: null, isActive: true }] };
    expect(effectivePrice(p).unitCents).toBe(1500);
  });
});

describe("validatePricing", () => {
  it("refuse les incohérences", () => {
    expect(validatePricing({ ...base, priceCents: 0 }).errors.length).toBeGreaterThan(0);
    expect(validatePricing({ ...base, salePriceCents: 2000 }).errors).toContain("Le prix promotionnel doit être inférieur au prix de vente.");
    expect(validatePricing({ ...base, compareAtCents: 1500 }).errors.length).toBe(1);
    expect(validatePricing({ ...base, costPriceCents: -5 }).errors.length).toBe(1);
  });
  it("avertit en cas de vente à perte", () => {
    const r = validatePricing({ ...base, priceCents: 900, costPriceCents: 1000 });
    expect(r.errors).toEqual([]);
    expect(r.warnings[0]).toMatch(/perte/);
  });
});

describe("priceFromMarginRule", () => {
  it("applique un pourcentage puis arrondit à ,90", () => {
    // coût 10,00 HT + 50 % = 15,00 HT → 18,00 TTC → 18,90
    expect(priceFromMarginRule(1000, { type: "percent", value: 5000 }, 2000)).toBe(1890);
    expect(priceFromMarginRule(1000, { type: "none", value: 0 }, 2000)).toBeNull();
  });
});

describe("applicableVatBps", () => {
  it("aucune TVA en franchise", () => {
    expect(applicableVatBps(2000, "FRANCHISE")).toBe(0);
    expect(applicableVatBps(2000, "STANDARD")).toBe(2000);
  });
});
