import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select, Checkbox } from "@/components/ui/form";
import { saveCarrierAction, saveShippingRateAction } from "@/actions/admin-ops";
import { centsToInput } from "@/lib/money";
import type { Carrier, ShippingRate } from "@prisma/client";

export const metadata = { title: "Transporteurs et tarifs" };

function CarrierRow({ c }: { c?: Carrier }) {
  return (
    <AdminForm action={saveCarrierAction} submit={c ? "Enregistrer" : "Ajouter"} inline className="rounded-xl border border-line p-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Input name="name" defaultValue={c?.name} placeholder="Nom" className="h-9 w-40" required />
      <Input name="code" defaultValue={c?.code} placeholder="code" className="h-9 w-28" required />
      <Input name="trackingUrlTemplate" defaultValue={c?.trackingUrlTemplate ?? ""} placeholder="https://…{tracking}" className="h-9 min-w-64 flex-1" />
      <Checkbox name="isActive" label="Actif" defaultChecked={c?.isActive ?? true} />
    </AdminForm>
  );
}

function RateRow({ r, carriers }: { r?: ShippingRate; carriers: Carrier[] }) {
  return (
    <AdminForm action={saveShippingRateAction} submit={r ? "Enregistrer" : "Ajouter"} inline className="rounded-xl border border-line p-3">
      {r && <input type="hidden" name="id" value={r.id} />}
      <Input name="name" defaultValue={r?.name} placeholder="Nom affiché (ex. Livraison standard)" className="h-9 min-w-52 flex-1" required />
      <Select name="carrierId" defaultValue={r?.carrierId ?? ""} className="h-9 w-36" aria-label="Transporteur"><option value="">Transporteur</option>{carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      <Input name="countries" defaultValue={r?.countries.join(", ") ?? "FR"} className="h-9 w-28" aria-label="Pays" />
      <Input name="price" defaultValue={centsToInput(r?.priceCents ?? null)} placeholder="Prix TTC" className="h-9 w-24" required />
      <Input name="freeAbove" defaultValue={centsToInput(r?.freeAboveCents ?? null)} placeholder="Gratuit dès" className="h-9 w-28" />
      <Input name="minDays" type="number" defaultValue={r?.minDays ?? ""} placeholder="j min" className="h-9 w-20" />
      <Input name="maxDays" type="number" defaultValue={r?.maxDays ?? ""} placeholder="j max" className="h-9 w-20" />
      <Input name="position" type="number" defaultValue={r?.position ?? 0} className="h-9 w-16" aria-label="Ordre" />
      <Checkbox name="isActive" label="Actif" defaultChecked={r?.isActive ?? true} />
    </AdminForm>
  );
}

export default async function CarriersPage() {
  await requireStaff("settings:write");
  const [carriers, rates] = await Promise.all([db.carrier.findMany({ orderBy: { name: "asc" } }), db.shippingRate.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] })]);
  return (
    <>
      <AdminTitle title="Transporteurs et tarifs de livraison" description="Les tarifs actifs sont proposés au paiement. Indiquez des délais réalistes, cumulant préparation fournisseur et transport." />
      <Panel title="Tarifs de livraison" className="mb-6">
        <div className="space-y-2">
          {rates.length === 0 && <p className="text-sm text-amber-700">Aucun tarif : le paiement sera bloqué tant qu&apos;aucun mode de livraison n&apos;est actif.</p>}
          {rates.map((r) => <RateRow key={r.id} r={r} carriers={carriers} />)}
          <RateRow carriers={carriers} />
        </div>
      </Panel>
      <Panel title="Transporteurs">
        <div className="space-y-2">{carriers.map((c) => <CarrierRow key={c.id} c={c} />)}<CarrierRow /></div>
      </Panel>
    </>
  );
}
