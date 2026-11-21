import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td, Pager } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { SupplierFields } from "@/components/admin/supplier-fields";
import { Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { saveSupplierAction, supplierSyncAction, supplierCsvImportAction, linkSupplierProductAction } from "@/actions/admin-ops";
import { adapterStatus } from "@/modules/suppliers/service";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Fournisseur" };
const PER = 50;

export default async function SupplierDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const user = await requireStaff("supplier:read");
  const { id } = await params;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const s = await db.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!s) notFound();
  const [refs, total, syncs] = await Promise.all([
    db.supplierProduct.findMany({ where: { supplierId: id }, orderBy: { externalSku: "asc" }, skip: (page - 1) * PER, take: PER, include: { product: { select: { id: true, name: true, sku: true } } } }),
    db.supplierProduct.count({ where: { supplierId: id } }),
    db.supplierSync.findMany({ where: { supplierId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const canWrite = hasPermission(user, "supplier:write");
  const status = adapterStatus(s.type);
  return (
    <>
      <AdminTitle title={s.name} actions={<Link href="/admin/fournisseurs" className="text-sm text-muted">← Fournisseurs</Link>} />
      {status === "not_configured" && <Alert tone="warning" title="Intégration API non configurée">Les synchronisations automatiques et la transmission des commandes ne fonctionneront pas tant que les accès API ne sont pas renseignés dans les variables d&apos;environnement et que l&apos;intégration n&apos;est pas activée. Utilisez l&apos;import CSV et la saisie manuelle.</Alert>}
      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {canWrite && <Panel title="Informations"><AdminForm action={saveSupplierAction} submit="Enregistrer"><SupplierFields s={s} /></AdminForm></Panel>}
          <Panel title={`Références fournisseur (${total})`}>
            <Table head={["SKU fournisseur", "Titre", "Prix d'achat HT", "Stock", "Dernière mise à jour", "Produit lié"]} empty={refs.length === 0}>
              {refs.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-xs">{r.externalSku}</Td><Td>{r.title ?? "—"}</Td>
                  <Td>{r.costPriceCents == null ? "—" : formatEuros(r.costPriceCents)}</Td><Td>{r.stockQuantity ?? "—"}</Td><Td>{formatDate(r.lastSyncedAt, true)}</Td>
                  <Td>
                    {r.product && <Link href={`/admin/produits/${r.product.id}`} className="mb-1 block text-xs text-electric-600">{r.product.name}</Link>}
                    {canWrite && <AdminForm action={linkSupplierProductAction} submit="Lier" inline><input type="hidden" name="supplierProductId" value={r.id} /><Input name="productSku" defaultValue={r.product?.sku ?? ""} placeholder="SKU boutique" className="h-9 w-32" /></AdminForm>}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/fournisseurs/${id}`} />
          </Panel>
        </div>
        <div className="space-y-6">
          {canWrite && (
            <Panel title="Import CSV">
              <p className="mb-3 text-xs text-muted">En-tête attendu : <code>sku;titre;prix_achat;stock;disponibilite</code>. Prix d&apos;achat HT en euros. Les prix de vente ne sont modifiés que si la marge automatique est activée ; sinon une alerte est créée.</p>
              <AdminForm action={supplierCsvImportAction} submit="Importer"><input type="hidden" name="supplierId" value={s.id} /><input type="file" name="file" accept=".csv,text/csv" required className="text-sm" /></AdminForm>
            </Panel>
          )}
          {canWrite && (
            <Panel title="Synchronisation API">
              <AdminForm action={supplierSyncAction} submit="Lancer">
                <input type="hidden" name="supplierId" value={s.id} />
                <Select name="kind" defaultValue="prices"><option value="prices">Prix</option><option value="stock">Stocks</option><option value="import">Catalogue complet</option></Select>
              </AdminForm>
            </Panel>
          )}
          <Panel title="Dernières synchronisations">
            {syncs.length === 0 && <p className="text-sm text-muted">Aucune.</p>}
            <ul className="space-y-2 text-sm">{syncs.map((y) => <li key={y.id}><strong>{y.status}</strong> · {y.kind} · {formatDate(y.createdAt, true)}<br /><span className="text-xs text-muted">{y.itemsUpdated}/{y.itemsTotal} mis à jour · {y.priceChanges} prix modifiés · {y.errorsCount} erreur(s){y.errorMessage ? ` · ${y.errorMessage}` : ""}</span></li>)}</ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
