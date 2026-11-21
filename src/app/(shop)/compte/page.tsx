import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/shop/order-detail";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export const metadata = { title: "Mon compte", robots: { index: false } };

export default async function Page() {
  const user = await requireUser();
  const [orders, counts] = await Promise.all([
    db.order.findMany({ where: { userId: user.id, status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.$transaction([db.order.count({ where: { userId: user.id, paymentStatus: "SUCCEEDED" } }), db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }), db.returnRequest.count({ where: { userId: user.id } })]),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Bonjour {user.name.split(" ")[0]}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Commandes", counts[0], "/compte/commandes"], ["Favoris", counts[1], "/compte/favoris"], ["Retours", counts[2], "/compte/retours"]].map(([l, n, h]) => (
          <Link key={l as string} href={h as string} className="rounded-2xl border border-line bg-white p-5 shadow-card hover:shadow-lift"><p className="text-sm text-muted">{l}</p><p className="text-3xl font-extrabold">{n}</p></Link>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-lg font-bold">Dernières commandes</h2>
        {orders.length === 0 ? <EmptyState icon={<Package className="size-7" />} title="Aucune commande pour le moment" action={<Button asChild><Link href="/boutique">Découvrir la boutique</Link></Button>} /> : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {orders.map((o) => (
              <li key={o.id}><Link href={`/compte/commandes/${o.number}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface"><span className="font-semibold">{o.number}<span className="block text-xs font-normal text-muted">{formatDate(o.createdAt)}</span></span><OrderStatusBadge status={o.status} /><span className="font-semibold">{formatEuros(o.totalCents)}</span></Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
