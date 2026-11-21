import Link from "next/link";
import { requireStaff } from "@/modules/auth/session";
import { dashboardKpis, resolvePeriod, revenueSeries } from "@/modules/analytics/service";
import { launchChecklist } from "@/modules/settings/service";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { AdminTitle, Panel, Stat, Table, Td } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { PeriodPicker } from "@/components/admin/period-picker";
import { OrderStatusBadge } from "@/components/shop/order-detail";
import { Alert, Badge } from "@/components/ui/misc";
import { MarkNotificationsRead } from "@/components/admin/mark-read";

export const metadata = { title: "Tableau de bord" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string; from?: string; to?: string }> }) {
  const user = await requireStaff("dashboard:read");
  const sp = await searchParams;
  const period = resolvePeriod(sp.p, sp.from, sp.to);
  const canMoney = user.permissions.has("analytics:read");
  const [k, series, checklist] = await Promise.all([dashboardKpis(period), revenueSeries(period), launchChecklist()]);
  return (
    <div className="space-y-6">
      <AdminTitle title="Tableau de bord" description={`${period.label} — données réelles de la base`} actions={<PeriodPicker base="/admin" current={sp.p} from={sp.from} to={sp.to} />} />
      {checklist.length > 0 && (
        <Alert tone="warning" title="Avant l'ouverture commerciale">
          <ul className="mt-1 list-disc pl-5">{checklist.map((c) => <li key={c}>{c}</li>)}</ul>
          <Link href="/admin/reglages" className="mt-2 inline-block font-semibold underline">Ouvrir les paramètres</Link>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canMoney && <Stat label="Chiffre d'affaires" value={formatEuros(k.revenueCents)} hint={`net des remboursements · panier moyen ${formatEuros(k.averageBasketCents)}`} tone="orange" />}
        <Stat label="Commandes" value={k.ordersCount} hint={`${k.paidOrders} paiement(s) confirmé(s)`} />
        <Stat label="À traiter" value={k.pending} hint="payées, non expédiées" tone={k.pending > 0 ? "orange" : "green"} />
        <Stat label="Livraisons en cours" value={k.inDelivery} />
        {canMoney && <Stat label="Marge brute estimée" value={formatEuros(k.marginCents)} hint="HT, coût d'achat figé à la commande" tone="green" />}
        {canMoney && <Stat label="Bénéfice estimé" value={formatEuros(k.profitCents)} hint="marge + port facturé − remboursements" tone="green" />}
        <Stat label="Remboursements" value={canMoney ? formatEuros(k.refundsCents) : k.refundsCount} hint={`${k.refundsCount} remboursement(s)`} tone="red" />
        <Stat label="Clients" value={k.customers} hint={`${k.newCustomers} nouveau(x) sur la période`} />
        <Stat label="Produits publiés" value={k.published} />
        <Stat label="Produits indisponibles" value={k.unavailable} tone={k.unavailable ? "red" : "green"} />
      </div>
      {canMoney && <Panel title="Évolution"><RevenueChart data={series} /></Panel>}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Dernières commandes" actions={<Link href="/admin/commandes" className="text-sm text-electric-500">Tout voir</Link>}>
          <Table head={["Commande", "Client", "Statut", "Total", "Date"]} empty={k.latest.length === 0}>
            {k.latest.map((o) => (
              <tr key={o.id}><Td><Link href={`/admin/commandes/${o.id}`} className="font-semibold text-electric-500">{o.number}</Link></Td><Td className="max-w-40 truncate">{o.email}</Td><Td><OrderStatusBadge status={o.status} /></Td><Td>{formatEuros(o.totalCents)}</Td><Td>{formatDate(o.createdAt, true)}</Td></tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Alertes" actions={k.alerts.length > 0 ? <MarkNotificationsRead /> : null}>
          <div id="alertes" />
          {k.alerts.length === 0 ? <p className="text-sm text-muted">Aucune alerte non lue.</p> : (
            <ul className="space-y-2">
              {k.alerts.map((a) => (
                <li key={a.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><Badge tone={a.level === "error" ? "red" : a.level === "warning" ? "amber" : "electric"}>{a.level}</Badge><span className="text-xs text-muted">{formatDate(a.createdAt, true)}</span></div>
                  <p className="mt-1 font-semibold">{a.link ? <Link href={a.link} className="hover:underline">{a.title}</Link> : a.title}</p>
                  {a.body && <p className="text-xs text-muted">{a.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
