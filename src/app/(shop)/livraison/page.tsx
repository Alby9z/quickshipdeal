import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/money";
import { Alert, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Livraison", description: "Modes, frais et délais de livraison QuickShipDeals.", alternates: { canonical: "/livraison" } };
export const revalidate = 300;

export default async function Page() {
  const rates = await db.shippingRate.findMany({ where: { isActive: true }, orderBy: [{ position: "asc" }, { priceCents: "asc" }], include: { carrier: true } });
  return (
    <>
      <PageHeader eyebrow="Aide" title="Livraison" description="Les frais et délais ci-dessous sont ceux réellement appliqués au moment de la commande." />
      <div className="container-page mt-10 max-w-3xl space-y-6">
        {rates.length === 0 ? (
          <Alert tone="info">Les modes de livraison seront publiés à l&apos;ouverture de la boutique.</Alert>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left"><tr><th className="p-3">Mode</th><th className="p-3">Pays</th><th className="p-3">Délai après expédition</th><th className="p-3">Tarif</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="p-3 font-semibold">{r.name}{r.carrier ? <span className="block text-xs font-normal text-muted">{r.carrier.name}</span> : null}</td>
                    <td className="p-3">{r.countries.join(", ")}</td>
                    <td className="p-3">{r.minDays != null ? `${r.minDays}–${r.maxDays ?? r.minDays} jours ouvrés` : "—"}</td>
                    <td className="p-3">{formatEuros(r.priceCents)}{r.freeAboveCents != null ? <span className="block text-xs text-emerald-700">Offerte dès {formatEuros(r.freeAboveCents)}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-muted">Le délai de préparation dépend du produit et est indiqué sur chaque fiche. Consultez notre <Link href="/politique-de-livraison" className="text-electric-500 underline">politique de livraison</Link> et suivez vos colis depuis la page <Link href="/suivi-commande" className="text-electric-500 underline">Suivi de commande</Link>.</p>
      </div>
    </>
  );
}
