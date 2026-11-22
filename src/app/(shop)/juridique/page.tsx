import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Informations juridiques",
  description: "Mentions légales, CGV, politique de confidentialité, cookies, livraison et retours de QuickShipDeals.",
  alternates: { canonical: "/juridique" },
};

const DOCS = [
  ["/mentions-legales", "Mentions légales", "Éditeur du site, immatriculation, hébergeur, médiation."],
  ["/cgv", "Conditions générales de vente", "Commande, prix, paiement, livraison, rétractation, garanties légales."],
  ["/confidentialite", "Politique de confidentialité", "Données collectées, finalités, durées de conservation, vos droits (RGPD)."],
  ["/cookies", "Politique de cookies", "Cookies utilisés et gestion de votre consentement."],
  ["/politique-de-livraison", "Politique de livraison", "Zones, délais, frais, suivi et colis endommagés."],
  ["/politique-de-retour", "Retours et remboursements", "Droit de rétractation de 14 jours, frais de retour, remboursement."],
] as const;

/** Sommaire des documents juridiques. */
export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Informations légales" title="Informations juridiques" description="Tous nos documents juridiques, à jour et consultables à tout moment." />
      <div className="container-page mt-10 grid max-w-3xl gap-4">
        {DOCS.map(([href, title, desc]) => (
          <Link key={href} href={href} className="flex items-start gap-4 rounded-2xl border border-line p-5 transition hover:border-orange-500">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-600"><FileText className="size-5" aria-hidden /></span>
            <div><p className="font-semibold">{title}</p><p className="text-sm text-muted">{desc}</p></div>
          </Link>
        ))}
      </div>
    </>
  );
}
