import "server-only";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import type { ProductFormValues } from "@/components/admin/product-form";

const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const n = (v: number | null | undefined) => (v == null ? "" : String(v));

export async function productFormOptions() {
  const [categories, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, suppliers };
}

export async function productToForm(id: string): Promise<ProductFormValues | null> {
  const p = await db.product.findFirst({ where: { id, deletedAt: null }, include: { images: { orderBy: { position: "asc" } }, categories: true, inventory: true, seo: true } });
  if (!p) return null;
  return {
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, brand: p.brand ?? "", shortDescription: p.shortDescription ?? "", description: p.description ?? "",
    status: p.status, primaryCategoryId: p.primaryCategoryId ?? "", categoryIds: p.categories.map((c) => c.categoryId),
    priceCents: centsToInput(p.priceCents), costPriceCents: centsToInput(p.costPriceCents), salePriceCents: centsToInput(p.salePriceCents), compareAtCents: centsToInput(p.compareAtCents),
    saleStartsAt: dt(p.saleStartsAt), saleEndsAt: dt(p.saleEndsAt), vatRateBps: String(p.vatRateBps), availability: p.availability, trackInventory: p.trackInventory,
    stockQuantity: n(p.inventory?.quantity), lowStockThreshold: n(p.inventory?.lowStockThreshold), weightGrams: n(p.weightGrams), lengthMm: n(p.lengthMm), widthMm: n(p.widthMm), heightMm: n(p.heightMm),
    leadTimeMinDays: n(p.leadTimeMinDays), leadTimeMaxDays: n(p.leadTimeMaxDays), supplierId: p.supplierId ?? "", supplierReference: p.supplierReference ?? "",
    originCountry: p.originCountry ?? "", euResponsiblePerson: p.euResponsiblePerson ?? "", safetyInformation: p.safetyInformation ?? "",
    tags: p.tags.join(", "), videoUrls: p.videoUrls.join("\n"), images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    seoTitle: p.seo?.title ?? "", seoDescription: p.seo?.description ?? "", noIndex: p.seo?.noIndex ?? false,
  };
}
