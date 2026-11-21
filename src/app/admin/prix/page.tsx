import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input } from "@/components/ui/form";
import { centsToInput, formatEuros, marginRateBps } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { quickPriceAction } from "@/actions/admin-products";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Prix" };
const PER = 30;

export default async function Prices({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("price:write");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = { deletedAt: null, ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }] } : {}) };
  const [rows, total, history] = await Promise.all([
    db.product.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * PER, take: PER }),
    db.product.count({ where }),
    db.priceHistory.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { product: { select: { name: true, id: true } } } }),
  ]);
  return (
    <>
      <AdminTitle title="Prix et marges" description="Prix TTC affichés, prix d'achat HT et marge nette HT. Chaque modification est historisée." />
      <SearchBar placeholder="Nom ou SKU" defaultValue={sp.q} />
      <Table head={["Produit", "Marge", "Prix TTC / achat HT / promo TTC"]} empty={rows.length === 0}>
        {rows.map((p) => {
          const m = marginRateBps(p.salePriceCents ?? p.priceCents, p.costPriceCents, p.vatRateBps);
          return (
            <tr key={p.id}>
              <Td><Link href={`/admin/produits/${p.id}`} className="font-medium hover:text-electric-600">{p.name}</Link><p className="text-xs text-muted">{p.sku} · TVA {p.vatRateBps / 100} %</p></Td>
              <Td className={m < 1500 ? "font-semibold text-red-600" : ""}>{(m / 100).toFixed(1)} %</Td>
              <Td>
                <AdminForm action={quickPriceAction} submit="OK" inline>
                  <input type="hidden" name="id" value={p.id} />
                  <Input name="price" defaultValue={centsToInput(p.priceCents)} className="h-9 w-24" aria-label="Prix TTC" />
                  <Input name="cost" defaultValue={centsToInput(p.costPriceCents)} className="h-9 w-24" aria-label="Prix d'achat HT" />
                  <Input name="sale" defaultValue={centsToInput(p.salePriceCents)} placeholder="promo" className="h-9 w-24" aria-label="Prix promo TTC" />
                </AdminForm>
              </Td>
            </tr>
          );
        })}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/prix?q=${encodeURIComponent(sp.q ?? "")}`} />
      <Panel title="Derniers changements de prix" className="mt-6">
        <Table head={["Date", "Produit", "Champ", "Ancien", "Nouveau", "Source"]} empty={history.length === 0}>
          {history.map((h) => <tr key={h.id}><Td>{formatDate(h.createdAt, true)}</Td><Td>{h.product.name}</Td><Td>{h.field}</Td><Td>{h.oldValueCents == null ? "—" : formatEuros(h.oldValueCents)}</Td><Td>{h.newValueCents == null ? "—" : formatEuros(h.newValueCents)}</Td><Td>{h.source}</Td></tr>)}
        </Table>
      </Panel>
    </>
  );
}
