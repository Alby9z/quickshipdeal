import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Badge, Alert } from "@/components/ui/misc";
import { Input, Select, Textarea } from "@/components/ui/form";
import { formatEuros, centsToInput } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "@/modules/orders/status";
import { WEBHOOK_ONLY_STATUSES } from "@/modules/orders/service";
import { SHIPMENT_STATUS_LABELS } from "@/modules/shipping/service";
import { ORDER_TONE, PAYMENT_LABELS, REFUND_LABELS } from "@/components/admin/status";
import { orderStatusAction, orderNoteAction, supplierRefAction, retrySupplierOrderAction, shipmentAction, trackingEventAction, refundAction } from "@/actions/admin-ops";
import { integrationStatus } from "@/lib/env";
import { activeTrackingAdapter } from "@/integrations/tracking";

export const metadata = { title: "Commande" };
type Addr = { firstName?: string; lastName?: string; company?: string; line1?: string; line2?: string; postalCode?: string; city?: string; country?: string; phone?: string };

function AddressBlock({ a }: { a: Addr }) {
  return <address className="text-sm not-italic leading-6">{a.firstName} {a.lastName}<br />{a.company && <>{a.company}<br /></>}{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.postalCode} {a.city} ({a.country}){a.phone && <><br />{a.phone}</>}</address>;
}

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("order:read");
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { supplier: { select: { name: true } } } }, payments: true, refunds: { orderBy: { createdAt: "desc" } }, invoices: { orderBy: { issuedAt: "asc" } },
      shipments: { include: { events: { orderBy: { occurredAt: "desc" } }, carrier: true } }, events: { orderBy: { createdAt: "desc" } }, returnRequests: true, user: { select: { id: true, name: true } },
    },
  });
  if (!o) notFound();
  const carriers = await db.carrier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const canWrite = hasPermission(user, "order:write");
  const canRefund = hasPermission(user, "order:refund");
  const nextStatuses = ORDER_TRANSITIONS[o.status].filter((s) => !WEBHOOK_ONLY_STATUSES.includes(s));
  const pendingSupplier = o.items.filter((i) => !i.supplierOrderRef);
  const refundable = o.totalCents - o.refundedCents - o.refunds.filter((r) => r.status === "PENDING").reduce((a, r) => a + r.amountCents, 0);
  const isPaid = ["SUCCEEDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(o.paymentStatus);
  const margin = o.totalCents - o.shippingCents - o.taxCents - o.costTotalCents;

  return (
    <>
      <AdminTitle title={`Commande ${o.number}`} description={<>Passée le {formatDate(o.createdAt, true)} · <Badge tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge> · Paiement : {PAYMENT_LABELS[o.paymentStatus]}</>} actions={<Link href="/admin/commandes" className="text-sm text-muted">← Toutes les commandes</Link>} />
      {o.paymentStatus === "DISPUTED" && <Alert tone="error" title="Litige bancaire ouvert">Répondez au litige depuis le tableau de bord Stripe.</Alert>}
      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Articles">
            <Table head={["Produit", "Qté", "Prix unitaire", "Total", "Fournisseur", "Réf. commande fournisseur"]}>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <Td><p className="font-medium">{i.productName}{i.variantName ? ` · ${i.variantName}` : ""}</p><p className="text-xs text-muted">{i.sku}{i.supplierReference ? ` · réf. fournisseur ${i.supplierReference}` : ""}</p></Td>
                  <Td>{i.quantity}</Td><Td>{formatEuros(i.unitPriceCents)}</Td><Td>{formatEuros(i.lineTotalCents)}</Td>
                  <Td>{i.supplier?.name ?? "—"}</Td>
                  <Td>{i.supplierOrderRef ?? <span className="text-amber-700">{i.supplierStatus === "A_TRANSMETTRE_MANUELLEMENT" ? "À transmettre manuellement" : i.supplierStatus ?? "Non transmise"}</span>}</Td>
                </tr>
              ))}
            </Table>
            <dl className="mt-4 grid max-w-sm gap-1 text-sm sm:ml-auto">
              <Row l="Sous-total" v={formatEuros(o.subtotalCents)} />
              {o.discountCents > 0 && <Row l={`Remise${o.couponCode ? ` (${o.couponCode})` : ""}`} v={`− ${formatEuros(o.discountCents)}`} />}
              <Row l={`Livraison${o.shippingMethod ? ` (${o.shippingMethod})` : ""}`} v={formatEuros(o.shippingCents)} />
              <Row l="Dont TVA" v={formatEuros(o.taxCents)} />
              <Row l="Total payé" v={formatEuros(o.totalCents)} strong />
              {o.refundedCents > 0 && <Row l="Remboursé" v={`− ${formatEuros(o.refundedCents)}`} />}
              {hasPermission(user, "analytics:read") && <Row l="Marge estimée (HT, hors frais Stripe)" v={formatEuros(margin)} />}
            </dl>
          </Panel>

          {canWrite && pendingSupplier.length > 0 && isPaid && (
            <Panel title="Commande fournisseur">
              <p className="mb-3 text-sm text-muted">Passez la commande chez le fournisseur, puis enregistrez ici la référence réellement obtenue.</p>
              <AdminForm action={supplierRefAction} submit="Enregistrer la référence">
                <input type="hidden" name="orderId" value={o.id} />
                {pendingSupplier.map((i) => <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="itemIds" value={i.id} defaultChecked className="accent-orange-500" />{i.productName} × {i.quantity}</label>)}
                <Input name="supplierOrderRef" placeholder="Référence de commande chez le fournisseur" required />
              </AdminForm>
              <AdminForm action={retrySupplierOrderAction} submit="Relancer la transmission automatique" variant="outline" className="mt-3"><input type="hidden" name="orderId" value={o.id} /></AdminForm>
            </Panel>
          )}

          <Panel title="Expéditions et suivi">
            {o.shipments.length === 0 && <p className="text-sm text-muted">Aucune expédition enregistrée.</p>}
            {o.shipments.map((s) => (
              <div key={s.id} className="mb-4 rounded-xl border border-line p-4">
                <p className="font-semibold">{s.carrier?.name ?? s.carrierName} · {s.trackingNumber} <Badge tone="orange">{SHIPMENT_STATUS_LABELS[s.status]}</Badge></p>
                {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-electric-600">Suivre sur le site du transporteur</a>}
                <ul className="mt-3 space-y-1 text-sm">{s.events.map((e) => <li key={e.id}><span className="text-muted">{formatDate(e.occurredAt, true)}</span> · {e.description}{e.location ? ` (${e.location})` : ""} <span className="text-xs text-muted">[{e.source}]</span></li>)}</ul>
                {canWrite && (
                  <AdminForm action={trackingEventAction} submit="Ajouter l'événement" inline className="mt-3">
                    <input type="hidden" name="shipmentId" value={s.id} /><input type="hidden" name="orderId" value={o.id} />
                    <Input name="occurredAt" type="datetime-local" className="h-9 w-48" aria-label="Date" />
                    <Select name="status" defaultValue="IN_TRANSIT" className="h-9 w-44" aria-label="Statut">{Object.entries(SHIPMENT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
                    <Input name="description" placeholder="Événement indiqué par le transporteur" className="h-9 min-w-56 flex-1" required />
                    <Input name="location" placeholder="Lieu" className="h-9 w-32" />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="notify" defaultChecked /> Notifier</label>
                  </AdminForm>
                )}
              </div>
            ))}
            {canWrite && isPaid && (
              <AdminForm action={shipmentAction} submit="Enregistrer l'expédition" inline>
                <input type="hidden" name="orderId" value={o.id} />
                <Select name="carrierId" required className="h-9 w-44" aria-label="Transporteur">{carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                <Input name="trackingNumber" placeholder="Numéro de suivi réel" required className="h-9 w-56" />
                <Input name="shippedAt" type="datetime-local" className="h-9 w-48" aria-label="Date d'expédition" />
              </AdminForm>
            )}
            {!activeTrackingAdapter() && <p className="mt-3 text-xs text-muted">Suivi automatique (17TRACK / AfterShip) non configuré : les événements sont saisis manuellement depuis le site du transporteur.</p>}
          </Panel>

          <Panel title="Historique">
            <ul className="space-y-2 text-sm">
              {o.events.map((e) => <li key={e.id} className="flex gap-3"><span className="w-36 shrink-0 text-muted">{formatDate(e.createdAt, true)}</span><span>{e.fromStatus !== e.toStatus && <strong>{ORDER_STATUS_LABELS[e.toStatus]}. </strong>}{e.message}{!e.isPublic && <Badge className="ml-2">interne</Badge>}</span></li>)}
            </ul>
            {canWrite && (
              <AdminForm action={orderNoteAction} submit="Ajouter une note interne" inline className="mt-4">
                <input type="hidden" name="orderId" value={o.id} /><Input name="message" placeholder="Note visible uniquement par l'équipe" className="h-9 flex-1" required />
              </AdminForm>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {canWrite && nextStatuses.length > 0 && (
            <Panel title="Changer le statut">
              <AdminForm action={orderStatusAction} submit="Appliquer">
                <input type="hidden" name="orderId" value={o.id} />
                <Select name="status">{nextStatuses.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}</Select>
                <Textarea name="message" placeholder="Message au client (facultatif)" className="min-h-16" />
              </AdminForm>
              <p className="mt-2 text-xs text-muted">Les statuts « payée » et « remboursée » sont posés uniquement par Stripe.</p>
            </Panel>
          )}
          <Panel title="Client">
            <p className="text-sm">{o.email}</p>
            {o.user ? <Link href={`/admin/clients/${o.user.id}`} className="text-sm text-electric-600">Fiche client : {o.user.name}</Link> : <p className="text-xs text-muted">Commande invité</p>}
            {o.customerNote && <p className="mt-2 rounded-lg bg-surface p-2 text-sm">« {o.customerNote} »</p>}
          </Panel>
          <Panel title="Livraison"><AddressBlock a={o.shippingAddress as Addr} /></Panel>
          <Panel title="Facturation"><AddressBlock a={o.billingAddress as Addr} /></Panel>
          <Panel title="Paiements">
            {o.payments.length === 0 && <p className="text-sm text-muted">Aucun paiement confirmé.</p>}
            {o.payments.map((p) => <p key={p.id} className="text-sm">{formatEuros(p.amountCents)} · {PAYMENT_LABELS[p.status]} · {p.paymentMethodType ?? "carte"}{p.failureMessage ? ` · ${p.failureMessage}` : ""}</p>)}
            {o.stripePaymentIntentId && <p className="mt-1 break-all text-xs text-muted">Stripe : {o.stripePaymentIntentId}</p>}
          </Panel>
          <Panel title="Remboursements">
            {o.refunds.map((r) => <p key={r.id} className="text-sm">{formatDate(r.createdAt)} · {formatEuros(r.amountCents)} · {REFUND_LABELS[r.status]}{r.reason ? ` · ${r.reason}` : ""}</p>)}
            {canRefund && isPaid && refundable > 0 && (
              integrationStatus().stripe ? (
                <AdminForm action={refundAction} submit="Rembourser via Stripe" variant="danger" className="mt-3" confirm="Confirmer le remboursement ? Il sera envoyé à Stripe.">
                  <input type="hidden" name="orderId" value={o.id} />
                  <Input name="amount" defaultValue={centsToInput(refundable)} inputMode="decimal" aria-label="Montant" />
                  <Input name="reason" placeholder="Motif" />
                </AdminForm>
              ) : <p className="text-xs text-amber-700">Stripe non configuré : remboursement impossible depuis le site.</p>
            )}
          </Panel>
          <Panel title="Factures">
            {o.invoices.length === 0 && <p className="text-sm text-muted">Facture émise automatiquement après paiement.</p>}
            {o.invoices.map((i) => <p key={i.id} className="text-sm"><Link className="text-electric-600" href={`/admin/factures/${i.id}`}>{i.kind === "credit_note" ? "Avoir" : "Facture"} {i.number}</Link> · {formatEuros(i.totalCents)}</p>)}
          </Panel>
          {o.returnRequests.length > 0 && <Panel title="Retours">{o.returnRequests.map((r) => <Link key={r.id} href={`/admin/retours/${r.id}`} className="block text-sm text-electric-600">{r.number}</Link>)}</Panel>}
        </div>
      </div>
    </>
  );
}

function Row({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-1 font-bold" : ""}`}><dt className="text-muted">{l}</dt><dd>{v}</dd></div>;
}
