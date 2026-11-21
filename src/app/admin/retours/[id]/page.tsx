import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Select, Textarea, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { returnStatusAction, refundAction } from "@/actions/admin-ops";
import { RETURN_LABELS } from "@/components/admin/status";
import { formatDate } from "@/lib/utils";
import { centsToInput } from "@/lib/money";
import { integrationStatus } from "@/lib/env";

export const metadata = { title: "Retour" };

export default async function ReturnDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("return:write");
  const { id } = await params;
  const r = await db.returnRequest.findUnique({ where: { id }, include: { order: { include: { items: true } } } });
  if (!r) notFound();
  const lines = (r.items as { orderItemId: string; quantity: number }[]).map((l) => ({ ...l, item: r.order.items.find((i) => i.id === l.orderItemId) }));
  const suggested = lines.reduce((a, l) => a + (l.item ? l.item.unitPriceCents * l.quantity : 0), 0);
  return (
    <>
      <AdminTitle title={`Retour ${r.number}`} description={<>Commande <Link className="text-electric-600" href={`/admin/commandes/${r.orderId}`}>{r.order.number}</Link> · {formatDate(r.createdAt, true)} · <Badge>{RETURN_LABELS[r.status]}</Badge> {r.isWithdrawal && <Badge tone="orange">Droit de rétractation</Badge>}</>} actions={<Link href="/admin/retours" className="text-sm text-muted">← Retours</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Demande">
            <p className="text-sm"><strong>Motif :</strong> {r.reason}</p>
            {r.details && <p className="mt-2 whitespace-pre-line text-sm">{r.details}</p>}
            <ul className="mt-4 space-y-1 text-sm">{lines.map((l) => <li key={l.orderItemId}>{l.item?.productName ?? "Article"} × {l.quantity}</li>)}</ul>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Traitement">
            <AdminForm action={returnStatusAction} submit="Enregistrer">
              <input type="hidden" name="id" value={r.id} />
              <Select name="status" defaultValue={r.status}>{Object.entries(RETURN_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              <Textarea name="instructions" placeholder="Instructions de retour envoyées au client si accepté (adresse de retour réelle, délai)" className="min-h-20" />
              <Textarea name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="Note interne" className="min-h-16" />
            </AdminForm>
          </Panel>
          {hasPermission(user, "order:refund") && integrationStatus().stripe && (
            <Panel title="Rembourser">
              <AdminForm action={refundAction} submit="Rembourser via Stripe" variant="danger" confirm="Confirmer le remboursement ?">
                <input type="hidden" name="orderId" value={r.orderId} /><input type="hidden" name="returnRequestId" value={r.id} />
                <Input name="amount" defaultValue={centsToInput(suggested)} aria-label="Montant" />
                <Input name="reason" defaultValue={`Retour ${r.number}`} />
              </AdminForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
