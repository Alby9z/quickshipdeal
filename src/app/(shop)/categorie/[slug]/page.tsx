import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CatalogView, type SearchParams } from "@/components/shop/catalog-view";
import { PageHeader } from "@/components/ui/misc";
import { JsonLd, breadcrumbJsonLd } from "@/modules/seo/jsonld";

async function load(slug: string) {
  return db.category.findFirst({ where: { slug, isVisible: true }, include: { seo: true, parent: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return {
    title: c.seo?.title ?? c.name,
    description: c.seo?.description ?? c.description ?? `Produits de la catégorie ${c.name} sur QuickShipDeals.`,
    alternates: { canonical: `/categorie/${c.slug}` },
    robots: c.seo?.noIndex ? { index: false } : undefined,
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const crumbs = [{ name: "Accueil", path: "/" }, { name: "Catégories", path: "/categories" }, ...(c.parent ? [{ name: c.parent.name, path: `/categorie/${c.parent.slug}` }] : []), { name: c.name, path: `/categorie/${c.slug}` }];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageHeader eyebrow={c.parent?.name ?? "Catégorie"} title={c.name} description={c.description} />
      <CatalogView basePath={`/categorie/${c.slug}`} searchParams={await searchParams} defaults={{ category: c.slug }} hideCategoryFilter />
    </>
  );
}
