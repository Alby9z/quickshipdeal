import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";
import { ORDER_TONE, PAYMENT_LABELS } from "@/components/admin/status";
import type { OrderStatus, Prisma } from "@prisma/client";

export const metadata = { title: "Commandes" };
const PER = 30;

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireStaff("order:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.q) where.OR = [{ number: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { shipments: { some: { trackingNumber: { contains: sp.q } } } }];
  if (sp.status && sp.status in ORDER_STATUS_LABELS) where.status = sp.status as OrderStatus;
  const [rows, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  return (
    <>
      <AdminTitle title="Commandes" description={`${total} commande(s). Une commande n'est payée qu'après confirmation signée de Stripe.`} />
      <SearchBar placeholder="N° de commande, e-mail, n° de suivi" defaultValue={sp.q} extra={
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-xl border border-line bg-white px-3 text-sm" aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>} />
      <Table head={["Commande", "Date", "Client", "Articles", "Total", "Paiement", "Statut"]} empty={rows.length === 0}>
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-surface/60">
            <Td><Link href={`/admin/commandes/${o.id}`} className="font-semibold hover:text-electric-600">{o.number}</Link></Td>
            <Td className="whitespace-nowrap">{formatDate(o.createdAt, true)}</Td>
            <Td>{o.email}{!o.userId && <span className="ml-1 text-xs text-muted">(invité)</span>}</Td>
            <Td>{o._count.items}</Td>
            <Td className="whitespace-nowrap font-semibold">{formatEuros(o.totalCents)}</Td>
            <Td>{PAYMENT_LABELS[o.paymentStatus]}</Td>
            <Td><Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/commandes?q=${encodeURIComponent(sp.q ?? "")}&status=${sp.status ?? ""}`} />
    </>
  );
}
