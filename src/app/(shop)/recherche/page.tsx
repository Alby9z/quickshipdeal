import type { Metadata } from "next";
import { CatalogView, type SearchParams } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/ui/misc";
import { InstantSearch } from "@/components/shop/instant-search";

export const metadata: Metadata = { title: "Recherche", robots: { index: false, follow: true } };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return (
    <>
      <PageHeader eyebrow="Recherche" title={q ? `Résultats pour « ${q} »` : "Rechercher un produit"}>
        <div className="mt-6 max-w-xl"><InstantSearch initial={q} /></div>
      </PageHeader>
      <CatalogView basePath="/recherche" searchParams={sp} />
    </>
  );
}
