import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/shop/order-detail";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Mes commandes", robots: { index: false } };

export default async function Page() {
  const user = await requireUser();
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } });
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold">Mes commandes</h1>
      {orders.length === 0 ? <EmptyState title="Aucune commande" /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left"><tr><th className="p-3">Commande</th><th className="p-3">Date</th><th className="p-3">Statut</th><th className="p-3 text-right">Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line"><td className="p-3"><Link href={`/compte/commandes/${o.number}`} className="font-semibold text-electric-500">{o.number}</Link><span className="block text-xs text-muted">{o._count.items} article(s)</span></td><td className="p-3">{formatDate(o.createdAt)}</td><td className="p-3"><OrderStatusBadge status={o.status} /></td><td className="p-3 text-right font-semibold">{formatEuros(o.totalCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
