import type { Metadata } from "next";
import { CatalogView, type SearchParams } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Promotions", description: "Les offres en cours sur QuickShipDeals.", alternates: { canonical: "/promotions" } };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <PageHeader eyebrow="Offres" title="Promotions en cours" description="Uniquement des réductions réelles et datées." />
      <CatalogView basePath="/promotions" searchParams={await searchParams} defaults={{ onSale: true }} />
    </>
  );
}
