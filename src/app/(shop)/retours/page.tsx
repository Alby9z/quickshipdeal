import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Retours et remboursements", description: "Comment retourner un produit et être remboursé.", alternates: { canonical: "/retours" } };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Aide" title="Retours et remboursements" description="14 jours après réception pour exercer votre droit de rétractation." />
      <div className="container-page mt-10 max-w-3xl">
        <ol className="space-y-4">
          {[
            ["Faites votre demande", "Depuis votre espace client, rubrique Mes commandes, bouton « Demander un retour ». Sans compte, utilisez le formulaire de contact avec votre numéro de commande."],
            ["Recevez les instructions", "Nous vous confirmons l'acceptation du retour et l'adresse de retour par e-mail."],
            ["Renvoyez le produit", "Dans son état d'origine, avec la preuve d'expédition."],
            ["Soyez remboursé(e)", "Sur le moyen de paiement utilisé, au plus tard 14 jours après la rétractation (pouvant être différé jusqu'à réception du produit)."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-line p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 font-bold text-orange-600">{i + 1}</span>
              <div><p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link href="/compte/commandes">Demander un retour</Link></Button>
          <Button asChild variant="outline"><Link href="/politique-de-retour">Politique de retour complète</Link></Button>
        </div>
      </div>
    </>
  );
}
