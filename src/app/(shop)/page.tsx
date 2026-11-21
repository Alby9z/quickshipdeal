import Link from "next/link";
import { ArrowRight, PackageSearch, ShieldCheck, Truck, RotateCcw, CreditCard, Sparkles, Layers } from "lucide-react";
import { homeSections } from "@/modules/catalog/repository";
import { ProductGrid } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/shop/hero-visual";
import { Reveal } from "@/components/shop/motion";
import { NewsletterForm } from "@/components/shop/newsletter-form";
import { EmptyState } from "@/components/ui/misc";

export const revalidate = 60;

function Section({ title, eyebrow, href, children }: { title: string; eyebrow: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-page mt-20">
      <Reveal>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h2>
          </div>
          {href && <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-electric-500 hover:underline">Tout voir <ArrowRight className="size-4" aria-hidden /></Link>}
        </div>
      </Reveal>
      {children}
    </section>
  );
}

const FAQ = [
  ["Le paiement est-il sécurisé ?", "Oui. Le paiement est traité par Stripe, prestataire certifié PCI-DSS. Vos données de carte ne transitent jamais par nos serveurs."],
  ["Comment suivre ma commande ?", "Dès l'expédition, vous recevez un e-mail avec le transporteur et le numéro de suivi. Le suivi est aussi disponible dans votre espace client ou via la page Suivi de commande."],
  ["Puis-je retourner un produit ?", "Vous disposez de 14 jours après réception pour exercer votre droit de rétractation. La demande se fait en ligne depuis votre espace client."],
  ["Faut-il créer un compte pour commander ?", "Non, la commande sans compte est possible. Un compte permet de retrouver vos commandes, factures, adresses et favoris."],
];

export default async function HomePage() {
  const s = await homeSections();
  const empty = s.count === 0;
  return (
    <>
      <section className="relative overflow-hidden bg-night-900 text-white">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute -left-40 top-10 size-[28rem] rounded-full bg-electric-500/25 blur-3xl" aria-hidden />
        <div className="absolute -right-20 bottom-0 size-80 rounded-full bg-orange-500/20 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"><Sparkles className="size-3.5 text-orange-500" aria-hidden /> Boutique en ligne · Livraison suivie</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Les bonnes affaires,<br /><span className="bg-gradient-to-r from-orange-500 to-[#ffb37a] bg-clip-text text-transparent">expédiées vite.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">QuickShipDeals sélectionne des produits du quotidien, de la maison au high-tech, avec un paiement sécurisé et un suivi de colis de bout en bout.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/boutique">Découvrir la boutique <ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10"><Link href="/suivi-commande">Suivre une commande</Link></Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}><HeroVisual /></Reveal>
        </div>
        <div className="route-line h-1" aria-hidden />
      </section>

      <section className="container-page -mt-px">
        <div className="grid gap-px overflow-hidden rounded-b-2xl border border-t-0 border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, "Paiement sécurisé", "Stripe, carte bancaire, Apple Pay et Google Pay"],
            [Truck, "Livraison suivie", "Numéro de suivi transmis dès l'expédition"],
            [RotateCcw, "Rétractation 14 jours", "Demande de retour directement en ligne"],
            [CreditCard, "Prix TTC affichés", "Frais de livraison indiqués avant paiement"],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={t as string} className="flex items-start gap-3 bg-white p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-600"><I className="size-5" aria-hidden /></span>
                <div><p className="text-sm font-bold text-night-900">{t as string}</p><p className="text-xs text-muted">{d as string}</p></div>
              </div>
            );
          })}
        </div>
      </section>

      {s.categories.length > 0 && (
        <Section eyebrow="Explorer" title="Catégories" href="/categories">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {s.categories.map((c) => (
              <Link key={c.id} href={`/categorie/${c.slug}`} className="group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-white to-surface p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <Layers className="mb-6 size-6 text-electric-500" aria-hidden />
                <p className="font-bold text-night-900 group-hover:text-electric-500">{c.name}</p>
                <p className="text-xs text-muted">{c._count.primaryProducts} produit{c._count.primaryProducts > 1 ? "s" : ""}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {empty ? (
        <section className="container-page mt-20">
          <EmptyState icon={<PackageSearch className="size-7" aria-hidden />} title="Notre catalogue est en préparation">
            Nous sélectionnons actuellement nos premiers produits et nos partenaires logistiques. Inscrivez-vous à la newsletter pour être informé(e) de l&apos;ouverture.
          </EmptyState>
        </section>
      ) : (
        <>
          {s.latest.length > 0 && <Section eyebrow="Fraîchement arrivés" title="Nouveautés" href="/nouveautes"><ProductGrid products={s.latest} /></Section>}
          {s.onSale.length > 0 && <Section eyebrow="Offres en cours" title="Promotions" href="/promotions"><ProductGrid products={s.onSale} /></Section>}
          {s.popular.length > 0 && <Section eyebrow="Les plus commandés" title="Produits populaires" href="/meilleures-ventes"><ProductGrid products={s.popular} /></Section>}
        </>
      )}

      <Section eyebrow="Comment ça marche" title="Livraison et suivi">
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            ["Vous commandez", "Paiement sécurisé, confirmation immédiate par e-mail."],
            ["Nous préparons", "Votre commande est transmise à notre partenaire logistique."],
            ["Le colis part", "Vous recevez le transporteur et le numéro de suivi."],
            ["Vous recevez", "Suivi en temps réel dans votre espace client."],
          ].map(([t, d], i) => (
            <li key={t} className="relative rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className="font-display text-4xl font-extrabold text-orange-500/25">0{i + 1}</span>
              <p className="mt-2 font-bold text-night-900">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">Les délais estimés sont indiqués sur chaque fiche produit. <Link href="/livraison" className="font-semibold text-electric-500 hover:underline">Notre politique de livraison</Link></p>
      </Section>

      <Section eyebrow="Questions fréquentes" title="FAQ" href="/faq">
        <div className="grid gap-3 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-line bg-white p-5 open:shadow-card">
              <summary className="cursor-pointer list-none font-semibold text-night-900 marker:hidden">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="container-page mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-night-900 p-6 text-white sm:p-12">
          <div className="bg-grid absolute inset-0" aria-hidden />
          <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-2 [&>*]:min-w-0">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ne manquez aucune offre</h2>
              <p className="mt-2 text-white/70">Nouveautés et promotions, uniquement si vous le souhaitez. Double confirmation, désinscription en un clic.</p>
            </div>
            <NewsletterForm dark />
          </div>
        </div>
      </section>
    </>
  );
}
