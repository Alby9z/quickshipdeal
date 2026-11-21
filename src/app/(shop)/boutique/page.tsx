import type { Metadata } from "next";
import { CatalogView, type SearchParams } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Boutique", description: "Tous les produits QuickShipDeals : filtres par catégorie, prix et disponibilité.", alternates: { canonical: "/boutique" } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="La boutique" description="Tous nos produits, mis à jour en temps réel." />
      <CatalogView basePath="/boutique" searchParams={await searchParams} />
    </>
  );
}
