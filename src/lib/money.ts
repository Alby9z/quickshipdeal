/**
 * Calculs monétaires en centimes entiers. Aucun flottant n'est stocké :
 * les divisions sont arrondies au centime le plus proche (arrondi bancaire non utilisé,
 * arrondi "half away from zero" conforme à l'usage comptable français).
 */

export class MoneyError extends Error {}

export function assertCents(value: number, label = "montant"): number {
  if (!Number.isInteger(value)) throw new MoneyError(`${label} doit être un entier en centimes`);
  if (value < 0) throw new MoneyError(`${label} ne peut pas être négatif`);
  if (value > 100_000_000_00) throw new MoneyError(`${label} est anormalement élevé`);
  return value;
}

/** Arrondi d'un rapport a/b au centime, demi vers l'extérieur. */
export function roundDiv(a: number, b: number): number {
  if (b === 0) throw new MoneyError("Division par zéro");
  const sign = Math.sign(a) * Math.sign(b);
  const q = Math.abs(a) / Math.abs(b);
  return sign * Math.round(q);
}

/** Convertit une saisie utilisateur ("12,90", "12.9", "12") en centimes. */
export function parseEuros(input: string | number): number {
  const s = String(input).trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new MoneyError(`Montant invalide : "${input}"`);
  const [intPart, dec = ""] = s.split(".");
  return Number(intPart) * 100 + Number(dec.padEnd(2, "0"));
}

export function formatEuros(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Part de TVA incluse dans un montant TTC. rateBps : 2000 = 20 %. */
export function vatIncluded(grossCents: number, rateBps: number): number {
  if (rateBps <= 0) return 0;
  return grossCents - roundDiv(grossCents * 10000, 10000 + rateBps);
}

/** Montant HT à partir d'un TTC. */
export function netFromGross(grossCents: number, rateBps: number): number {
  return grossCents - vatIncluded(grossCents, rateBps);
}

export function percentOf(cents: number, bps: number): number {
  return roundDiv(cents * bps, 10000);
}

/**
 * Marge brute unitaire (HT) : prix de vente HT - coût d'achat HT.
 * En franchise de TVA, le prix de vente n'inclut pas de TVA (vatRateBps = 0).
 */
export function marginCents(priceGrossCents: number, costNetCents: number, vatRateBps: number) {
  return netFromGross(priceGrossCents, vatRateBps) - costNetCents;
}

/** Taux de marge en points de base, sur le prix de vente HT. */
export function marginRateBps(priceGrossCents: number, costNetCents: number, vatRateBps: number) {
  const net = netFromGross(priceGrossCents, vatRateBps);
  if (net <= 0) return 0;
  return roundDiv((net - costNetCents) * 10000, net);
}

/** Répartit une remise globale sur des lignes au prorata, sans perte de centime. */
export function allocate(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => Math.floor((totalCents * w) / sum));
  let remainder = totalCents - raw.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, frac: (totalCents * w) / sum - Math.floor((totalCents * w) / sum) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    raw[i] = (raw[i] ?? 0) + 1;
    remainder--;
  }
  return raw;
}
