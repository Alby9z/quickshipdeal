import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { audit } from "@/modules/audit/service";
import { validatePricing } from "@/modules/pricing/pricing";
import type { ProductFormData } from "./schemas";

const PRICE_FIELDS = ["priceCents", "costPriceCents", "salePriceCents", "compareAtCents"] as const;

/** Création ou modification d'un produit, avec contrôle des prix, historique et audit, en transaction. */
export async function saveProduct(id: string | null, input: ProductFormData, actorId: string) {
  const check = validatePricing(input);
  if (check.errors.length) throw new AppError(check.errors.join(" "));
  if (input.leadTimeMinDays != null && input.leadTimeMaxDays != null && input.leadTimeMaxDays < input.leadTimeMinDays)
    throw new AppError("Le délai maximum doit être supérieur au délai minimum.");
  if (input.status === "PUBLISHED" && input.images.length === 0)
    throw new AppError("Ajoutez au moins une image avant de publier le produit.");

  const slug = slugify(input.slug || input.name);
  if (!slug) throw new AppError("Slug invalide.");

  const product = await db.$transaction(async (tx) => {
    const clash = await tx.product.findFirst({ where: { OR: [{ slug }, { sku: input.sku }], NOT: id ? { id } : undefined }, select: { slug: true, sku: true } });
    if (clash) throw new AppError(clash.sku === input.sku ? "Ce SKU est déjà utilisé." : "Ce slug est déjà utilisé.");

    const before = id ? await tx.product.findUnique({ where: { id }, include: { seo: true } }) : null;
    if (id && !before) throw new AppError("Produit introuvable.");

    const seoData = { title: input.seoTitle, description: input.seoDescription, noIndex: input.noIndex };
    const data: Prisma.ProductUncheckedCreateInput = {
      name: input.name,
      slug,
      sku: input.sku,
      shortDescription: input.shortDescription,
      description: input.description,
      status: input.status,
      primaryCategoryId: input.primaryCategoryId,
      brand: input.brand,
      priceCents: input.priceCents,
      costPriceCents: input.costPriceCents,
      salePriceCents: input.salePriceCents,
      compareAtCents: input.compareAtCents,
      saleStartsAt: input.saleStartsAt,
      saleEndsAt: input.saleEndsAt,
      vatRateBps: input.vatRateBps,
      availability: input.availability,
      trackInventory: input.trackInventory,
      weightGrams: input.weightGrams,
      lengthMm: input.lengthMm,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      leadTimeMinDays: input.leadTimeMinDays,
      leadTimeMaxDays: input.leadTimeMaxDays,
      supplierId: input.supplierId,
      supplierReference: input.supplierReference,
      originCountry: input.originCountry,
      euResponsiblePerson: input.euResponsiblePerson,
      safetyInformation: input.safetyInformation,
      tags: input.tags,
      videoUrls: input.videoUrls,
      publishedAt: input.status === "PUBLISHED" ? (before?.publishedAt ?? new Date()) : before?.publishedAt ?? null,
    };

    const saved = before
      ? await tx.product.update({ where: { id: before.id }, data })
      : await tx.product.create({ data });

    // SEO
    if (before?.seoId) await tx.seoMetadata.update({ where: { id: before.seoId }, data: seoData });
    else {
      const seo = await tx.seoMetadata.create({ data: seoData });
      await tx.product.update({ where: { id: saved.id }, data: { seoId: seo.id } });
    }

    // Catégories secondaires
    await tx.productCategory.deleteMany({ where: { productId: saved.id } });
    const cats = Array.from(new Set([...(input.primaryCategoryId ? [input.primaryCategoryId] : []), ...input.categoryIds]));
    if (cats.length) await tx.productCategory.createMany({ data: cats.map((categoryId) => ({ productId: saved.id, categoryId })) });

    // Images (ordre = position)
    await tx.productImage.deleteMany({ where: { productId: saved.id } });
    if (input.images.length)
      await tx.productImage.createMany({ data: input.images.map((img, position) => ({ productId: saved.id, url: img.url, alt: img.alt, position })) });

    // Stock
    if (input.trackInventory && input.stockQuantity != null) {
      await tx.inventory.upsert({
        where: { productId: saved.id },
        create: { productId: saved.id, quantity: input.stockQuantity, lowStockThreshold: input.lowStockThreshold ?? 3 },
        update: { quantity: input.stockQuantity, ...(input.lowStockThreshold != null ? { lowStockThreshold: input.lowStockThreshold } : {}) },
      });
    }

    // Historique des prix
    for (const field of PRICE_FIELDS) {
      const oldV = before ? (before[field] as number | null) : null;
      const newV = input[field] as number | null;
      if (!before || oldV !== newV) {
        if (!before && newV == null) continue;
        await tx.priceHistory.create({ data: { productId: saved.id, field, oldValueCents: oldV, newValueCents: newV, source: "admin", changedById: actorId, reason: input.priceChangeReason } });
      }
    }

    await audit({ actorId, action: before ? "product.update" : "product.create", entityType: "Product", entityId: saved.id, changes: { name: saved.name, status: saved.status, priceCents: saved.priceCents } }, tx);
    return saved;
  });
  return { product, warnings: check.warnings };
}

/** Suppression logique : le produit disparaît du catalogue mais reste lié aux commandes passées. */
export async function archiveProduct(id: string, actorId: string) {
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { status: "ARCHIVED", deletedAt: new Date() } });
    await audit({ actorId, action: "product.archive", entityType: "Product", entityId: id }, tx);
  });
}
