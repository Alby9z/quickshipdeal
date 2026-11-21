import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { SupplierFields } from "@/components/admin/supplier-fields";
import { Badge } from "@/components/ui/misc";
import { adapterStatus } from "@/modules/suppliers/service";
import { saveSupplierAction } from "@/actions/admin-ops";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Fournisseurs" };
const STATUS = { manual: ["Manuel", "neutral"], configured: ["API configurée", "green"], not_configured: ["API non configurée", "amber"] } as const;

export default async function Suppliers() {
  const user = await requireStaff("supplier:read");
  const rows = await db.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, include: { _count: { select: { catalogProducts: true, products: true } }, syncs: { orderBy: { createdAt: "desc" }, take: 1 } } });
  return (
    <>
      <AdminTitle title="Fournisseurs" description="Les intégrations BigBuy et CJ Dropshipping restent « non configurées » tant que les accès API ne sont pas fournis. Le mode manuel fonctionne toujours." />
      <Table head={["Fournisseur", "Intégration", "Actif", "Produits liés", "Références", "Dernière synchro"]} empty={rows.length === 0}>
        {rows.map((s) => {
          const [l, t] = STATUS[adapterStatus(s.type)];
          return (
            <tr key={s.id}>
              <Td><Link href={`/admin/fournisseurs/${s.id}`} className="font-semibold hover:text-electric-600">{s.name}</Link></Td>
              <Td><Badge tone={t}>{l}</Badge></Td>
              <Td>{s.isEnabled ? "Oui" : "Non"}</Td>
              <Td>{s._count.catalogProducts}</Td><Td>{s._count.products}</Td>
              <Td>{s.syncs[0] ? `${formatDate(s.syncs[0].createdAt, true)} · ${s.syncs[0].status}` : "—"}</Td>
            </tr>
          );
        })}
      </Table>
      {hasPermission(user, "supplier:write") && <Panel title="Ajouter un fournisseur" className="mt-6"><AdminForm action={saveSupplierAction} submit="Créer le fournisseur"><SupplierFields /></AdminForm></Panel>}
    </>
  );
}
