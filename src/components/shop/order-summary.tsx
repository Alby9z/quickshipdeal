import { formatEuros } from "@/lib/money";

export function TotalsTable({ t, vatMode }: { t: { subtotalCents: number; discountCents: number; shippingCents: number; taxCents: number; totalCents: number }; vatMode: string; shippingKnown?: boolean }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatEuros(t.subtotalCents)}</dd></div>
      {t.discountCents > 0 && <div className="flex justify-between text-emerald-700"><dt>Remise</dt><dd>−{formatEuros(t.discountCents)}</dd></div>}
      <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>{t.shippingCents === 0 ? "Offerte" : formatEuros(t.shippingCents)}</dd></div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold text-night-900"><dt>Total</dt><dd>{formatEuros(t.totalCents)}</dd></div>
      <p className="text-xs text-muted">
        {vatMode === "STANDARD" ? `dont TVA ${formatEuros(t.taxCents)}` : vatMode === "FRANCHISE" ? "TVA non applicable, art. 293 B du CGI" : ""}
      </p>
    </dl>
  );
}
