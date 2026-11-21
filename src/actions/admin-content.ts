"use server";

import { redirect } from "next/navigation";
import { adminAction, str, optStr, bool } from "@/lib/admin-action";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { audit } from "@/modules/audit/service";
import { businessSchema, taxSchema, storeSchema, setSetting } from "@/modules/settings/service";
import { ROLES, type PermissionKey } from "@/modules/auth/permissions";
import type { ContentStatus } from "@prisma/client";

async function upsertSeo(seoId: string | null, f: FormData) {
  const data = { title: optStr(f, "seoTitle"), description: optStr(f, "seoDescription"), noIndex: bool(f, "noIndex"), ogImageUrl: optStr(f, "ogImageUrl") };
  if (seoId) { await db.seoMetadata.update({ where: { id: seoId }, data }); return seoId; }
  return (await db.seoMetadata.create({ data })).id;
}

// ─────────── Blog ───────────
export const saveBlogPostAction = adminAction<{ id: string }>("content:write", async (user, f) => {
  const id = str(f, "id") || null;
  const title = str(f, "title");
  const content = str(f, "content");
  if (title.length < 3) throw new AppError("Titre requis");
  const status = (str(f, "status") || "DRAFT") as ContentStatus;
  const publishAt = str(f, "publishAt") ? new Date(str(f, "publishAt")) : null;
  if (status === "SCHEDULED" && !publishAt) throw new AppError("Date de publication requise pour un article programmé.");
  if (status !== "DRAFT" && content.length < 50) throw new AppError("Contenu trop court pour être publié.");
  const coverUrl = optStr(f, "coverUrl");
  if (coverUrl && !optStr(f, "coverAlt")) throw new AppError("Texte alternatif de l'image requis.");
  const slug = slugify(str(f, "slug") || title);
  const clash = await db.blogPost.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) throw new AppError("Slug déjà utilisé");
  const existing = id ? await db.blogPost.findUnique({ where: { id } }) : null;
  const seoId = await upsertSeo(existing?.seoId ?? null, f);
  const data = {
    title, slug, excerpt: optStr(f, "excerpt"), content, coverUrl, coverAlt: optStr(f, "coverAlt"), status, categoryId: optStr(f, "categoryId"),
    publishAt: status === "PUBLISHED" ? existing?.publishAt ?? new Date() : publishAt,
    tags: str(f, "tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20), seoId,
  };
  const p = id ? await db.blogPost.update({ where: { id }, data }) : await db.blogPost.create({ data: { ...data, authorId: user.id } });
  await audit({ actorId: user.id, action: id ? "blog.update" : "blog.create", entityType: "BlogPost", entityId: p.id, changes: { title, status } });
  return { message: "Article enregistré", data: { id: p.id }, revalidate: ["/admin/blog", "/blog", `/blog/${p.slug}`, "/sitemap.xml"] };
});

export async function deleteBlogPostAction(id: string) {
  const { assertPermission } = await import("@/modules/auth/session");
  const user = await assertPermission("content:write");
  await db.blogPost.delete({ where: { id } });
  await audit({ actorId: user.id, action: "blog.delete", entityType: "BlogPost", entityId: id });
  redirect("/admin/blog");
}

export const saveBlogCategoryAction = adminAction("content:write", async (user, f) => {
  const name = str(f, "name");
  if (!name) throw new AppError("Nom requis");
  await db.blogCategory.create({ data: { name, slug: slugify(name), description: optStr(f, "description") } });
  await audit({ actorId: user.id, action: "blog_category.create", entityType: "BlogCategory", changes: { name } });
  return { message: "Catégorie créée", revalidate: ["/admin/blog"] };
});

// ─────────── Pages ───────────
export const savePageAction = adminAction("content:write", async (user, f) => {
  const id = str(f, "id");
  const page = await db.page.findUniqueOrThrow({ where: { id } });
  const status = (str(f, "status") || "DRAFT") as ContentStatus;
  const content = str(f, "content");
  const legalReviewed = bool(f, "legalReviewed");
  if (status === "PUBLISHED" && page.needsLegalReview && !legalReviewed)
    throw new AppError("Page juridique : cochez la confirmation de validation (par vous-même ou un professionnel) avant publication.");
  if (status === "PUBLISHED" && /\[À COMPLÉTER/i.test(content)) throw new AppError("Il reste des mentions [À COMPLÉTER] dans le texte.");
  const seoId = await upsertSeo(page.seoId, f);
  await db.page.update({ where: { id }, data: { title: str(f, "title") || page.title, content, status, seoId, needsLegalReview: page.needsLegalReview && !legalReviewed } });
  await audit({ actorId: user.id, action: "page.update", entityType: "Page", entityId: id, changes: { status, legalReviewed } });
  return { message: "Page enregistrée", revalidate: ["/admin/pages", `/${page.slug}`, "/"] };
});

// ─────────── Paramètres ───────────
export const saveBusinessSettingsAction = adminAction("settings:write", async (user, f) => {
  const raw = Object.fromEntries(Object.keys(businessSchema.shape).map((k) => [k, str(f, k)]));
  await setSetting("business", businessSchema.parse(raw), user.id);
  await audit({ actorId: user.id, action: "settings.business", entityType: "AppSetting", entityId: "business", changes: raw });
  return { message: "Informations légales enregistrées", revalidate: ["/admin/reglages", "/mentions-legales", "/", "/admin"] };
});

export const saveTaxSettingsAction = adminAction("settings:write", async (user, f) => {
  const v = taxSchema.parse({ vatMode: str(f, "vatMode"), defaultVatRateBps: Number(str(f, "defaultVatRateBps") || 2000) });
  await setSetting("tax", v, user.id);
  await audit({ actorId: user.id, action: "settings.tax", entityType: "AppSetting", entityId: "tax", changes: v });
  return { message: "Fiscalité enregistrée", revalidate: ["/admin/reglages", "/admin", "/"] };
});

export const saveStoreSettingsAction = adminAction("settings:write", async (user, f) => {
  const v = storeSchema.parse({
    currency: "EUR", lowStockThreshold: Number(str(f, "lowStockThreshold") || 3), orderPrefix: str(f, "orderPrefix") || "QSD", invoicePrefix: str(f, "invoicePrefix") || "F",
    returnWindowDays: Number(str(f, "returnWindowDays") || 14), allowGuestCheckout: bool(f, "allowGuestCheckout"), abandonedCartEnabled: bool(f, "abandonedCartEnabled"),
    abandonedCartDelayHours: Number(str(f, "abandonedCartDelayHours") || 24), termsVersion: str(f, "termsVersion") || "brouillon", maintenanceBanner: str(f, "maintenanceBanner"),
  });
  await setSetting("store", v, user.id);
  await audit({ actorId: user.id, action: "settings.store", entityType: "AppSetting", entityId: "store", changes: v });
  return { message: "Paramètres boutique enregistrés", revalidate: ["/admin/reglages", "/"] };
});

// ─────────── Administrateurs et rôles ───────────
const STAFF_KEYS = Object.keys(ROLES).filter((k) => k !== "CUSTOMER");

export const grantRoleAction = adminAction("user:write", async (user, f) => {
  const email = str(f, "email").toLowerCase();
  const roleKey = str(f, "role");
  if (!STAFF_KEYS.includes(roleKey)) throw new AppError("Rôle invalide");
  const target = await db.user.findFirst({ where: { email, deletedAt: null } });
  if (!target) throw new AppError("Aucun compte avec cet e-mail : la personne doit d'abord créer son compte et vérifier son e-mail.");
  if (!target.emailVerified) throw new AppError("L'adresse e-mail de ce compte n'est pas vérifiée.");
  const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
  await db.userRole.upsert({ where: { userId_roleId: { userId: target.id, roleId: role.id } }, create: { userId: target.id, roleId: role.id }, update: {} });
  await audit({ actorId: user.id, action: "user.role.grant", entityType: "User", entityId: target.id, changes: { role: roleKey } });
  return { message: `Rôle ${role.name} attribué à ${email}`, revalidate: ["/admin/utilisateurs"] };
});

export const revokeRoleAction = adminAction("user:write", async (user, f) => {
  const userId = str(f, "userId");
  const roleKey = str(f, "role");
  if (userId === user.id && roleKey === "SUPER_ADMIN") throw new AppError("Vous ne pouvez pas retirer votre propre rôle de super administrateur.");
  const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
  if (roleKey === "SUPER_ADMIN") {
    const count = await db.userRole.count({ where: { roleId: role.id } });
    if (count <= 1) throw new AppError("Il doit rester au moins un super administrateur.");
  }
  await db.userRole.deleteMany({ where: { userId, roleId: role.id } });
  await db.session.deleteMany({ where: { userId } });
  await audit({ actorId: user.id, action: "user.role.revoke", entityType: "User", entityId: userId, changes: { role: roleKey } });
  return { message: "Rôle retiré", revalidate: ["/admin/utilisateurs"] };
});

export const saveRolePermissionsAction = adminAction("user:write", async (user, f) => {
  const key = str(f, "role");
  if (key === "SUPER_ADMIN" || key === "CUSTOMER") throw new AppError("Ce rôle n'est pas modifiable.");
  const role = await db.role.findUniqueOrThrow({ where: { key } });
  const perms = f.getAll("permissions").map(String) as PermissionKey[];
  const rows = await db.permission.findMany({ where: { key: { in: perms } } });
  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId: role.id } }),
    db.rolePermission.createMany({ data: rows.map((p) => ({ roleId: role.id, permissionId: p.id })) }),
  ]);
  await audit({ actorId: user.id, action: "role.permissions", entityType: "Role", entityId: role.id, changes: { permissions: perms } });
  return { message: "Permissions enregistrées", revalidate: ["/admin/roles"] };
});
