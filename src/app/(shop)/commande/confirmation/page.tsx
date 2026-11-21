import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { findOrderForGuest } from "@/modules/orders/queries";
import { formatEuros } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { AutoRefresh } from "@/components/shop/auto-refresh";

export const metadata: Metadata = { title: "Confirmation de commande", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * La page de retour Stripe n'affirme JAMAIS que le paiement est validé :
 * elle lit l'état en base, mis à jour uniquement par le webhook signé.
 */
export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ commande?: string; cle?: string }> }) {
  const sp = await searchParams;
  const order = sp.commande && sp.cle ? await findOrderForGuest(sp.commande, { token: sp.cle }) : null;
  if (!order) return <div className="container-page mt-16"><Alert tone="error" title="Commande introuvable">Vérifiez le lien reçu par e-mail ou utilisez la page Suivi de commande.</Alert></div>;
  const paid = order.paymentStatus === "SUCCEEDED" || order.paymentStatus === "PARTIALLY_REFUNDED";
  const failed = order.paymentStatus === "FAILED" || order.status === "CANCELLED";
  return (
    <div className="container-page mt-16 max-w-2xl text-center">
      {paid ? (
        <>
          <CheckCircle2 className="mx-auto size-16 text-emerald-600" aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold">Merci, votre commande est confirmée</h1>
          <p className="mt-3 text-muted">Commande <strong className="text-night-900">{order.number}</strong> · {formatEuros(order.totalCents)}. Un e-mail de confirmation a été envoyé à {order.email}.</p>
        </>
      ) : failed ? (
        <>
          <XCircle className="mx-auto size-16 text-red-600" aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold">Le paiement n&apos;a pas abouti</h1>
          <p className="mt-3 text-muted">Aucun montant n&apos;a été encaissé pour la commande {order.number}. Vous pouvez réessayer depuis votre panier.</p>
        </>
      ) : (
        <>
          <Clock className="mx-auto size-16 text-electric-500" aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold">Paiement en cours de confirmation</h1>
          <p className="mt-3 text-muted">Nous attendons la confirmation de Stripe pour la commande {order.number}. Cette page se met à jour automatiquement.</p>
          <AutoRefresh seconds={4} max={15} />
        </>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="night"><Link href={`/suivi-commande?commande=${order.number}&cle=${sp.cle}`}>Suivre ma commande</Link></Button>
        <Button asChild variant="outline"><Link href="/boutique">Continuer mes achats</Link></Button>
      </div>
    </div>
  );
}
