import type { Metadata } from "next";
import { headers } from "next/headers";
import { findOrderForGuest } from "@/modules/orders/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { OrderDetail } from "@/components/shop/order-detail";
import { Alert, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/form";

export const metadata: Metadata = { title: "Suivi de commande", description: "Suivez votre commande QuickShipDeals avec votre numéro de commande et votre e-mail." };
export const dynamic = "force-dynamic";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ commande?: string; email?: string; cle?: string }> }) {
  const sp = await searchParams;
  let order = null;
  let error: string | null = null;
  if (sp.commande && (sp.email || sp.cle)) {
    const ip = clientIp(await headers());
    if (!(await rateLimit(`track:${ip}`, 20, 600)).ok) error = "Trop de tentatives. Réessayez dans quelques minutes.";
    else {
      order = await findOrderForGuest(sp.commande, { email: sp.email, token: sp.cle });
      if (!order) error = "Aucune commande ne correspond à ces informations.";
    }
  }
  return (
    <>
      <PageHeader eyebrow="Livraison" title="Suivi de commande" description="Saisissez votre numéro de commande et l'adresse e-mail utilisée lors de l'achat." />
      <div className="container-page mt-10 max-w-4xl">
        {!order && (
          <form className="grid gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Numéro de commande" htmlFor="commande"><Input id="commande" name="commande" placeholder="QSD-2026-000001" defaultValue={sp.commande} required /></Field>
            <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" defaultValue={sp.email} required /></Field>
            <Button type="submit" variant="night">Rechercher</Button>
          </form>
        )}
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        {order && <OrderDetail order={order} invoiceBase={`/facture/${order.number}/${order.guestAccessToken}`} />}
      </div>
    </>
  );
}
