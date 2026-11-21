"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminAction, str } from "@/lib/admin-action";
import { productFormSchema } from "@/modules/products/schemas";
import { archiveProduct, saveProduct } from "@/modules/products/service";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { AppError } from "@/lib/errors";
import { audit } from "@/modules/audit/service";
import { assertPermission } from "@/modules/auth/session";

function formToProduct(f: FormData) {
  const images = f.getAll("imageUrl").map((u, i) => ({ url: String(u).trim(), alt: String(f.getAll("imageAlt")[i] ?? "").trim() })).filter((i) => i.url);
  const o = Object.fromEntries([...f.entries()].filter(([k]) => !["imageUrl", "imageAlt", "categoryIds"].includes(k)));
  return productFormSchema.parse({ ...o, images, categoryIds: f.getAll("categoryIds").map(String), trackInventory: f.get("trackInventory") === "on", noIndex: f.get("noIndex") === "on" });
}

export const saveProductAction = adminAction<{ id: string; warnings: string[] }>("product:write", async (user, f) => {
  const id = str(f, "id") || null;
  const data = formToProduct(f);
  if (id) {
    const before = await db.product.findUnique({ where: { id }, select: { priceCents: true, costPriceCents: true, salePriceCents: true, compareAtCents: true } });
    const priceChanged = before && (before.priceCents !== data.priceCents || before.costPriceCents !== data.costPriceCents || before.salePriceCents !== data.salePriceCents || before.compareAtCents !== data.compareAtCents);
    if (priceChanged) await assertPermission("price:write");
  }
  const r = await saveProduct(id, data, user.id);
  return { message: r.warnings.length ? `Enregistré. Attention : ${r.warnings.join(" ")}` : "Produit enregistré", data: { id: r.product.id, warnings: r.warnings }, revalidate: ["/admin/produits", `/produit/${r.product.slug}`, "/", "/boutique"] };
});

export async function archiveProductAction(id: string) {
  const user = await assertPermission("product:write");
  await archiveProduct(id, user.id);
  revalidatePath("/admin/produits");
  redirect("/admin/produits");
}

export const saveCategoryAction = adminAction("category:write", async (user, f) => {
  const id = str(f, "id") || null;
  const name = str(f, "name");
  if (name.length < 2) throw new AppError("Nom requis");
  const slug = slugify(str(f, "slug") || name);
  const parentId = str(f, "parentId") || null;
  if (id && parentId === id) throw new AppError("Une catégorie ne peut pas être sa propre parente.");
  const data = { name, slug, description: str(f, "description") || null, parentId, position: Number(str(f, "position") || 0), isVisible: f.get("isVisible") === "on", imageUrl: str(f, "imageUrl") || null };
  const clash = await db.category.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) throw new AppError("Slug déjà utilisé");
  const seo = { title: str(f, "seoTitle") || null, description: str(f, "seoDescription") || null };
  if (id) {
    const c = await db.category.update({ where: { id }, data });
    if (c.seoId) await db.seoMetadata.update({ where: { id: c.seoId }, data: seo });
    else await db.category.update({ where: { id }, data: { seo: { create: seo } } });
  } else {
    const { parentId: pid, ...rest } = data;
    await db.category.create({ data: { ...rest, parent: pid ? { connect: { id: pid } } : undefined, seo: { create: seo } } });
  }
  await audit({ actorId: user.id, action: id ? "category.update" : "category.create", entityType: "Category", entityId: id, changes: { name } });
  return { message: "Catégorie enregistrée", revalidate: ["/admin/categories", "/categories", "/"] };
});

export const deleteCategoryAction = adminAction("category:write", async (user, f) => {
  const id = str(f, "id");
  const used = await db.product.count({ where: { primaryCategoryId: id, deletedAt: null } });
  if (used) throw new AppError(`${used} produit(s) utilisent cette catégorie : réaffectez-les d'abord.`);
  await db.category.delete({ where: { id } });
  await audit({ actorId: user.id, action: "category.delete", entityType: "Category", entityId: id });
  return { message: "Catégorie supprimée", revalidate: ["/admin/categories"] };
});

export const quickPriceAction = adminAction("price:write", async (user, f) => {
  const { parseEuros } = await import("@/lib/money");
  const { validatePricing } = await import("@/modules/pricing/pricing");
  const id = str(f, "id");
  const p = await db.product.findUniqueOrThrow({ where: { id } });
  const priceCents = parseEuros(str(f, "price"));
  const costPriceCents = parseEuros(str(f, "cost") || "0");
  const salePriceCents = str(f, "sale") ? parseEuros(str(f, "sale")) : null;
  const v = validatePricing({ priceCents, costPriceCents, salePriceCents, compareAtCents: p.compareAtCents, vatRateBps: p.vatRateBps, saleStartsAt: p.saleStartsAt, saleEndsAt: p.saleEndsAt });
  if (v.errors.length) throw new AppError(v.errors.join(" "));
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { priceCents, costPriceCents, salePriceCents } });
    for (const [field, oldV, newV] of [["priceCents", p.priceCents, priceCents], ["costPriceCents", p.costPriceCents, costPriceCents], ["salePriceCents", p.salePriceCents, salePriceCents]] as const) {
      if (oldV !== newV) await tx.priceHistory.create({ data: { productId: id, field, oldValueCents: oldV, newValueCents: newV, source: "admin", changedById: user.id, reason: "Modification rapide" } });
    }
    await audit({ actorId: user.id, action: "price.update", entityType: "Product", entityId: id, changes: { priceCents, costPriceCents, salePriceCents } }, tx);
  });
  return { message: v.warnings.length ? `Prix mis à jour. ${v.warnings.join(" ")}` : "Prix mis à jour", revalidate: ["/admin/prix", `/produit/${p.slug}`] };
});

export const stockAction = adminAction("inventory:write", async (user, f) => {
  const productId = str(f, "productId");
  const quantity = Math.max(0, Math.trunc(Number(str(f, "quantity"))));
  const threshold = Math.max(0, Math.trunc(Number(str(f, "threshold") || 3)));
  const availability = str(f, "availability") as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "ON_ORDER" | "DISCONTINUED";
  await db.$transaction(async (tx) => {
    await tx.inventory.upsert({ where: { productId }, create: { productId, quantity, lowStockThreshold: threshold }, update: { quantity, lowStockThreshold: threshold } });
    await tx.product.update({ where: { id: productId }, data: { availability } });
    await audit({ actorId: user.id, action: "inventory.update", entityType: "Product", entityId: productId, changes: { quantity, availability } }, tx);
  });
  return { message: "Stock mis à jour", revalidate: ["/admin/stocks"] };
});
