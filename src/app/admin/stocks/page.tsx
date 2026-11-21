import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select } from "@/components/ui/form";
import { stockAction } from "@/actions/admin-products";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Stocks" };
const PER = 30;

export default async function Stocks({ searchParams }: { searchParams: Promise<{ q?: string; low?: string; page?: string }> }) {
  await requireStaff("inventory:write");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = { deletedAt: null, ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }] } : {}), ...(sp.low ? { availability: { in: ["LOW_STOCK", "OUT_OF_STOCK"] } } : {}) };
  const [rows, total] = await Promise.all([db.product.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PER, take: PER, include: { inventory: true } }), db.product.count({ where })]);
  return (
    <>
      <AdminTitle title="Stocks" description="Le stock réservé correspond aux paiements en cours ; il est libéré si le paiement échoue ou expire." />
      <SearchBar placeholder="Nom ou SKU" defaultValue={sp.q} extra={<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={!!sp.low} /> Stock faible ou rupture</label>} />
      <Table head={["Produit", "Réservé", "Stock / seuil / disponibilité"]} empty={rows.length === 0}>
        {rows.map((p) => (
          <tr key={p.id}>
            <Td><Link href={`/admin/produits/${p.id}`} className="font-medium hover:text-electric-600">{p.name}</Link><p className="text-xs text-muted">{p.sku}{p.trackInventory ? "" : " · stock non suivi"}</p></Td>
            <Td>{p.inventory?.reserved ?? 0}</Td>
            <Td>
              <AdminForm action={stockAction} submit="OK" inline>
                <input type="hidden" name="productId" value={p.id} />
                <Input name="quantity" type="number" min={0} defaultValue={p.inventory?.quantity ?? 0} className="h-9 w-24" aria-label="Quantité" />
                <Input name="threshold" type="number" min={0} defaultValue={p.inventory?.lowStockThreshold ?? 3} className="h-9 w-20" aria-label="Seuil" />
                <Select name="availability" defaultValue={p.availability} className="h-9 w-40" aria-label="Disponibilité">
                  <option value="IN_STOCK">En stock</option><option value="LOW_STOCK">Stock limité</option><option value="ON_ORDER">Sur commande</option><option value="OUT_OF_STOCK">Rupture</option><option value="DISCONTINUED">Indisponible</option>
                </Select>
              </AdminForm>
            </Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/stocks?q=${encodeURIComponent(sp.q ?? "")}${sp.low ? "&low=1" : ""}`} />
    </>
  );
}
