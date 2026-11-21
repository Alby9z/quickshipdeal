import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, ImageOff, ShieldCheck, Star, Truck } from "lucide-react";
import { getApprovedReviews, getProductBySlug, getRelatedProducts } from "@/modules/catalog/repository";
import { getCurrentUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getSetting } from "@/modules/settings/service";
import { Badge } from "@/components/ui/misc";
import { AVAILABILITY_LABELS, ProductGrid } from "@/components/shop/product-card";
import { ProductPurchase } from "@/components/shop/product-purchase";
import { Markdown } from "@/components/shop/markdown";
import { TrackView } from "@/components/shop/recently-viewed";
import { JsonLd, breadcrumbJsonLd } from "@/modules/seo/jsonld";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Produit introuvable" };
  const img = p.images[0];
  return {
    title: p.seo?.title ?? p.name,
    description: p.seo?.description ?? p.shortDescription ?? undefined,
    alternates: { canonical: `/produit/${p.slug}` },
    robots: p.seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: { title: p.name, description: p.shortDescription ?? undefined, images: img ? [{ url: img.url, alt: img.alt }] : undefined, type: "website" },
    twitter: { card: img ? "summary_large_image" : "summary" },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const [reviews, related, user, tax] = await Promise.all([getApprovedReviews(p.id), getRelatedProducts(p.id, p.primaryCategoryId), getCurrentUser(), getSetting("tax")]);
  const inWishlist = user ? Boolean(await db.wishlistItem.findFirst({ where: { productId: p.id, wishlist: { userId: user.id } } })) : false;
  const avail = AVAILABILITY_LABELS[p.availability];
  const purchasable = p.availability !== "OUT_OF_STOCK" && p.availability !== "DISCONTINUED";
  const lead = p.leadTimeMinDays != null ? `${p.leadTimeMinDays}${p.leadTimeMaxDays && p.leadTimeMaxDays !== p.leadTimeMinDays ? `–${p.leadTimeMaxDays}` : ""} jours ouvrés` : null;

  const crumbs = [
    { name: "Accueil", path: "/" },
    ...(p.primaryCategory?.parent ? [{ name: p.primaryCategory.parent.name, path: `/categorie/${p.primaryCategory.parent.slug}` }] : []),
    ...(p.primaryCategory ? [{ name: p.primaryCategory.name, path: `/categorie/${p.primaryCategory.slug}` }] : []),
    { name: p.name, path: `/produit/${p.slug}` },
  ];
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.shortDescription ?? undefined,
    image: p.images.map((i) => i.url),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}/produit/${p.slug}`,
      priceCurrency: p.currency,
      price: (p.price.unitCents / 100).toFixed(2),
      availability: purchasable ? (p.availability === "ON_ORDER" ? "https://schema.org/BackOrder" : "https://schema.org/InStock") : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(p.saleEndsAt && p.price.onSale ? { priceValidUntil: p.saleEndsAt.toISOString().slice(0, 10) } : {}),
    },
    ...(p.ratingCount > 0 && p.ratingAverage ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAverage.toFixed(1), reviewCount: p.ratingCount } } : {}),
  };

  return (
    <>
      <JsonLd data={[productLd, breadcrumbJsonLd(crumbs)]} />
      <TrackView productId={p.id} slug={p.slug} name={p.name} />
      <nav aria-label="Fil d'Ariane" className="container-page mt-6 flex flex-wrap items-center gap-1 text-xs text-muted">
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-night-900">{c.name}</Link> : <span aria-current="page" className="text-night-900">{c.name}</span>}
          </span>
        ))}
      </nav>

      <div className="container-page mt-6 grid gap-10 lg:grid-cols-2">
        <section aria-label="Images du produit">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-surface">
            {p.images[0] ? <Image src={p.images[0].url} alt={p.images[0].alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /> : <div className="grid size-full place-items-center text-muted"><ImageOff /></div>}
          </div>
          {p.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {p.images.slice(1, 11).map((img) => (
                <li key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-line"><Image src={img.url} alt={img.alt} fill sizes="120px" className="object-cover" loading="lazy" /></li>
              ))}
            </ul>
          )}
          {p.videoUrls.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">{p.videoUrls.map((v) => <li key={v}><a href={v} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-500 underline">Voir la vidéo du produit</a></li>)}</ul>
          )}
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-2">
            {p.primaryCategory && <Link href={`/categorie/${p.primaryCategory.slug}`} className="text-xs font-semibold uppercase tracking-wider text-electric-500">{p.primaryCategory.name}</Link>}
            <span className="font-mono text-xs text-muted">Réf. {p.sku}</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{p.name}</h1>
          {p.ratingCount > 0 && p.ratingAverage != null && (
            <a href="#avis" className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <Star className="size-4 fill-orange-500 text-orange-500" aria-hidden /> <strong>{p.ratingAverage.toFixed(1)}</strong> <span className="text-muted">· {p.ratingCount} avis vérifiés</span>
            </a>
          )}
          {p.shortDescription && <p className="mt-4 text-muted">{p.shortDescription}</p>}

          <div className="mt-6 rounded-2xl border border-line bg-surface/60 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-3xl font-extrabold text-night-900">{formatEuros(p.price.unitCents)}</p>
              {p.price.compareAtCents && (
                <>
                  <p className="pb-1 text-muted line-through">{formatEuros(p.price.compareAtCents)}</p>
                  <Badge tone="orange" className="mb-1.5 bg-orange-500 text-white ring-0">−{p.price.discountPercent} %</Badge>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              {tax.vatMode === "FRANCHISE" ? "TVA non applicable, art. 293 B du CGI" : tax.vatMode === "STANDARD" ? "Prix TTC" : "Prix"} · frais de livraison calculés au panier
              {p.price.onSale && p.saleEndsAt ? ` · offre valable jusqu'au ${formatDate(p.saleEndsAt)}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <Badge tone={avail.tone}>{avail.label}</Badge>
              {lead && <span className="flex items-center gap-1.5 text-muted"><Clock className="size-4" aria-hidden /> Livraison estimée : {lead}</span>}
            </div>
            <div className="mt-5">
              <ProductPurchase
                productId={p.id}
                basePriceCents={p.price.unitCents}
                available={purchasable}
                inWishlist={inWishlist}
                variants={p.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents, available: v.availability !== "OUT_OF_STOCK" && v.availability !== "DISCONTINUED" }))}
              />
            </div>
          </div>
          <ul className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-electric-500" aria-hidden /> Paiement sécurisé Stripe</li>
            <li className="flex items-center gap-2"><Truck className="size-4 text-electric-500" aria-hidden /> Numéro de suivi à l&apos;expédition</li>
          </ul>
        </section>
      </div>

      <div className="container-page mt-14 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="text-2xl font-extrabold">Description</h2>
          <div className="mt-4">{p.description ? <Markdown>{p.description}</Markdown> : <p className="text-muted">Description à venir.</p>}</div>
        </section>
        <aside className="h-fit rounded-2xl border border-line p-5">
          <h2 className="text-lg font-bold">Caractéristiques</h2>
          <dl className="mt-3 divide-y divide-line text-sm">
            {[
              ["Référence", p.sku],
              ["Marque", p.brand],
              ["Poids", p.weightGrams ? `${(p.weightGrams / 1000).toLocaleString("fr-FR")} kg` : null],
              ["Dimensions", p.lengthMm && p.widthMm && p.heightMm ? `${p.lengthMm / 10} × ${p.widthMm / 10} × ${p.heightMm / 10} cm` : null],
              ["Pays d'origine", p.originCountry],
              ["Expédié depuis", p.supplier?.shipsFromCountry],
              ["Responsable UE", p.euResponsiblePerson],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-night-900">{v}</dd></div>
              ))}
          </dl>
          {p.safetyInformation && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Informations de sécurité</p><p className="mt-1 whitespace-pre-line">{p.safetyInformation}</p></div>
          )}
        </aside>
      </div>

      <section id="avis" className="container-page mt-14">
        <h2 className="text-2xl font-extrabold">Avis clients</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun avis pour le moment. Seuls les clients ayant reçu ce produit peuvent laisser un avis.</p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line p-5">
                <div className="flex items-center gap-1" aria-label={`${r.rating} sur 5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < r.rating ? "fill-orange-500 text-orange-500" : "text-line"}`} aria-hidden />)}</div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 text-sm text-ink">{r.body}</p>
                <p className="mt-2 text-xs text-muted">{r.user.name.split(" ")[0]} · achat vérifié · {formatDate(r.createdAt)}</p>
                {r.adminReply && <p className="mt-3 rounded-xl bg-surface p-3 text-xs"><strong>Réponse de QuickShipDeals :</strong> {r.adminReply}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {related.associated.length > 0 && (
        <section className="container-page mt-14"><h2 className="mb-5 text-2xl font-extrabold">Produits associés</h2><ProductGrid products={related.associated} /></section>
      )}
      {related.similar.length > 0 && (
        <section className="container-page mt-14"><h2 className="mb-5 text-2xl font-extrabold">Produits similaires</h2><ProductGrid products={related.similar} /></section>
      )}
    </>
  );
}
