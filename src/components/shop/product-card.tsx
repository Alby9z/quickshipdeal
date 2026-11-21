import Image from "next/image";
import Link from "next/link";
import { ImageOff, Star } from "lucide-react";
import type { ProductCardData } from "@/modules/catalog/repository";
import { formatEuros } from "@/lib/money";
import { Badge } from "@/components/ui/misc";
import { AddToCartButton } from "./add-to-cart-button";

export const AVAILABILITY_LABELS = {
  IN_STOCK: { label: "En stock", tone: "green" },
  LOW_STOCK: { label: "Stock limité", tone: "amber" },
  ON_ORDER: { label: "Sur commande", tone: "electric" },
  OUT_OF_STOCK: { label: "Rupture", tone: "red" },
  DISCONTINUED: { label: "Indisponible", tone: "neutral" },
} as const;

/** Carte produit : toutes les données proviennent de la base (prix, avis, disponibilité). */
export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const avail = AVAILABILITY_LABELS[product.availability];
  const purchasable = product.availability !== "OUT_OF_STOCK" && product.availability !== "DISCONTINUED";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/produit/${product.slug}`} className="relative block aspect-square overflow-hidden bg-surface" aria-label={product.name}>
        {product.image ? (
          <Image src={product.image.url} alt={product.image.alt} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" priority={priority} />
        ) : (
          <div className="grid size-full place-items-center text-muted"><ImageOff aria-hidden /></div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.price.onSale && product.price.discountPercent ? <Badge tone="orange" className="bg-orange-500 text-white ring-0">−{product.price.discountPercent} %</Badge> : null}
          {product.isNew && <Badge tone="night">Nouveau</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{product.category?.name ?? "—"}</span>
          <span className="shrink-0 font-mono">Réf. {product.sku}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-night-900">
          <Link href={`/produit/${product.slug}`} className="hover:text-electric-500">{product.name}</Link>
        </h3>
        {product.ratingAverage != null && (
          <p className="flex items-center gap-1 text-xs text-muted">
            <Star className="size-3.5 fill-orange-500 text-orange-500" aria-hidden />
            <span className="font-semibold text-night-900">{product.ratingAverage.toFixed(1)}</span>
            <span>({product.ratingCount} avis)</span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-lg font-extrabold text-night-900">{formatEuros(product.price.unitCents)}</p>
            {product.price.compareAtCents && <p className="text-xs text-muted line-through">{formatEuros(product.price.compareAtCents)}</p>}
          </div>
          <Badge tone={avail.tone}>{avail.label}</Badge>
        </div>
        <div className="flex gap-2 pt-1">
          <AddToCartButton productId={product.id} disabled={!purchasable} className="flex-1" size="sm" />
          <Link href={`/produit/${product.slug}`} className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-xs font-semibold text-night-900 hover:bg-surface">Voir</Link>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
    </div>
  );
}
