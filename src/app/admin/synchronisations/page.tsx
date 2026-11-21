import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Synchronisations" };
const PER = 40;
const TONE = { QUEUED: "neutral", RUNNING: "electric", SUCCESS: "green", PARTIAL: "amber", FAILED: "red" } as const;

export default async function Syncs({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("supplier:read");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, total] = await Promise.all([db.supplierSync.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { supplier: { select: { name: true, id: true } } } }), db.supplierSync.count()]);
  return (
    <>
      <AdminTitle title="Synchronisations fournisseurs" description="Historique des imports CSV et synchronisations API (prix, stocks, catalogue)." />
      <Table head={["Date", "Fournisseur", "Type", "Statut", "Résultat", "Détails"]} empty={rows.length === 0}>
        {rows.map((y) => (
          <tr key={y.id}>
            <Td className="whitespace-nowrap">{formatDate(y.createdAt, true)}</Td>
            <Td><Link href={`/admin/fournisseurs/${y.supplier.id}`} className="hover:text-electric-600">{y.supplier.name}</Link></Td>
            <Td>{y.kind}</Td>
            <Td><Badge tone={TONE[y.status as keyof typeof TONE] ?? "neutral"}>{y.status}</Badge></Td>
            <Td>{y.itemsUpdated}/{y.itemsTotal} · {y.priceChanges} prix · {y.errorsCount} err.</Td>
            <Td className="max-w-md text-xs text-muted">{y.errorMessage}{Array.isArray(y.log) && y.log.length > 0 && <details><summary className="cursor-pointer">Journal ({y.log.length})</summary><ul>{(y.log as string[]).slice(0, 50).map((l, i) => <li key={i}>{l}</li>)}</ul></details>}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base="/admin/synchronisations" />
    </>
  );
}
