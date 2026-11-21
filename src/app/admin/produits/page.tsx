import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { formatEuros, marginRateBps } from "@/lib/money";
import { AVAILABILITY_LABELS } from "@/components/shop/product-card";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Produits" };
const PER = 25;
const STATUS = { DRAFT: ["Brouillon", "neutral"], PUBLISHED: ["Publié", "green"], ARCHIVED: ["Archivé", "amber"] } as const;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requireStaff("product:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }, { supplierReference: { contains: sp.q, mode: "insensitive" } }];
  if (sp.status === "DRAFT" || sp.status === "PUBLISHED" || sp.status === "ARCHIVED") where.status = sp.status;
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { images: { take: 1, orderBy: { position: "asc" } }, inventory: true, primaryCategory: { select: { name: true } }, supplier: { select: { name: true } } } }),
    db.product.count({ where }),
  ]);
  const canMargin = hasPermission(user, "analytics:read");
  return (
    <>
      <AdminTitle title="Produits" description={`${total} produit(s)`} actions={hasPermission(user, "product:write") && <Button asChild><Link href="/admin/produits/nouveau">Nouveau produit</Link></Button>} />
      <SearchBar placeholder="Nom, SKU, référence fournisseur" defaultValue={sp.q} extra={
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-xl border border-line bg-white px-3 text-sm" aria-label="Statut">
          <option value="">Tous les statuts</option><option value="PUBLISHED">Publiés</option><option value="DRAFT">Brouillons</option><option value="ARCHIVED">Archivés</option>
        </select>} />
      <Table head={["", "Produit", "Statut", "Prix TTC", canMargin ? "Marge" : "", "Stock", "Disponibilité", "Ventes"]} empty={rows.length === 0}>
        {rows.map((p) => {
          const [label, tone] = STATUS[p.status];
          const avail = AVAILABILITY_LABELS[p.availability];
          const stock = p.inventory ? p.inventory.quantity - p.inventory.reserved : null;
          return (
            <tr key={p.id} className="hover:bg-surface/60">
              <Td>{p.images[0] ? <img src={p.images[0].url} alt="" className="size-10 rounded-lg object-cover" /> : <div className="size-10 rounded-lg bg-surface" />}</Td>
              <Td><Link href={`/admin/produits/${p.id}`} className="font-semibold hover:text-electric-600">{p.name}</Link><p className="text-xs text-muted">{p.sku}{p.primaryCategory ? ` · ${p.primaryCategory.name}` : ""}{p.supplier ? ` · ${p.supplier.name}` : ""}</p></Td>
              <Td><Badge tone={tone}>{label}</Badge></Td>
              <Td className="whitespace-nowrap">{formatEuros(p.salePriceCents ?? p.priceCents)}{p.salePriceCents != null && <span className="ml-1 text-xs text-muted line-through">{formatEuros(p.priceCents)}</span>}</Td>
              <Td>{canMargin ? `${(marginRateBps(p.salePriceCents ?? p.priceCents, p.costPriceCents, p.vatRateBps) / 100).toFixed(1)} %` : ""}</Td>
              <Td className={stock != null && p.inventory && stock <= p.inventory.lowStockThreshold ? "font-semibold text-red-600" : ""}>{p.trackInventory ? stock ?? 0 : "non suivi"}</Td>
              <Td><Badge tone={avail.tone}>{avail.label}</Badge></Td>
              <Td>{p.salesCount}</Td>
            </tr>
          );
        })}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/produits?q=${encodeURIComponent(sp.q ?? "")}&status=${sp.status ?? ""}`} />
    </>
  );
}
