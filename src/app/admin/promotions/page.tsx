import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select, Checkbox, Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { savePromotionAction } from "@/actions/admin-ops";
import { centsToInput } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { Promotion } from "@prisma/client";

export const metadata = { title: "Promotions" };
const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function PromoFields({ p, products, selected }: { p?: Promotion; products: { id: string; name: string }[]; selected?: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Nom" className="sm:col-span-3"><Input name="name" defaultValue={p?.name} required /></Field>
      <Field label="Type"><Select name="type" defaultValue={p?.type ?? "PERCENT"}><option value="PERCENT">Pourcentage</option><option value="FIXED">Montant (€)</option></Select></Field>
      <Field label="Valeur"><Input name="value" defaultValue={p ? (p.type === "PERCENT" ? String(p.value / 100) : centsToInput(p.value)) : ""} required /></Field>
      <div className="flex items-end"><Checkbox name="isActive" label="Active" defaultChecked={p?.isActive ?? true} /></div>
      <Field label="Début *"><Input name="startsAt" type="datetime-local" defaultValue={dt(p?.startsAt ?? null)} required /></Field>
      <Field label="Fin"><Input name="endsAt" type="datetime-local" defaultValue={dt(p?.endsAt ?? null)} /></Field>
      <Field label="Description" className="sm:col-span-3"><Textarea name="description" defaultValue={p?.description ?? ""} className="min-h-16" /></Field>
      <fieldset className="sm:col-span-3"><legend className="mb-1 text-sm font-medium">Produits concernés</legend>
        <div className="grid max-h-48 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
          {products.length === 0 && <p className="text-xs text-muted">Aucun produit.</p>}
          {products.map((x) => <Checkbox key={x.id} name="productIds" value={x.id} label={x.name} defaultChecked={selected?.includes(x.id)} />)}
        </div>
      </fieldset>
    </div>
  );
}

export default async function Promotions() {
  await requireStaff("promotion:write");
  const [rows, products] = await Promise.all([
    db.promotion.findMany({ orderBy: { startsAt: "desc" }, include: { products: true, history: { orderBy: { createdAt: "desc" }, take: 5 } } }),
    db.product.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <AdminTitle title="Promotions" description="Campagnes datées et historisées." />
      <Alert tone="info">Le prix promotionnel affiché provient du champ « prix promo » de chaque fiche produit. Un prix barré doit correspondre au prix le plus bas pratiqué dans les 30 jours précédents (art. L112-1-1 du Code de la consommation).</Alert>
      <Panel title="Nouvelle promotion" className="my-6"><AdminForm action={savePromotionAction} submit="Créer"><PromoFields products={products} /></AdminForm></Panel>
      <div className="space-y-3">
        {rows.map((p) => (
          <details key={p.id} className="rounded-2xl border border-line bg-white">
            <summary className="flex cursor-pointer justify-between p-4 text-sm"><span className="font-semibold">{p.name}</span><span className="text-muted">{formatDate(p.startsAt)} → {p.endsAt ? formatDate(p.endsAt) : "sans fin"} · {p.products.length} produit(s) · {p.isActive ? "active" : "inactive"}</span></summary>
            <div className="space-y-3 border-t border-line p-4">
              <AdminForm action={savePromotionAction} submit="Enregistrer"><PromoFields p={p} products={products} selected={p.products.map((x) => x.productId)} /></AdminForm>
              <ul className="text-xs text-muted">{p.history.map((h) => <li key={h.id}>{formatDate(h.createdAt, true)} · {h.action}</li>)}</ul>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
