import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCartView } from "@/modules/cart/service";
import { getCurrentUser } from "@/modules/auth/session";
import { getSetting } from "@/modules/settings/service";
import { integrationStatus } from "@/lib/env";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/money";
import { Alert } from "@/components/ui/misc";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { TotalsTable } from "@/components/shop/order-summary";
import { CouponForm } from "@/components/shop/coupon-form";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, store] = await Promise.all([getCurrentUser(), getSetting("store")]);
  const cart = await getCartView({ email: user?.email });
  if (cart.purchasable.length === 0) redirect("/panier");
  if (!user && !store.allowGuestCheckout) redirect("/connexion?next=/commande");

  const address = user ? await db.address.findFirst({ where: { userId: user.id, deletedAt: null }, orderBy: [{ isDefaultShipping: "desc" }, { updatedAt: "desc" }] }) : null;
  const allRates = await db.shippingRate.findMany({ where: { isActive: true }, orderBy: [{ position: "asc" }, { priceCents: "asc" }] });
  const stripeReady = integrationStatus().stripe;

  return (
    <div className="container-page mt-10">
      <h1 className="text-3xl font-extrabold">Finaliser ma commande</h1>
      {!user && <p className="mt-2 text-sm text-muted">Vous avez un compte ? <Link href="/connexion?next=/commande" className="font-semibold text-electric-500">Connectez-vous</Link> pour retrouver vos adresses. Sinon, continuez en invité.</p>}
      {!stripeReady && <Alert tone="warning" title="Paiement en ligne non activé" className="mt-4">La boutique n&apos;accepte pas encore de paiement : la configuration Stripe est en cours. Aucune commande ne peut être validée pour le moment.</Alert>}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm
          rates={allRates.map((r) => ({ id: r.id, name: r.name, priceCents: r.priceCents, freeAboveCents: r.freeAboveCents, minDays: r.minDays, maxDays: r.maxDays }))}
          subtotalAfterDiscount={cart.totals.subtotalCents - cart.totals.discountCents}
          freeShippingCoupon={cart.coupon?.type === "FREE_SHIPPING"}
          defaults={{
            email: user?.email ?? "",
            shipping: address ? { firstName: address.firstName, lastName: address.lastName, company: address.company ?? "", line1: address.line1, line2: address.line2 ?? "", postalCode: address.postalCode, city: address.city, country: address.country as "FR", phone: address.phone ?? "" } : undefined,
          }}
        />
        <aside className="h-fit space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card lg:sticky lg:top-36">
          <h2 className="text-lg font-bold">Votre commande</h2>
          <ul className="space-y-2 text-sm">
            {cart.purchasable.map((l) => (
              <li key={l.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{l.name}{l.variantName ? ` (${l.variantName})` : ""} × {l.purchasableQty}</span><span className="shrink-0">{formatEuros(l.unitCents * l.purchasableQty)}</span></li>
            ))}
          </ul>
          <CouponForm current={cart.couponCode} error={cart.couponError} />
          <TotalsTable t={cart.totals} vatMode={cart.vatMode} />
          <p className="text-xs text-muted">Le montant définitif, livraison comprise, est recalculé par nos serveurs et affiché sur la page de paiement.</p>
        </aside>
      </div>
    </div>
  );
}
