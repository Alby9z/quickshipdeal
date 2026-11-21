import type { Metadata } from "next";
import { CatalogView, type SearchParams } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Nouveautés", description: "Les derniers produits arrivés sur QuickShipDeals.", alternates: { canonical: "/nouveautes" } };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader eyebrow="Nouveautés" title="Fraîchement arrivés" description="Les derniers produits publiés." />
      <CatalogView basePath="/nouveautes" searchParams={await searchParams} defaults={{ sort: "newest" }} />
    </>
  );
}
