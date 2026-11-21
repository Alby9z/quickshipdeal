import Link from "next/link";
import Image from "next/image";
import { requireStaff } from "@/modules/auth/session";
import { ADMIN_NAV } from "@/components/admin/nav";
import { db } from "@/lib/db";
import { integrationStatus } from "@/lib/env";
import { SignOutButton } from "@/components/account/sign-out";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Administration", template: "%s · Admin QuickShipDeals" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("dashboard:read");
  const unread = await db.notification.count({ where: { audience: "admin", readAt: null } });
  const st = integrationStatus();
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/10 bg-night-950 text-white/75 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0">
        <div className="flex items-center gap-2 p-5">
          <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg bg-white p-0.5" />
          <div><p className="font-display font-extrabold text-white">QuickShipDeals</p><p className="text-[11px] text-white/50">Administration</p></div>
        </div>
        <details className="lg:hidden px-5 pb-4"><summary className="cursor-pointer text-sm">Menu</summary><Nav perms={user.permissions} /></details>
        <div className="hidden lg:block"><Nav perms={user.permissions} /></div>
        <div className="space-y-1 border-t border-white/10 p-5 text-xs">
          <p className="mb-2 font-semibold uppercase tracking-wider text-white/40">Intégrations</p>
          {([["Stripe", st.stripe], ["Resend", st.resend], ["Stockage R2", st.storage], ["Redis / worker", st.redis]] as const).map(([l, ok]) => (
            <p key={l} className="flex items-center justify-between"><span>{l}</span><span className={ok ? "text-emerald-400" : "text-amber-400"}>{ok ? "configuré" : "non configuré"}</span></p>
          ))}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b border-line bg-white/90 px-6 backdrop-blur">
          <Link href="/" className="text-sm text-muted hover:text-night-900">Voir la boutique</Link>
          <Link href="/admin#alertes" className="text-sm">Alertes {unread > 0 && <span className="ml-1 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}</Link>
          <span className="text-sm font-medium">{user.name}</span>
          <div className="w-36"><SignOutButton /></div>
        </header>
        <main id="contenu" className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Nav({ perms }: { perms: Set<string> }) {
  return (
    <nav className="space-y-5 px-3 pb-6" aria-label="Administration">
      {ADMIN_NAV.map((g) => {
        const items = g.items.filter((i) => perms.has(i.perm));
        if (!items.length) return null;
        return (
          <div key={g.group}>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.group}</p>
            {items.map((i) => <Link key={i.href} href={i.href} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-white/5 hover:text-white">{i.label}</Link>)}
          </div>
        );
      })}
    </nav>
  );
}
