import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { SignOutButton } from "@/components/account/sign-out";

const LINKS = [
  ["/compte", "Tableau de bord"],
  ["/compte/commandes", "Mes commandes"],
  ["/compte/adresses", "Adresses"],
  ["/compte/favoris", "Favoris"],
  ["/compte/retours", "Retours"],
  ["/compte/support", "Support"],
  ["/compte/profil", "Profil et données"],
] as const;

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="container-page mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <p className="px-2 text-xs text-muted">Connecté(e) en tant que</p>
          <p className="truncate px-2 font-semibold">{user.name}</p>
          <nav className="mt-3 space-y-0.5" aria-label="Espace client">
            {LINKS.map(([href, label]) => <Link key={href} href={href} className="block rounded-lg px-2 py-2 text-sm hover:bg-surface">{label}</Link>)}
            {user.isStaff && <Link href="/admin" className="block rounded-lg px-2 py-2 text-sm font-semibold text-electric-500 hover:bg-surface">Administration</Link>}
          </nav>
          <div className="mt-3 border-t border-line pt-3"><SignOutButton /></div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
