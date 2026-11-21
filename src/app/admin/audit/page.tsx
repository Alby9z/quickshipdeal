import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Journal d'audit" };
const PER = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("audit:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = sp.q ? { OR: [{ action: { contains: sp.q } }, { entityType: { contains: sp.q, mode: "insensitive" } }, { entityId: sp.q }] } : {};
  const [rows, total] = await Promise.all([db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, email: true } } } }), db.auditLog.count({ where })]);
  return (
    <>
      <AdminTitle title="Journal d'audit" description="Toutes les actions sensibles (prix, statuts, remboursements, rôles, RGPD)." />
      <SearchBar placeholder="Action, type ou identifiant" defaultValue={sp.q} />
      <Table head={["Date", "Auteur", "Action", "Élément", "Détails"]} empty={rows.length === 0}>
        {rows.map((a) => (
          <tr key={a.id}>
            <Td className="whitespace-nowrap">{formatDate(a.createdAt, true)}</Td>
            <Td>{a.actor?.name ?? "Système"}<p className="text-xs text-muted">{a.actor?.email}</p></Td>
            <Td className="font-mono text-xs">{a.action}</Td>
            <Td className="text-xs">{a.entityType}{a.entityId ? ` · ${a.entityId}` : ""}</Td>
            <Td>{a.changes ? <details><summary className="cursor-pointer text-xs text-electric-600">voir</summary><pre className="max-w-md overflow-x-auto text-[11px]">{JSON.stringify(a.changes, null, 2)}</pre></details> : ""}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/audit?q=${encodeURIComponent(sp.q ?? "")}`} />
    </>
  );
}
