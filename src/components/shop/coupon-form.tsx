"use client";

import { useState, useTransition } from "react";
import { applyCouponAction, removeCouponAction } from "@/actions/cart";

export function CouponForm({ current, error }: { current: string | null; error: string | null }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (current)
    return (
      <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
        <span>Code <strong className="font-mono">{current}</strong>{error ? <span className="block text-xs text-red-600">{error}</span> : null}</span>
        <button type="button" className="text-xs font-semibold text-electric-500" onClick={() => start(async () => void (await removeCouponAction()))}>Retirer</button>
      </div>
    );
  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await applyCouponAction(code);
          setMsg(r.ok ? null : r.error);
        });
      }}
    >
      <label htmlFor="coupon" className="text-sm font-medium">Code promo</label>
      <div className="flex gap-2">
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm uppercase" />
        <button disabled={pending || !code} className="h-10 rounded-xl border border-line px-3 text-sm font-semibold disabled:opacity-50">Appliquer</button>
      </div>
      {msg && <p className="text-xs text-red-600" role="alert">{msg}</p>}
    </form>
  );
}
