import Link from "next/link";
import { Search, ShoppingBag, User, Heart, Menu, Truck } from "lucide-react";
import { getNavCategories } from "@/modules/catalog/repository";
import { cartCount } from "@/modules/cart/service";
import { getCurrentUser } from "@/modules/auth/session";
import { Logo } from "./logo";

const NAV = [
  { href: "/boutique", label: "Boutique" },
  { href: "/nouveautes", label: "Nouveautés" },
  { href: "/meilleures-ventes", label: "Meilleures ventes" },
  { href: "/promotions", label: "Promotions" },
  { href: "/blog", label: "Blog" },
];

export async function Header() {
  const [categories, count, user] = await Promise.all([getNavCategories(), cartCount(), getCurrentUser()]);
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-xl">
      <div className="hidden bg-night-900 text-white/80 sm:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-2"><Truck className="size-3.5 text-orange-500" aria-hidden /> Paiement sécurisé par Stripe · Suivi de colis dans votre espace client</p>
          <nav className="flex gap-5" aria-label="Liens utiles">
            <Link href="/suivi-commande" className="hover:text-white">Suivre ma commande</Link>
            <Link href="/faq" className="hover:text-white">Aide</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </nav>
        </div>
      </div>
      <div className="container-page flex h-18 items-center gap-2 py-3 sm:gap-4">
        <details className="group relative lg:hidden">
          <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl hover:bg-surface" aria-label="Menu"><Menu aria-hidden /></summary>
          <div className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-line bg-white p-3 shadow-lift">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface">{n.label}</Link>)}
            {categories.length > 0 && <p className="mt-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">Catégories</p>}
            {categories.map((c) => <Link key={c.id} href={`/categorie/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface">{c.name}</Link>)}
          </div>
        </details>
        <Logo />
        <form action="/recherche" role="search" className="relative mx-auto hidden max-w-xl flex-1 md:block">
          <label htmlFor="q" className="sr-only">Rechercher un produit</label>
          <input id="q" name="q" type="search" placeholder="Rechercher un produit, une référence…" className="h-11 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm transition focus:border-electric-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-electric-500/15" />
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        </form>
        <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="Compte et panier">
          <Link href="/recherche" className="grid size-10 place-items-center rounded-xl hover:bg-surface md:hidden" aria-label="Rechercher"><Search className="size-5" aria-hidden /></Link>
          <Link href="/compte/favoris" className="hidden size-10 place-items-center rounded-xl hover:bg-surface sm:grid" aria-label="Mes favoris"><Heart className="size-5" aria-hidden /></Link>
          <Link href={user ? (user.isStaff ? "/admin" : "/compte") : "/connexion"} className="flex h-10 items-center gap-2 rounded-xl px-2.5 hover:bg-surface" aria-label={user ? "Mon compte" : "Se connecter"}>
            <User className="size-5" aria-hidden />
            <span className="hidden text-sm font-medium lg:inline">{user ? (user.isStaff ? "Administration" : "Mon compte") : "Connexion"}</span>
          </Link>
          <Link href="/panier" className="relative flex h-10 items-center gap-1.5 rounded-xl bg-night-900 px-2.5 text-white sm:gap-2 sm:px-3.5 hover:bg-night-800" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
            <ShoppingBag className="size-5" aria-hidden />
            <span className="text-sm font-semibold">{count}</span>
          </Link>
        </nav>
      </div>
      <nav className="hidden border-t border-line/70 lg:block" aria-label="Navigation principale">
        <div className="container-page flex h-12 items-center gap-1 text-sm">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 font-medium text-night-900 hover:bg-surface">{n.label}</Link>)}
          {categories.length > 0 && <span className="mx-2 h-5 w-px bg-line" aria-hidden />}
          {categories.slice(0, 6).map((c) => <Link key={c.id} href={`/categorie/${c.slug}`} className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface hover:text-night-900">{c.name}</Link>)}
        </div>
      </nav>
    </header>
  );
}
