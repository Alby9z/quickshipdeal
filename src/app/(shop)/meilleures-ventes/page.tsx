import type { Metadata } from "next";
import { CatalogView, type SearchParams } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Meilleures ventes", description: "Les produits les plus commandés sur QuickShipDeals.", alternates: { canonical: "/meilleures-ventes" } };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader eyebrow="Popularité" title="Meilleures ventes" description="Classement calculé à partir des ventes réellement payées." />
      <CatalogView basePath="/meilleures-ventes" searchParams={await searchParams} defaults={{ sort: "popular" }} />
    </>
  );
}
