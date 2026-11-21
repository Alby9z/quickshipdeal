import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Clients" };
const PER = 40;

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("customer:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = { deletedAt: null, roles: { some: { role: { key: "CUSTOMER" } } }, ...(sp.q ? { OR: [{ email: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }] } : {}) };
  const [rows, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { profile: true, _count: { select: { orders: true } } } }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <AdminTitle title="Clients" description={`${total} compte(s) client`} />
      <SearchBar placeholder="Nom ou e-mail" defaultValue={sp.q} />
      <Table head={["Client", "Inscrit le", "Commandes", "E-mail vérifié", "Newsletter", "État"]} empty={rows.length === 0}>
        {rows.map((u) => (
          <tr key={u.id}>
            <Td><Link href={`/admin/clients/${u.id}`} className="font-semibold hover:text-electric-600">{u.name}</Link><p className="text-xs text-muted">{u.email}</p></Td>
            <Td>{formatDate(u.createdAt)}</Td><Td>{u._count.orders}</Td><Td>{u.emailVerified ? "Oui" : "Non"}</Td><Td>{u.profile?.marketingOptIn ? "Oui" : "Non"}</Td>
            <Td>{u.isBlocked ? <Badge tone="red">Bloqué</Badge> : <Badge tone="green">Actif</Badge>}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/clients?q=${encodeURIComponent(sp.q ?? "")}`} />
    </>
  );
}
