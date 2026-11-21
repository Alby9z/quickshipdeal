import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Pages" };

export default async function Pages() {
  await requireStaff("content:write");
  const pages = await db.page.findMany({ orderBy: { title: "asc" } });
  return (
    <>
      <AdminTitle title="Pages" description="Les pages juridiques sont des brouillons à compléter et faire valider ; elles ne sont pas affichées tant qu'elles ne sont pas publiées." />
      <Table head={["Page", "URL", "Statut", "Validation juridique", "Modifiée"]} empty={pages.length === 0}>
        {pages.map((p) => (
          <tr key={p.id}>
            <Td><Link href={`/admin/pages/${p.id}`} className="font-semibold hover:text-electric-600">{p.title}</Link></Td>
            <Td className="text-xs text-muted">/{p.slug}</Td>
            <Td><Badge tone={p.status === "PUBLISHED" ? "green" : "neutral"}>{p.status === "PUBLISHED" ? "Publiée" : "Brouillon"}</Badge></Td>
            <Td>{p.needsLegalReview ? <Badge tone="amber">À valider</Badge> : "—"}</Td>
            <Td>{formatDate(p.updatedAt)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
