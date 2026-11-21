import type { Invoice } from "@prisma/client";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";

type Seller = Record<string, string>;
type Lines = { items: { name: string; variant?: string | null; sku: string; quantity: number; unitPriceCents: number; vatRateBps: number; lineTotalCents: number }[]; subtotalCents: number; discountCents: number; shippingCents: number; orderNumber: string };

/** Facture imprimable (Imprimer → Enregistrer en PDF). Données figées à l'émission. */
export function InvoiceView({ invoice }: { invoice: Invoice }) {
  const s = invoice.sellerSnapshot as Seller;
  const b = invoice.buyerSnapshot as { email: string; billingAddress: Record<string, string> };
  const l = invoice.linesSnapshot as Lines;
  const a = b.billingAddress;
  const credit = invoice.kind === "credit_note";
  return (
    <div className="mx-auto my-10 max-w-3xl bg-white p-8 text-sm print:my-0 print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <div className="flex justify-between gap-6">
        <div>
          <p className="text-xl font-extrabold text-night-900">{s.tradeName}</p>
          <p>{s.legalName}<br />{s.registeredAddress}<br />SIRET {s.siret}{s.rcs ? <><br />{s.rcs}</> : null}<br />{s.email}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{credit ? "AVOIR" : "FACTURE"}</p>
          <p>N° {invoice.number}<br />Date : {formatDate(invoice.issuedAt)}<br />Commande : {l.orderNumber}</p>
        </div>
      </div>
      <div className="mt-8"><p className="font-semibold">Facturé à</p><p>{a.firstName} {a.lastName}{a.company ? <><br />{a.company}</> : null}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postalCode} {a.city} — {a.country}<br />{b.email}</p></div>
      {!credit && (
        <table className="mt-8 w-full">
          <thead><tr className="border-b-2 border-night-900 text-left"><th className="py-2">Désignation</th><th>Qté</th><th>P.U.</th><th>TVA</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {l.items.map((i, idx) => (
              <tr key={idx} className="border-b border-line"><td className="py-2">{i.name}{i.variant ? ` (${i.variant})` : ""}<br /><span className="text-xs text-muted">{i.sku}</span></td><td>{i.quantity}</td><td>{formatEuros(i.unitPriceCents)}</td><td>{(i.vatRateBps / 100).toFixed(1)} %</td><td className="text-right">{formatEuros(i.lineTotalCents)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className="ml-auto mt-6 w-64 space-y-1">
        {!credit && <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatEuros(l.subtotalCents)}</dd></div>}
        {!credit && l.discountCents > 0 && <div className="flex justify-between"><dt>Remise</dt><dd>−{formatEuros(l.discountCents)}</dd></div>}
        {!credit && <div className="flex justify-between"><dt>Livraison</dt><dd>{formatEuros(l.shippingCents)}</dd></div>}
        <div className="flex justify-between border-t border-night-900 pt-1 font-bold"><dt>Total{credit ? " remboursé" : ""}</dt><dd>{formatEuros(Math.abs(invoice.totalCents))}</dd></div>
        <div className="flex justify-between text-xs"><dt>dont TVA</dt><dd>{formatEuros(Math.abs(invoice.taxCents))}</dd></div>
      </dl>
      <p className="mt-8 text-xs text-muted">{s.vatMention}. Paiement reçu par carte via Stripe.</p>
    </div>
  );
}
