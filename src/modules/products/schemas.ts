import { z } from "zod";
import { parseEuros } from "@/lib/money";

const euros = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    try {
      return parseEuros(v);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
      return z.NEVER;
    }
  });
const optionalEuros = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v == null || String(v).trim() === "") return null;
    try {
      return parseEuros(v);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
      return z.NEVER;
    }
  });
const optInt = z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((v) => (v == null || String(v).trim() === "" ? null : Math.max(0, Math.trunc(Number(v)))));
const optDate = z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v ? new Date(v) : null));
const optStr = z.string().trim().max(5000).optional().transform((v) => (v ? v : null));

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(200),
  slug: z.string().trim().max(140).optional(),
  sku: z.string().trim().min(2, "Référence SKU requise").max(64).regex(/^[A-Za-z0-9._-]+$/, "Lettres, chiffres, . _ - uniquement"),
  shortDescription: optStr,
  description: z.string().trim().max(20000).optional().transform((v) => v || null),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  primaryCategoryId: z.string().optional().transform((v) => v || null),
  categoryIds: z.array(z.string()).default([]),
  brand: optStr,
  priceCents: euros,
  costPriceCents: euros,
  salePriceCents: optionalEuros,
  compareAtCents: optionalEuros,
  saleStartsAt: optDate,
  saleEndsAt: optDate,
  vatRateBps: z.coerce.number().int().min(0).max(10000),
  availability: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "ON_ORDER", "DISCONTINUED"]),
  trackInventory: z.boolean(),
  stockQuantity: optInt,
  lowStockThreshold: optInt,
  weightGrams: optInt,
  lengthMm: optInt,
  widthMm: optInt,
  heightMm: optInt,
  leadTimeMinDays: optInt,
  leadTimeMaxDays: optInt,
  supplierId: z.string().optional().transform((v) => v || null),
  supplierReference: optStr,
  originCountry: optStr,
  euResponsiblePerson: optStr,
  safetyInformation: optStr,
  tags: z.string().optional().transform((v) => (v ? v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 30) : [])),
  videoUrls: z.string().optional().transform((v) => (v ? v.split(/\s+/).filter((u) => /^https:\/\//.test(u)).slice(0, 5) : [])),
  images: z
    .array(z.object({ url: z.string().trim().max(2000).refine((u) => /^\/[^/]/.test(u) || /^https:\/\/[^\s]+$/.test(u), "URL https (ou chemin local /…) requise"), alt: z.string().trim().min(1, "Texte alternatif requis").max(200) }))
    .max(20)
    .default([]),
  seoTitle: optStr,
  seoDescription: optStr,
  noIndex: z.boolean().default(false),
  priceChangeReason: optStr,
});
export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;
