import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td, Stat } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Badge } from "@/components/ui/misc";
import { Input, Textarea } from "@/components/ui/form";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, PAID_STATUSES } from "@/modules/orders/status";
import { ORDER_TONE } from "@/components/admin/status";
import { customerBlockAction, customerNoteAction, customerAnonymizeAction } from "@/actions/admin-ops";

export const metadata = { title: "Client" };

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("customer:read");
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { profile: true, addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 50 }, supportTickets: { orderBy: { createdAt: "desc" }, take: 10 }, returnRequests: { orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!u) notFound();
  const paid = u.orders.filter((o) => PAID_STATUSES.includes(o.status));
  const spent = paid.reduce((a, o) => a + o.totalCents - o.refundedCents, 0);
  const canWrite = hasPermission(user, "customer:write");
  return (
    <>
      <AdminTitle title={u.name} description={<>{u.email} · inscrit le {formatDate(u.createdAt)} {u.isBlocked && <Badge tone="red">Bloqué</Badge>} {u.anonymizedAt && <Badge>Anonymisé</Badge>}</>} actions={<Link href="/admin/clients" className="text-sm text-muted">← Clients</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Commandes payées" value={paid.length} />
        <Stat label="Montant net dépensé" value={formatEuros(spent)} tone="green" />
        <Stat label="Panier moyen" value={paid.length ? formatEuros(Math.round(spent / paid.length)) : "—"} tone="orange" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Commandes">
            <Table head={["Commande", "Date", "Total", "Statut"]} empty={u.orders.length === 0}>
              {u.orders.map((o) => <tr key={o.id}><Td><Link href={`/admin/commandes/${o.id}`} className="font-medium hover:text-electric-600">{o.number}</Link></Td><Td>{formatDate(o.createdAt)}</Td><Td>{formatEuros(o.totalCents)}</Td><Td><Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></Td></tr>)}
            </Table>
          </Panel>
          <Panel title="Adresses">
            {u.addresses.length === 0 ? <p className="text-sm text-muted">Aucune adresse enregistrée.</p> : <ul className="grid gap-3 sm:grid-cols-2">{u.addresses.map((a) => <li key={a.id} className="rounded-xl border border-line p-3 text-sm">{a.firstName} {a.lastName}<br />{a.line1}<br />{a.postalCode} {a.city} ({a.country})</li>)}</ul>}
          </Panel>
          <Panel title="Support et retours">
            <ul className="space-y-1 text-sm">
              {u.supportTickets.map((t) => <li key={t.id}><Link className="text-electric-600" href={`/admin/support/${t.id}`}>{t.number}</Link> · {t.subject}</li>)}
              {u.returnRequests.map((r) => <li key={r.id}><Link className="text-electric-600" href={`/admin/retours/${r.id}`}>{r.number}</Link> · {r.reason}</li>)}
              {!u.supportTickets.length && !u.returnRequests.length && <li className="text-muted">Aucun échange.</li>}
            </ul>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Profil">
            <p className="text-sm">{u.profile?.firstName} {u.profile?.lastName}</p>
            <p className="text-sm">{u.profile?.phone ?? "Téléphone non renseigné"}</p>
            <p className="mt-2 text-xs text-muted">Newsletter : {u.profile?.marketingOptIn ? `oui depuis le ${formatDate(u.profile.marketingOptInAt)}` : "non"}</p>
          </Panel>
          {canWrite && (
            <>
              <Panel title="Note interne"><AdminForm action={customerNoteAction} submit="Enregistrer"><input type="hidden" name="userId" value={u.id} /><Textarea name="notes" defaultValue={u.profile?.notesInternal ?? ""} /></AdminForm></Panel>
              <Panel title="RGPD">
                <a href={`/api/admin/clients/${u.id}/export`} className="text-sm font-semibold text-electric-600">Exporter les données (JSON)</a>
                <AdminForm action={customerBlockAction} submit={u.isBlocked ? "Débloquer le compte" : "Bloquer le compte"} variant="outline" className="mt-4"><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="block" value={u.isBlocked ? "false" : "true"} /></AdminForm>
                {!u.anonymizedAt && (
                  <AdminForm action={customerAnonymizeAction} submit="Anonymiser définitivement" variant="danger" className="mt-4" confirm="Action irréversible. Continuer ?">
                    <input type="hidden" name="userId" value={u.id} />
                    <p className="text-xs text-muted">Supprime les données personnelles ; les factures et commandes sont conservées (obligations comptables).</p>
                    <Input name="confirm" placeholder="Tapez ANONYMISER" />
                  </AdminForm>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}
