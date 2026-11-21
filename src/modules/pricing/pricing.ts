import { MoneyError, assertCents, marginCents, marginRateBps, percentOf } from "@/lib/money";

export type PriceInput = {
  priceCents: number;
  salePriceCents: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  costPriceCents: number;
  vatRateBps: number;
  promotions?: { type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: number; startsAt: Date; endsAt: Date | null; isActive: boolean }[];
};

export type EffectivePrice = {
  /** Prix payé par le client (TTC si TVA collectée). */
  unitCents: number;
  /** Prix de référence barré, uniquement quand une réduction réelle est active. */
  compareAtCents: number | null;
  onSale: boolean;
  discountPercent: number | null;
};

function inWindow(now: Date, start: Date | null, end: Date | null) {
  return (!start || start <= now) && (!end || end > now);
}

/** Prix effectif à un instant donné : le meilleur entre prix promo produit et promotions actives. */
export function effectivePrice(p: PriceInput, now = new Date()): EffectivePrice {
  let best = p.priceCents;
  if (p.salePriceCents != null && p.salePriceCents < p.priceCents && inWindow(now, p.saleStartsAt, p.saleEndsAt)) {
    best = p.salePriceCents;
  }
  for (const promo of p.promotions ?? []) {
    if (!promo.isActive || !inWindow(now, promo.startsAt, promo.endsAt)) continue;
    let candidate = p.priceCents;
    if (promo.type === "PERCENT") candidate = p.priceCents - percentOf(p.priceCents, promo.value);
    else if (promo.type === "FIXED") candidate = p.priceCents - promo.value;
    else continue;
    if (candidate >= 0 && candidate < best) best = candidate;
  }
  const onSale = best < p.priceCents;
  return {
    unitCents: best,
    compareAtCents: onSale ? p.priceCents : null,
    onSale,
    discountPercent: onSale ? Math.round(((p.priceCents - best) / p.priceCents) * 100) : null,
  };
}

export type PriceValidation = { errors: string[]; warnings: string[] };

/** Contrôle des prix incohérents avant enregistrement. */
export function validatePricing(p: {
  priceCents: number;
  costPriceCents: number;
  salePriceCents?: number | null;
  compareAtCents?: number | null;
  vatRateBps: number;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
}): PriceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    assertCents(p.priceCents, "Prix de vente");
    assertCents(p.costPriceCents, "Prix d'achat");
    if (p.salePriceCents != null) assertCents(p.salePriceCents, "Prix promotionnel");
    if (p.compareAtCents != null) assertCents(p.compareAtCents, "Ancien prix");
  } catch (e) {
    if (e instanceof MoneyError) errors.push(e.message);
    else throw e;
  }
  if (p.priceCents === 0) errors.push("Le prix de vente ne peut pas être nul.");
  if (p.salePriceCents != null && p.salePriceCents >= p.priceCents)
    errors.push("Le prix promotionnel doit être inférieur au prix de vente.");
  if (p.saleStartsAt && p.saleEndsAt && p.saleEndsAt <= p.saleStartsAt)
    errors.push("La fin de la promotion doit être postérieure à son début.");
  if (p.compareAtCents != null && p.compareAtCents <= p.priceCents)
    errors.push("L'ancien prix barré doit être supérieur au prix de vente (il doit correspondre à un prix réellement pratiqué).");
  if (p.vatRateBps < 0 || p.vatRateBps > 10000) errors.push("Taux de TVA invalide.");
  if (errors.length === 0) {
    const m = marginCents(p.salePriceCents ?? p.priceCents, p.costPriceCents, p.vatRateBps);
    if (m < 0) warnings.push("Vente à perte : le prix HT est inférieur au prix d'achat.");
    else if (p.costPriceCents > 0 && marginRateBps(p.salePriceCents ?? p.priceCents, p.costPriceCents, p.vatRateBps) < 1000)
      warnings.push("Marge inférieure à 10 %.");
    if (p.costPriceCents === 0) warnings.push("Prix d'achat non renseigné : la marge ne peut pas être calculée.");
  }
  return { errors, warnings };
}

/** Règle de marge fournisseur : prix de vente conseillé à partir du coût. */
export function priceFromMarginRule(costCents: number, rule: { type: string; value: number }, vatRateBps: number): number | null {
  if (rule.type === "none") return null;
  let net: number;
  if (rule.type === "percent") net = costCents + percentOf(costCents, rule.value);
  else if (rule.type === "fixed") net = costCents + rule.value;
  else return null;
  const gross = net + percentOf(net, vatRateBps);
  // Arrondi commercial à 0,90 € supérieur (ex. 12,34 → 12,90)
  const euros = Math.floor(gross / 100);
  const candidate = euros * 100 + 90;
  return candidate >= gross ? candidate : candidate + 100;
}

/** TVA effective selon le régime choisi. En franchise, aucune TVA n'est collectée. */
export function applicableVatBps(productRateBps: number, vatMode: "UNCONFIGURED" | "FRANCHISE" | "STANDARD") {
  return vatMode === "STANDARD" ? productRateBps : 0;
}
