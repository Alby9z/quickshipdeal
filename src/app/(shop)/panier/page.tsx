import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { getCartView } from "@/modules/cart/service";
import { formatEuros } from "@/lib/money";
import { Alert, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CartLineControls } from "@/components/shop/cart-line-controls";
import { CouponForm } from "@/components/shop/coupon-form";
import { TotalsTable } from "@/components/shop/order-summary";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  const [cart, sp] = await Promise.all([getCartView(), searchParams]);
  return (
    <div className="container-page mt-10">
      <h1 className="text-3xl font-extrabold">Votre panier</h1>
      {sp.paiement === "annule" && <Alert tone="info" className="mt-4">Le paiement a été annulé. Votre panier est conservé.</Alert>}
      {cart.lines.length === 0 ? (
        <div className="mt-8"><EmptyState icon={<ShoppingBag className="size-7" />} title="Votre panier est vide" action={<Button asChild><Link href="/boutique">Découvrir la boutique</Link></Button>} /></div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <section aria-label="Articles">
            {cart.warnings.map((w) => <Alert key={w} tone="warning" className="mb-3">{w}</Alert>)}
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex gap-4 p-4">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface">{l.image && <Image src={l.image.url} alt={l.image.alt} fill sizes="96px" className="object-cover" />}</div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/produit/${l.slug}`} className="font-semibold text-night-900 hover:text-electric-500">{l.name}</Link>
                    {l.variantName && <p className="text-xs text-muted">{l.variantName}</p>}
                    <p className="font-mono text-xs text-muted">Réf. {l.sku}</p>
                    {l.leadTime && <p className="text-xs text-muted">Livraison estimée : {l.leadTime.min}–{l.leadTime.max} jours ouvrés</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                      <CartLineControls itemId={l.id} quantity={l.quantity} />
                      <div className="text-right">
                        <p className="font-bold">{formatEuros(l.unitCents * l.quantity)}</p>
                        <p className="text-xs text-muted">{formatEuros(l.unitCents)} / unité{l.compareAtCents ? <span className="ml-1 line-through">{formatEuros(l.compareAtCents)}</span> : null}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <aside className="h-fit space-y-5 rounded-2xl border border-line bg-white p-6 shadow-card lg:sticky lg:top-36">
            <h2 className="text-lg font-bold">Récapitulatif</h2>
            <CouponForm current={cart.couponCode} error={cart.couponError} />
            <TotalsTable t={cart.totals} vatMode={cart.vatMode} />
            {cart.shippingRate ? <p className="text-xs text-muted">Livraison estimée selon « {cart.shippingRate.name} ». Le mode de livraison se choisit à l&apos;étape suivante.</p> : <p className="text-xs text-amber-700">Aucun mode de livraison n&apos;est encore configuré.</p>}
            <Button asChild size="lg" className="w-full" aria-disabled={cart.purchasable.length === 0}>
              <Link href="/commande">Passer commande <ArrowRight /></Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
