import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { REFUND_LABELS } from "@/components/admin/status";

export const metadata = { title: "Remboursements" };
const PER = 40;
const TONE = { PENDING: "amber", SUCCEEDED: "green", FAILED: "red", CANCELLED: "neutral" } as const;

export default async function Refunds({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("order:read");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, total] = await Promise.all([db.refund.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: { select: { id: true, number: true, email: true } } } }), db.refund.count()]);
  return (
    <>
      <AdminTitle title="Remboursements" description="Un remboursement se lance depuis la fiche commande ; son statut final est confirmé par Stripe." />
      <Table head={["Date", "Commande", "Client", "Montant", "Motif", "Statut", "Stripe"]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap">{formatDate(r.createdAt, true)}</Td>
            <Td><Link href={`/admin/commandes/${r.order.id}`} className="font-medium hover:text-electric-600">{r.order.number}</Link></Td>
            <Td>{r.order.email}</Td><Td>{formatEuros(r.amountCents)}</Td><Td>{r.reason ?? "—"}</Td>
            <Td><Badge tone={TONE[r.status]}>{REFUND_LABELS[r.status]}</Badge></Td>
            <Td className="font-mono text-xs">{r.stripeRefundId ?? "—"}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base="/admin/remboursements" />
    </>
  );
}
