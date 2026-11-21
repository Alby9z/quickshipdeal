import { z } from "zod";
import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Réglages administrables stockés dans AppSetting (clé → JSON validé par Zod).
 * Aucune information légale n'est inventée : un champ vide reste vide et est signalé.
 */
export const businessSchema = z.object({
  legalName: z.string().default(""),
  tradeName: z.string().default("QuickShipDeals"),
  legalForm: z.string().default(""),
  siren: z.string().default(""),
  siret: z.string().default(""),
  rcs: z.string().default(""),
  euid: z.string().default(""),
  apeCode: z.string().default(""),
  registeredAddress: z.string().default(""),
  contactAddress: z.string().default(""),
  returnAddress: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  vatNumber: z.string().default(""),
  publicationDirector: z.string().default(""),
  hostName: z.string().default(""),
  hostAddress: z.string().default(""),
  mediatorName: z.string().default(""),
  mediatorUrl: z.string().default(""),
  createdOn: z.string().default(""),
});
export type BusinessSettings = z.infer<typeof businessSchema>;

export const taxSchema = z.object({
  /** UNCONFIGURED : à choisir par l'administrateur. FRANCHISE : art. 293 B du CGI. STANDARD : TVA collectée. */
  vatMode: z.enum(["UNCONFIGURED", "FRANCHISE", "STANDARD"]).default("UNCONFIGURED"),
  defaultVatRateBps: z.number().int().min(0).max(10000).default(2000),
});
export type TaxSettings = z.infer<typeof taxSchema>;

export const storeSchema = z.object({
  currency: z.string().default("EUR"),
  lowStockThreshold: z.number().int().min(0).default(3),
  orderPrefix: z.string().default("QSD"),
  invoicePrefix: z.string().default("F"),
  returnWindowDays: z.number().int().min(14).default(14),
  allowGuestCheckout: z.boolean().default(true),
  abandonedCartEnabled: z.boolean().default(false),
  abandonedCartDelayHours: z.number().int().min(1).default(24),
  termsVersion: z.string().default("brouillon"),
  maintenanceBanner: z.string().default(""),
});
export type StoreSettings = z.infer<typeof storeSchema>;

const schemas = { business: businessSchema, tax: taxSchema, store: storeSchema } as const;
type Key = keyof typeof schemas;
type Value<K extends Key> = z.infer<(typeof schemas)[K]>;

async function read<K extends Key>(key: K): Promise<Value<K>> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return schemas[key].parse(row?.value ?? {}) as Value<K>;
}

export const getSetting = cache(read);

export async function setSetting<K extends Key>(key: K, value: Value<K>, actorId?: string) {
  const parsed = schemas[key].parse(value);
  await db.appSetting.upsert({
    where: { key },
    create: { key, value: parsed, updatedById: actorId },
    update: { value: parsed, updatedById: actorId },
  });
  return parsed;
}

/** Points bloquants à traiter avant une ouverture commerciale. */
export async function launchChecklist() {
  const [b, t] = await Promise.all([read("business"), read("tax")]);
  const issues: string[] = [];
  if (t.vatMode === "UNCONFIGURED") issues.push("Régime de TVA non choisi (Réglages → Fiscalité).");
  if (t.vatMode === "STANDARD" && !b.vatNumber) issues.push("Numéro de TVA intracommunautaire manquant.");
  if (!b.mediatorName) issues.push("Médiateur de la consommation non renseigné (obligatoire en B2C).");
  if (!b.hostName) issues.push("Hébergeur du site non renseigné (mentions légales).");
  if (b.registeredAddress && b.contactAddress && b.registeredAddress !== b.contactAddress)
    issues.push("L'adresse de contact diffère du siège inscrit au RCS : mettre à jour le registre ou les mentions.");
  const legalPages = await db.page.count({ where: { needsLegalReview: true } });
  if (legalPages > 0) issues.push(`${legalPages} page(s) légale(s) à faire valider par un professionnel.`);
  return issues;
}
