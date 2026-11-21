import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, Package } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, TIMELINE_STEPS } from "@/modules/orders/status";
import { SHIPMENT_STATUS_LABELS } from "@/modules/shipping/service";
import { Badge } from "@/components/ui/misc";
import type { orderDetailInclude } from "@/modules/orders/queries";

type Order = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const tone = ["CANCELLED", "DELIVERY_FAILED"].includes(status) ? "red" : status === "DELIVERED" ? "green" : status === "PENDING_PAYMENT" ? "amber" : ["REFUNDED", "PARTIALLY_REFUNDED"].includes(status) ? "neutral" : "electric";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

/** Timeline client : uniquement les événements réellement enregistrés. */
export function OrderTimeline({ order }: { order: Order }) {
  const reached = new Set(order.events.map((e) => e.toStatus));
  const offPath = !TIMELINE_STEPS.includes(order.status) && order.status !== "PENDING_PAYMENT";
  return (
    <div>
      <ol className="grid gap-3 sm:grid-cols-6">
        {TIMELINE_STEPS.map((s) => {
          const done = reached.has(s);
          return (
            <li key={s} className="flex items-center gap-2 sm:flex-col sm:text-center">
              {done ? <CheckCircle2 className="size-6 text-orange-500" aria-hidden /> : <Circle className="size-6 text-line" aria-hidden />}
              <span className={done ? "text-sm font-semibold text-night-900" : "text-sm text-muted"}>{ORDER_STATUS_LABELS[s]}</span>
            </li>
          );
        })}
      </ol>
      {offPath && <p className="mt-3 text-sm">Statut actuel : <OrderStatusBadge status={order.status} /></p>}
      <ul className="mt-6 space-y-3 border-l-2 border-line pl-5">
        {[...order.events].reverse().map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-electric-500 ring-4 ring-white" aria-hidden />
            <p className="text-sm font-semibold">{ORDER_STATUS_LABELS[e.toStatus]}</p>
            <p className="text-xs text-muted">{formatDate(e.createdAt, true)}{e.message ? ` — ${e.message}` : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderDetail({ order, invoiceBase }: { order: Order; invoiceBase: string }) {
  const ship = order.shippingAddress as Record<string, string>;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Commande {order.number}</h1>
          <p className="text-sm text-muted">Passée le {formatDate(order.createdAt, true)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <section className="rounded-2xl border border-line bg-white p-6"><h2 className="mb-4 text-lg font-bold">Suivi</h2><OrderTimeline order={order} /></section>

      {order.shipments.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Livraison</h2>
          {order.shipments.map((s) => (
            <div key={s.id} className="mb-4 rounded-xl bg-surface p-4 last:mb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold"><Package className="size-4" aria-hidden /> {s.carrierName} · <span className="font-mono">{s.trackingNumber}</span></p>
                <Badge tone={s.status === "DELIVERED" ? "green" : s.status === "FAILED" ? "red" : "electric"}>{SHIPMENT_STATUS_LABELS[s.status]}</Badge>
              </div>
              {s.shippedAt && <p className="mt-1 text-xs text-muted">Expédié le {formatDate(s.shippedAt)}{s.estimatedDeliveryAt ? ` · livraison estimée par le transporteur : ${formatDate(s.estimatedDeliveryAt)}` : ""}</p>}
              {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-electric-500">Suivre sur le site du transporteur <ExternalLink className="size-3.5" /></a>}
              {s.events.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {s.events.map((ev) => <li key={ev.id}><span className="text-muted">{formatDate(ev.occurredAt, true)}</span> — {ev.description}{ev.location ? ` (${ev.location})` : ""}</li>)}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-line bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Articles</h2>
          <ul className="divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.productName}</p><p className="text-xs text-muted">{i.variantName ? `${i.variantName} · ` : ""}Réf. {i.sku} · × {i.quantity}</p></div>
                <p className="text-sm font-semibold">{formatEuros(i.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatEuros(order.subtotalCents)}</dd></div>
            {order.discountCents > 0 && <div className="flex justify-between"><dt className="text-muted">Remise {order.couponCode}</dt><dd>−{formatEuros(order.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Livraison ({order.shippingMethod})</dt><dd>{formatEuros(order.shippingCents)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatEuros(order.totalCents)}</dd></div>
            {order.refundedCents > 0 && <div className="flex justify-between text-emerald-700"><dt>Remboursé</dt><dd>{formatEuros(order.refundedCents)}</dd></div>}
          </dl>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-6 text-sm">
            <h2 className="mb-2 font-bold">Adresse de livraison</h2>
            <p>{ship.firstName} {ship.lastName}<br />{ship.line1}{ship.line2 ? <><br />{ship.line2}</> : null}<br />{ship.postalCode} {ship.city}<br />{ship.country}</p>
          </div>
          {order.invoices.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-6 text-sm">
              <h2 className="mb-2 font-bold">Factures</h2>
              <ul className="space-y-1">{order.invoices.map((inv) => <li key={inv.id}><Link href={`${invoiceBase}/${inv.id}`} className="text-electric-500 underline">{inv.kind === "credit_note" ? "Avoir" : "Facture"} {inv.number}</Link></li>)}</ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
