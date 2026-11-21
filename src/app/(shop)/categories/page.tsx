import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { db } from "@/lib/db";
import { publicProductWhere } from "@/modules/catalog/repository";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Catégories", description: "Toutes les catégories de produits QuickShipDeals.", alternates: { canonical: "/categories" } };
export const revalidate = 300;

export default async function Page() {
  const cats = await db.category.findMany({
    where: { isVisible: true, parentId: null },
    orderBy: { position: "asc" },
    include: { children: { where: { isVisible: true }, orderBy: { position: "asc" } }, _count: { select: { primaryProducts: { where: publicProductWhere() } } } },
  });
  return (
    <>
      <PageHeader eyebrow="Explorer" title="Catégories" />
      <div className="container-page mt-10">
        {cats.length === 0 ? (
          <EmptyState icon={<Layers className="size-7" aria-hidden />} title="Les catégories arrivent bientôt" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-6 shadow-card">
                <Link href={`/categorie/${c.slug}`} className="text-lg font-bold text-night-900 hover:text-electric-500">{c.name}</Link>
                <p className="text-xs text-muted">{c._count.primaryProducts} produit(s)</p>
                {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                {c.children.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.children.map((s) => <li key={s.id}><Link href={`/categorie/${s.slug}`} className="rounded-full bg-surface px-3 py-1 text-xs font-medium hover:bg-electric-100">{s.name}</Link></li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
