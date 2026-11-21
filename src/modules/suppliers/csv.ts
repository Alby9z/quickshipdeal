import { parseEuros } from "@/lib/money";
import type { SupplierCatalogItem } from "@/integrations/suppliers/adapter";
import type { AvailabilityStatus } from "@prisma/client";

/** Découpe une ligne CSV (séparateur ; ou ,) en gérant les guillemets. */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const AVAIL: Record<string, AvailabilityStatus> = { in_stock: "IN_STOCK", en_stock: "IN_STOCK", low_stock: "LOW_STOCK", limite: "LOW_STOCK", out_of_stock: "OUT_OF_STOCK", rupture: "OUT_OF_STOCK", on_order: "ON_ORDER", sur_commande: "ON_ORDER", discontinued: "DISCONTINUED" };

/**
 * Import CSV d'un catalogue fournisseur. Colonnes reconnues (en-tête obligatoire) :
 * sku (obligatoire), titre/title, prix_achat/cost (HT, euros), stock, disponibilite/availability, id.
 * Les lignes invalides sont rejetées avec leur motif — rien n'est deviné.
 */
export function parseSupplierCsv(text: string): { items: SupplierCatalogItem[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { items: [], errors: ["Fichier vide ou sans ligne de données."] };
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitCsvLine(lines[0]!, sep).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const iSku = col("sku", "reference", "ref"), iTitle = col("titre", "title", "nom", "name"), iCost = col("prix_achat", "cost", "cout", "prix_achat_ht"), iStock = col("stock", "quantite", "quantity"), iAvail = col("disponibilite", "availability"), iId = col("id", "external_id");
  if (iSku < 0) return { items: [], errors: ["Colonne « sku » introuvable dans l'en-tête."] };
  const items: SupplierCatalogItem[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  lines.slice(1).forEach((line, n) => {
    const c = splitCsvLine(line, sep);
    const row = n + 2;
    const sku = c[iSku]?.trim();
    if (!sku) return errors.push(`Ligne ${row} : SKU manquant.`);
    if (seen.has(sku)) return errors.push(`Ligne ${row} : SKU ${sku} en double.`);
    seen.add(sku);
    const item: SupplierCatalogItem = { externalSku: sku, raw: Object.fromEntries(head.map((h, i) => [h, c[i] ?? ""])) };
    if (iTitle >= 0 && c[iTitle]) item.title = c[iTitle];
    if (iId >= 0 && c[iId]) item.externalId = c[iId];
    if (iCost >= 0 && c[iCost]) {
      try { item.costPriceCents = parseEuros(c[iCost]!); } catch { return errors.push(`Ligne ${row} : prix d'achat invalide « ${c[iCost]} ».`); }
    }
    if (iStock >= 0 && c[iStock]) {
      const q = Number(c[iStock]);
      if (!Number.isInteger(q) || q < 0) return errors.push(`Ligne ${row} : stock invalide « ${c[iStock]} ».`);
      item.stockQuantity = q;
      item.availability = q === 0 ? "OUT_OF_STOCK" : "IN_STOCK";
    }
    if (iAvail >= 0 && c[iAvail]) {
      const a = AVAIL[c[iAvail]!.toLowerCase().replace(/\s+/g, "_")];
      if (!a) return errors.push(`Ligne ${row} : disponibilité inconnue « ${c[iAvail]} ».`);
      item.availability = a;
    }
    items.push(item);
  });
  return { items, errors };
}
