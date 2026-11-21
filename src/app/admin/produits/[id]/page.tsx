import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { productFormOptions, productToForm } from "@/modules/admin/product-form-data";
import { integrationStatus } from "@/lib/env";
import { archiveProductAction } from "@/actions/admin-products";
import { db } from "@/lib/db";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Modifier le produit" };
const FIELD = { priceCents: "Prix de vente", costPriceCents: "Prix d'achat", salePriceCents: "Prix promo", compareAtCents: "Prix de référence" } as Record<string, string>;

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("product:read");
  const { id } = await params;
  const [initial, opts, history] = await Promise.all([
    productToForm(id),
    productFormOptions(),
    db.priceHistory.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  if (!initial) notFound();
  const canWrite = hasPermission(user, "product:write");
  return (
    <>
      <AdminTitle title={String(initial.name)} description={`SKU ${initial.sku}`} actions={<>
        {initial.status === "PUBLISHED" && <Button asChild variant="outline"><Link href={`/produit/${initial.slug}`} target="_blank">Voir en boutique</Link></Button>}
        {canWrite && initial.status !== "ARCHIVED" && <form action={archiveProductAction.bind(null, id)}><Button variant="danger" type="submit">Archiver</Button></form>}
      </>} />
      {canWrite ? <ProductForm initial={initial} {...opts} storageReady={integrationStatus().storage} canEditPrices={hasPermission(user, "price:write")} /> : <p className="text-sm text-muted">Lecture seule.</p>}
      <Panel title="Historique des prix" className="mt-6">
        <Table head={["Date", "Champ", "Ancien", "Nouveau", "Source", "Motif"]} empty={history.length === 0}>
          {history.map((h) => (
            <tr key={h.id}><Td>{formatDate(h.createdAt, true)}</Td><Td>{FIELD[h.field] ?? h.field}</Td><Td>{h.oldValueCents == null ? "—" : formatEuros(h.oldValueCents)}</Td><Td>{h.newValueCents == null ? "—" : formatEuros(h.newValueCents)}</Td><Td>{h.source}</Td><Td>{h.reason ?? ""}</Td></tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
