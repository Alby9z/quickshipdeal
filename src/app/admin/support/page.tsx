import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { TICKET_LABELS } from "@/components/admin/status";
import { formatDate } from "@/lib/utils";
import type { TicketStatus } from "@prisma/client";

export const metadata = { title: "Support" };
const PER = 40;
const CAT: Record<string, string> = { question: "Question", complaint: "Réclamation", gdpr: "Données personnelles", other: "Autre" };

export default async function Support({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireStaff("support:write");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.status && sp.status in TICKET_LABELS ? { status: sp.status as TicketStatus } : { status: { in: ["OPEN", "PENDING_CUSTOMER"] as TicketStatus[] } };
  const [rows, total] = await Promise.all([db.supportTicket.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { messages: true } } } }), db.supportTicket.count({ where })]);
  return (
    <>
      <AdminTitle title="Réclamations et support" />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm"><Link href="/admin/support" className="rounded-full bg-white px-3 py-1">À traiter</Link>{Object.entries(TICKET_LABELS).map(([k, l]) => <Link key={k} href={`/admin/support?status=${k}`} className={`rounded-full px-3 py-1 ${k === sp.status ? "bg-night-900 text-white" : "bg-white"}`}>{l}</Link>)}</nav>
      <Table head={["Ticket", "Mis à jour", "Client", "Catégorie", "Sujet", "Messages", "Statut"]} empty={rows.length === 0}>
        {rows.map((t) => (
          <tr key={t.id}>
            <Td><Link href={`/admin/support/${t.id}`} className="font-semibold hover:text-electric-600">{t.number}</Link></Td>
            <Td>{formatDate(t.updatedAt, true)}</Td><Td>{t.name ?? ""} <span className="text-xs text-muted">{t.email}</span></Td>
            <Td>{CAT[t.category] ?? t.category}</Td><Td>{t.subject}</Td><Td>{t._count.messages}</Td>
            <Td><Badge tone={t.status === "OPEN" ? "orange" : "neutral"}>{TICKET_LABELS[t.status]}</Badge></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/support?status=${sp.status ?? ""}`} />
    </>
  );
}
