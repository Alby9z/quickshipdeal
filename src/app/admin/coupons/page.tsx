import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select, Checkbox, Field } from "@/components/ui/form";
import { saveCouponAction } from "@/actions/admin-ops";
import { centsToInput } from "@/lib/money";
import type { Coupon } from "@prisma/client";

export const metadata = { title: "Coupons" };
const dt = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const valueInput = (c?: Coupon) => (!c ? "" : c.type === "PERCENT" ? String(c.value / 100) : c.type === "FIXED" ? centsToInput(c.value) : "");

function CouponFields({ c }: { c?: Coupon }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Code"><Input name="code" defaultValue={c?.code} required className="uppercase" /></Field>
      <Field label="Type"><Select name="type" defaultValue={c?.type ?? "PERCENT"}><option value="PERCENT">Pourcentage</option><option value="FIXED">Montant (€)</option><option value="FREE_SHIPPING">Livraison offerte</option></Select></Field>
      <Field label="Valeur"><Input name="value" defaultValue={valueInput(c)} placeholder="10 ou 5,00" /></Field>
      <Field label="Panier minimum (€)"><Input name="minSubtotal" defaultValue={centsToInput(c?.minSubtotalCents ?? null)} /></Field>
      <Field label="Utilisations max."><Input name="maxUses" type="number" min={0} defaultValue={c?.maxUses ?? ""} /></Field>
      <Field label="Par client"><Input name="maxUsesPerCustomer" type="number" min={0} defaultValue={c?.maxUsesPerCustomer ?? ""} /></Field>
      <Field label="Début"><Input name="startsAt" type="datetime-local" defaultValue={dt(c?.startsAt ?? null)} /></Field>
      <Field label="Fin"><Input name="endsAt" type="datetime-local" defaultValue={dt(c?.endsAt ?? null)} /></Field>
      <Field label="Description interne" className="sm:col-span-3"><Input name="description" defaultValue={c?.description ?? ""} /></Field>
      <div className="flex items-end"><Checkbox name="isActive" label="Actif" defaultChecked={c?.isActive ?? true} /></div>
    </div>
  );
}

export default async function Coupons() {
  await requireStaff("promotion:write");
  const rows = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <AdminTitle title="Coupons" description="Codes de réduction saisis au panier. Le nombre d'utilisations n'est incrémenté qu'après paiement confirmé." />
      <Panel title="Nouveau coupon" className="mb-6"><AdminForm action={saveCouponAction} submit="Créer"><CouponFields /></AdminForm></Panel>
      <div className="space-y-3">
        {rows.map((c) => (
          <details key={c.id} className="rounded-2xl border border-line bg-white">
            <summary className="flex cursor-pointer justify-between p-4 text-sm"><span className="font-mono font-bold">{c.code}</span><span className="text-muted">{c.usedCount} utilisation(s){c.maxUses ? ` / ${c.maxUses}` : ""} · {c.isActive ? "actif" : "inactif"}</span></summary>
            <div className="border-t border-line p-4"><AdminForm action={saveCouponAction} submit="Enregistrer"><CouponFields c={c} /></AdminForm></div>
          </details>
        ))}
      </div>
    </>
  );
}
