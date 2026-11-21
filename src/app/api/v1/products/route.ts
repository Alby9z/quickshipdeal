import { NextResponse } from "next/server";
import { guardApi } from "@/lib/api-auth";
import { listProducts } from "@/modules/catalog/repository";
import { clampInt } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products?page=1&perPage=24&q=&category=
 * Liste des produits publiés (prix en centimes). Auth : Authorization: Bearer <API_V1_TOKEN>.
 */
export async function GET(req: Request) {
  const denied = await guardApi(req);
  if (denied) return denied;
  const u = new URL(req.url);
  const r = await listProducts({ q: u.searchParams.get("q") ?? undefined, category: u.searchParams.get("category") ?? undefined, page: clampInt(u.searchParams.get("page"), 1, 1000, 1), perPage: clampInt(u.searchParams.get("perPage"), 1, 48, 24) });
  return NextResponse.json({
    data: r.items.map((p) => ({ id: p.id, sku: p.sku, slug: p.slug, name: p.name, category: p.category?.slug ?? null, priceCents: p.price.unitCents, compareAtCents: p.price.compareAtCents, availability: p.availability, image: p.image?.url ?? null })),
    meta: { page: r.page, perPage: r.perPage, total: r.total, pages: r.pages },
  });
}
