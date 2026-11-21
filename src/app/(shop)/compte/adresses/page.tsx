import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/account/forms";
import { saveAddressAction } from "@/actions/customer";
import { AddressFields } from "@/components/account/address-fields";
import { DeleteAddress } from "@/components/account/delete-address";
import { Badge } from "@/components/ui/misc";

export const metadata = { title: "Mes adresses", robots: { index: false } };

export default async function Page() {
  const user = await requireUser();
  const list = await db.address.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Mes adresses</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => (
          <details key={a.id} className="rounded-2xl border border-line bg-white p-5">
            <summary className="cursor-pointer list-none">
              <p className="font-semibold">{a.firstName} {a.lastName} {a.isDefaultShipping && <Badge tone="electric">Par défaut</Badge>}</p>
              <p className="text-sm text-muted">{a.line1}, {a.postalCode} {a.city}, {a.country}</p>
              <p className="mt-2 text-xs font-semibold text-electric-500">Modifier</p>
            </summary>
            <ActionForm action={saveAddressAction} submit="Enregistrer" className="mt-4 space-y-4"><input type="hidden" name="id" value={a.id} /><AddressFields a={a} /></ActionForm>
            <div className="mt-2"><DeleteAddress id={a.id} /></div>
          </details>
        ))}
      </div>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Ajouter une adresse</h2>
        <ActionForm action={saveAddressAction} submit="Ajouter"><AddressFields /></ActionForm>
      </section>
    </div>
  );
}
