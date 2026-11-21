import type { Prisma, AvailabilityStatus } from "@prisma/client";
import { cache } from "react";
import { db } from "@/lib/db";
import { effectivePrice, type EffectivePrice } from "@/modules/pricing/pricing";

const now = () => new Date();

/** Un produit n'est visible publiquement que publié, non supprimé, et dont la date de publication est passée. */
export const publicProductWhere = (): Prisma.ProductWhereInput => ({
  status: "PUBLISHED",
  deletedAt: null,
  OR: [{ publishedAt: null }, { publishedAt: { lte: now() } }],
});

export const productCardInclude = {
  images: { orderBy: { position: "asc" }, take: 1 },
  primaryCategory: { select: { name: true, slug: true } },
  promotions: { include: { promotion: true } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: { name: string; slug: string } | null;
  image: { url: string; alt: string } | null;
  price: EffectivePrice;
  availability: AvailabilityStatus;
  ratingAverage: number | null;
  ratingCount: number;
  isNew: boolean;
};

export function toCard(p: CardRow): ProductCardData {
  const img = p.images[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    category: p.primaryCategory,
    image: img ? { url: img.url, alt: img.alt } : null,
    price: effectivePrice({ ...p, promotions: p.promotions.map((x) => x.promotion) }),
    availability: p.availability,
    ratingAverage: p.ratingCount > 0 ? p.ratingAverage : null,
    ratingCount: p.ratingCount,
    isNew: p.publishedAt ? Date.now() - p.publishedAt.getTime() < 30 * 24 * 3600 * 1000 : false,
  };
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  minPrice?: number; // centimes
  maxPrice?: number;
  available?: boolean;
  onSale?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "popular" | "relevance";
  page?: number;
  perPage?: number;
};

export async function listProducts(query: CatalogQuery) {
  const perPage = Math.min(48, Math.max(1, query.perPage ?? 24));
  const page = Math.max(1, query.page ?? 1);
  const and: Prisma.ProductWhereInput[] = [publicProductWhere()];

  if (query.q && query.q.trim()) {
    const q = query.q.trim().slice(0, 100);
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { equals: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
      ],
    });
  }
  if (query.category) {
    const cat = await db.category.findUnique({ where: { slug: query.category }, select: { id: true, children: { select: { id: true } } } });
    const ids = cat ? [cat.id, ...cat.children.map((c) => c.id)] : ["__none__"];
    and.push({ OR: [{ primaryCategoryId: { in: ids } }, { categories: { some: { categoryId: { in: ids } } } }] });
  }
  if (query.minPrice != null) and.push({ priceCents: { gte: query.minPrice } });
  if (query.maxPrice != null) and.push({ priceCents: { lte: query.maxPrice } });
  if (query.available) and.push({ availability: { in: ["IN_STOCK", "LOW_STOCK", "ON_ORDER"] } });
  if (query.onSale) {
    const t = now();
    and.push({
      OR: [
        { salePriceCents: { not: null }, AND: [{ OR: [{ saleStartsAt: null }, { saleStartsAt: { lte: t } }] }, { OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: t } }] }] },
        { promotions: { some: { promotion: { isActive: true, startsAt: { lte: t }, OR: [{ endsAt: null }, { endsAt: { gt: t } }] } } } },
      ],
    });
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "price_asc"
      ? [{ priceCents: "asc" }]
      : query.sort === "price_desc"
        ? [{ priceCents: "desc" }]
        : query.sort === "popular"
          ? [{ salesCount: "desc" }, { publishedAt: "desc" }]
          : [{ publishedAt: "desc" }, { createdAt: "desc" }];

  const where = { AND: and };
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, include: productCardInclude, orderBy, skip: (page - 1) * perPage, take: perPage }),
    db.product.count({ where }),
  ]);
  return { items: rows.map(toCard), total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export const getProductBySlug = cache(async (slug: string) => {
  const p = await db.product.findFirst({
    where: { slug, ...publicProductWhere() },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { inventory: true } },
      primaryCategory: { include: { parent: true } },
      categories: { include: { category: true } },
      promotions: { include: { promotion: true } },
      inventory: true,
      seo: true,
      supplier: { select: { processingDaysMin: true, processingDaysMax: true, shippingDaysMin: true, shippingDaysMax: true, shipsFromCountry: true } },
    },
  });
  if (!p) return null;
  return { ...p, price: effectivePrice({ ...p, promotions: p.promotions.map((x) => x.promotion) }) };
});

export async function getApprovedReviews(productId: string, take = 20) {
  return db.review.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, rating: true, title: true, body: true, createdAt: true, adminReply: true, user: { select: { name: true } } },
  });
}

/** Produits similaires : même catégorie principale. Produits associés : liens définis par l'admin. */
export async function getRelatedProducts(productId: string, categoryId: string | null, take = 4) {
  const linked = await db.relatedProduct.findMany({
    where: { fromId: productId, to: publicProductWhere() },
    include: { to: { include: productCardInclude } },
    take,
  });
  const similar = categoryId
    ? await db.product.findMany({
        where: { AND: [publicProductWhere(), { primaryCategoryId: categoryId, id: { not: productId } }] },
        include: productCardInclude,
        orderBy: { salesCount: "desc" },
        take,
      })
    : [];
  return { associated: linked.map((l) => toCard(l.to)), similar: similar.map(toCard) };
}

export async function homeSections() {
  const base = { where: publicProductWhere(), include: productCardInclude, take: 8 } as const;
  const [latest, popular, onSale, categories, count] = await Promise.all([
    db.product.findMany({ ...base, orderBy: { publishedAt: "desc" } }),
    db.product.findMany({ ...base, where: { AND: [publicProductWhere(), { salesCount: { gt: 0 } }] }, orderBy: { salesCount: "desc" } }),
    listProducts({ onSale: true, perPage: 8 }),
    db.category.findMany({ where: { isVisible: true, parentId: null }, orderBy: { position: "asc" }, take: 8, include: { _count: { select: { primaryProducts: { where: publicProductWhere() } } } } }),
    db.product.count({ where: publicProductWhere() }),
  ]);
  return { latest: latest.map(toCard), popular: popular.map(toCard), onSale: onSale.items, categories, count };
}

export const getNavCategories = cache(async () =>
  db.category.findMany({
    where: { isVisible: true, parentId: null },
    orderBy: { position: "asc" },
    select: { id: true, name: true, slug: true, children: { where: { isVisible: true }, orderBy: { position: "asc" }, select: { name: true, slug: true } } },
  }),
);
