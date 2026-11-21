import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { publicProductWhere } from "@/modules/catalog/repository";
import { publicPostWhere } from "@/modules/blog/queries";

// Généré à la demande (pas au build) : le build ne dépend pas de la base.
export const dynamic = "force-dynamic";

const PAGE_PATHS: Record<string, string> = { about: "/a-propos", faq: "/faq", shipping: "/politique-de-livraison", returns: "/politique-de-retour", terms: "/cgv", privacy: "/confidentialite", cookies: "/cookies" };

/** Sitemap dynamique : uniquement les contenus publiés et indexables. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories, posts, pages] = await Promise.all([
    db.product.findMany({ where: { ...publicProductWhere(), OR: [{ seo: null }, { seo: { noIndex: false } }] }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isVisible: true }, select: { slug: true, updatedAt: true } }),
    db.blogPost.findMany({ where: publicPostWhere(), select: { slug: true, updatedAt: true } }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { key: true, updatedAt: true } }),
  ]);
  const statics = ["", "/boutique", "/categories", "/nouveautes", "/meilleures-ventes", "/promotions", "/livraison", "/retours", "/contact", "/blog", "/mentions-legales", "/suivi-commande"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${base}/categorie/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/produit/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 })),
    ...pages.filter((p) => PAGE_PATHS[p.key]).map((p) => ({ url: `${base}${PAGE_PATHS[p.key]}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
