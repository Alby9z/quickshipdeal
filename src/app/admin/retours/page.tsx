import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { RETURN_LABELS } from "@/components/admin/status";
import { formatDate } from "@/lib/utils";
import type { ReturnStatus } from "@prisma/client";

export const metadata = { title: "Retours" };
const PER = 40;

export default async function Returns({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireStaff("return:write");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.status && sp.status in RETURN_LABELS ? { status: sp.status as ReturnStatus } : {};
  const [rows, total] = await Promise.all([db.returnRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: { select: { number: true, email: true } } } }), db.returnRequest.count({ where })]);
  return (
    <>
      <AdminTitle title="Retours et rétractations" description="Le client dispose de 14 jours après réception pour se rétracter ; le remboursement intervient au plus tard 14 jours après la rétractation (peut être différé jusqu'à réception du retour)." />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm"><Link href="/admin/retours" className="rounded-full bg-white px-3 py-1">Tous</Link>{Object.entries(RETURN_LABELS).map(([k, l]) => <Link key={k} href={`/admin/retours?status=${k}`} className={`rounded-full px-3 py-1 ${k === sp.status ? "bg-night-900 text-white" : "bg-white"}`}>{l}</Link>)}</nav>
      <Table head={["Retour", "Date", "Commande", "Client", "Motif", "Type", "Statut"]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td><Link href={`/admin/retours/${r.id}`} className="font-semibold hover:text-electric-600">{r.number}</Link></Td>
            <Td>{formatDate(r.createdAt)}</Td><Td>{r.order.number}</Td><Td>{r.order.email}</Td><Td>{r.reason}</Td>
            <Td>{r.isWithdrawal ? "Rétractation" : "Réclamation"}</Td>
            <Td><Badge tone={r.status === "REQUESTED" ? "orange" : r.status === "REJECTED" ? "red" : "neutral"}>{RETURN_LABELS[r.status]}</Badge></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/retours?status=${sp.status ?? ""}`} />
    </>
  );
}
