import Link from "next/link";
import { ShieldCheck, CreditCard, Truck, RotateCcw } from "lucide-react";
import { getSetting } from "@/modules/settings/service";
import { Logo } from "./logo";
import { NewsletterForm } from "@/components/shop/newsletter-form";
import { CookieSettingsLink } from "./cookie-consent";

const COLS = [
  { title: "Boutique", links: [["/boutique", "Tous les produits"], ["/categories", "Catégories"], ["/nouveautes", "Nouveautés"], ["/meilleures-ventes", "Meilleures ventes"], ["/promotions", "Promotions"]] },
  { title: "Aide", links: [["/suivi-commande", "Suivi de commande"], ["/livraison", "Livraison"], ["/retours", "Retours et remboursements"], ["/faq", "FAQ"], ["/contact", "Contact"]] },
  { title: "Informations", links: [["/a-propos", "À propos"], ["/blog", "Blog"], ["/juridique", "Informations juridiques"], ["/mentions-legales", "Mentions légales"], ["/cgv", "CGV"], ["/confidentialite", "Confidentialité"], ["/cookies", "Cookies"]] },
] as const;

export async function Footer() {
  const b = await getSetting("business");
  return (
    <footer className="mt-24 bg-night-950 text-white/75">
      <div className="route-line h-1" aria-hidden />
      <div className="border-b border-white/10">
        <div className="container-page grid grid-cols-1 gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, "Paiement sécurisé", "Transactions chiffrées via Stripe"],
            [CreditCard, "Carte, Apple Pay, Google Pay", "Selon votre appareil"],
            [Truck, "Suivi de livraison", "Numéro de suivi dès l'expédition"],
            [RotateCcw, "14 jours pour changer d'avis", "Droit de rétractation"],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={t as string} className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-orange-500"><I className="size-5" aria-hidden /></span>
                <div><p className="text-sm font-semibold text-white">{t as string}</p><p className="text-xs text-white/60">{d as string}</p></div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="container-page grid grid-cols-1 gap-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr] [&>*]:min-w-0">
        <div>
          <Logo dark />
          <p className="mt-4 max-w-sm text-sm">Boutique en ligne de vente à distance sur catalogue général.</p>
          <div className="mt-6 max-w-sm"><NewsletterForm dark /></div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">{c.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-orange-500">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {b.tradeName}{b.legalName ? ` — ${b.legalName}` : ""}{b.siret ? ` — SIRET ${b.siret}` : ""}</p>
          <div className="flex gap-4"><CookieSettingsLink /><Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link></div>
        </div>
      </div>
    </footer>
  );
}
