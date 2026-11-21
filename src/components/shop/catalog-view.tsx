import Link from "next/link";
import { PackageSearch, SlidersHorizontal } from "lucide-react";
import { listProducts, type CatalogQuery } from "@/modules/catalog/repository";
import { db } from "@/lib/db";
import { ProductGrid } from "./product-card";
import { EmptyState } from "@/components/ui/misc";
import { clampInt } from "@/lib/utils";
import { parseEuros } from "@/lib/money";

export type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
function euros(v: string | undefined) {
  if (!v) return undefined;
  try {
    return parseEuros(v);
  } catch {
    return undefined;
  }
}

export function parseCatalogParams(sp: SearchParams, defaults: Partial<CatalogQuery> = {}): CatalogQuery {
  const sort = one(sp.tri);
  return {
    ...defaults,
    q: one(sp.q) ?? defaults.q,
    category: one(sp.categorie) ?? defaults.category,
    minPrice: euros(one(sp.min)),
    maxPrice: euros(one(sp.max)),
    available: one(sp.dispo) === "1" || undefined,
    onSale: defaults.onSale || one(sp.promo) === "1" || undefined,
    sort: (["newest", "price_asc", "price_desc", "popular"] as const).find((s) => s === sort) ?? defaults.sort ?? "newest",
    page: clampInt(one(sp.page), 1, 500, 1),
    perPage: 24,
  };
}

function qs(sp: SearchParams, patch: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) { const x = one(v); if (x) u.set(k, x); }
  for (const [k, v] of Object.entries(patch)) { if (v) u.set(k, v); else u.delete(k); }
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Catalogue filtrable : filtres et tri en paramètres d'URL (indexables, partageables, sans JS). */
export async function CatalogView({ basePath, searchParams, defaults = {}, hideCategoryFilter = false }: { basePath: string; searchParams: SearchParams; defaults?: Partial<CatalogQuery>; hideCategoryFilter?: boolean }) {
  const query = parseCatalogParams(searchParams, defaults);
  const [result, categories] = await Promise.all([
    listProducts(query),
    hideCategoryFilter ? Promise.resolve([]) : db.category.findMany({ where: { isVisible: true }, orderBy: [{ parentId: "asc" }, { position: "asc" }], select: { name: true, slug: true } }),
  ]);
  return (
    <div className="container-page mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside>
        <form action={basePath} className="sticky top-36 space-y-5 rounded-2xl border border-line bg-white p-5 shadow-card">
          <p className="flex items-center gap-2 font-bold text-night-900"><SlidersHorizontal className="size-4" aria-hidden /> Filtres</p>
          {query.q && <input type="hidden" name="q" value={query.q} />}
          {!hideCategoryFilter && categories.length > 0 && (
            <div>
              <label htmlFor="f-cat" className="mb-1.5 block text-sm font-medium">Catégorie</label>
              <select id="f-cat" name="categorie" defaultValue={query.category ?? ""} className="h-10 w-full rounded-xl border border-line px-3 text-sm">
                <option value="">Toutes</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          )}
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Prix (€)</legend>
            <div className="flex items-center gap-2">
              <input name="min" inputMode="decimal" placeholder="Min" defaultValue={one(searchParams.min)} aria-label="Prix minimum" className="h-10 w-full rounded-xl border border-line px-3 text-sm" />
              <span className="text-muted">–</span>
              <input name="max" inputMode="decimal" placeholder="Max" defaultValue={one(searchParams.max)} aria-label="Prix maximum" className="h-10 w-full rounded-xl border border-line px-3 text-sm" />
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="dispo" value="1" defaultChecked={query.available} className="accent-orange-500" /> Disponible uniquement</label>
          {!defaults.onSale && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="promo" value="1" defaultChecked={query.onSale} className="accent-orange-500" /> En promotion</label>}
          <div>
            <label htmlFor="f-sort" className="mb-1.5 block text-sm font-medium">Trier par</label>
            <select id="f-sort" name="tri" defaultValue={query.sort} className="h-10 w-full rounded-xl border border-line px-3 text-sm">
              <option value="newest">Nouveautés</option>
              <option value="popular">Popularité (ventes)</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="h-10 flex-1 rounded-xl bg-night-900 text-sm font-semibold text-white hover:bg-night-800">Appliquer</button>
            <Link href={basePath} className="grid h-10 place-items-center rounded-xl border border-line px-3 text-sm">Réinitialiser</Link>
          </div>
        </form>
      </aside>
      <div>
        <p className="mb-4 text-sm text-muted" aria-live="polite">{result.total} produit{result.total > 1 ? "s" : ""}</p>
        {result.items.length === 0 ? (
          <EmptyState icon={<PackageSearch className="size-7" aria-hidden />} title={result.total === 0 && !query.q && !query.category ? "Catalogue en préparation" : "Aucun produit ne correspond"}>
            {result.total === 0 && !query.q && !query.category ? "Les premiers produits arrivent bientôt." : "Essayez d'élargir vos filtres ou votre recherche."}
          </EmptyState>
        ) : (
          <>
            <ProductGrid products={result.items} />
            {result.pages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                {result.page > 1 && <Link rel="prev" href={`${basePath}${qs(searchParams, { page: String(result.page - 1) })}`} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-surface">Précédent</Link>}
                <span className="px-3 text-sm text-muted">Page {result.page} / {result.pages}</span>
                {result.page < result.pages && <Link rel="next" href={`${basePath}${qs(searchParams, { page: String(result.page + 1) })}`} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">Voir plus</Link>}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
