import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { dashboardKpis, resolvePeriod, revenueSeries, topProducts } from "@/modules/analytics/service";
import { AdminTitle, Panel, Stat, Table, Td } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { PeriodPicker } from "@/components/admin/period-picker";
import { formatEuros } from "@/lib/money";
import { PAID_STATUSES } from "@/modules/orders/status";

export const metadata = { title: "Statistiques" };

export default async function Stats({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  await requireStaff("analytics:read");
  const sp = await searchParams;
  const period = resolvePeriod(sp.p, sp.from, sp.to);
  const [k, series, top, byCountry, abandoned] = await Promise.all([
    dashboardKpis(period), revenueSeries(period), topProducts(period, 15),
    db.$queryRaw<{ country: string; orders: bigint; revenue: bigint }[]>`SELECT "shippingAddress"->>'country' AS country, COUNT(*)::bigint AS orders, COALESCE(SUM("totalCents"),0)::bigint AS revenue FROM "Order" WHERE "paidAt" BETWEEN ${period.from} AND ${period.to} GROUP BY 1 ORDER BY 3 DESC`,
    db.order.count({ where: { status: { in: ["CANCELLED"] }, paymentStatus: { in: ["CANCELLED", "FAILED"] }, createdAt: { gte: period.from, lte: period.to } } }),
  ]);
  const created = await db.order.count({ where: { createdAt: { gte: period.from, lte: period.to } } });
  const paid = await db.order.count({ where: { createdAt: { gte: period.from, lte: period.to }, status: { in: PAID_STATUSES.concat(["REFUNDED"]) } } });
  return (
    <div className="space-y-6">
      <AdminTitle title="Statistiques" description={`${period.label} · calculées depuis les commandes payées`} actions={<PeriodPicker base="/admin/statistiques" current={sp.p} from={sp.from} to={sp.to} />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="CA net" value={formatEuros(k.revenueCents)} tone="orange" />
        <Stat label="Marge brute estimée" value={formatEuros(k.marginCents)} tone="green" />
        <Stat label="Panier moyen" value={formatEuros(k.averageBasketCents)} />
        <Stat label="Paiement finalisé" value={created ? `${Math.round((paid / created) * 100)} %` : "—"} hint={`${paid} / ${created} commandes créées · ${abandoned} abandonnée(s)`} />
      </div>
      <Panel title="Évolution"><RevenueChart data={series} /></Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Meilleurs produits">
          <Table head={["Produit", "Quantité", "CA TTC"]} empty={top.length === 0}>{top.map((t) => <tr key={`${t.productId}-${t.name}`}><Td>{t.name}</Td><Td>{t.quantity}</Td><Td>{formatEuros(t.revenueCents)}</Td></tr>)}</Table>
        </Panel>
        <Panel title="Par pays de livraison">
          <Table head={["Pays", "Commandes", "CA TTC"]} empty={byCountry.length === 0}>{byCountry.map((c) => <tr key={c.country}><Td>{c.country}</Td><Td>{Number(c.orders)}</Td><Td>{formatEuros(Number(c.revenue))}</Td></tr>)}</Table>
        </Panel>
      </div>
    </div>
  );
}
