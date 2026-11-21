"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { updateCartItemAction } from "@/actions/cart";

export function CartLineControls({ itemId, quantity }: { itemId: string; quantity: number }) {
  const [pending, start] = useTransition();
  const set = (q: number) => start(async () => void (await updateCartItemAction(itemId, q)));
  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      <div className="flex items-center rounded-xl border border-line">
        <button type="button" disabled={pending} onClick={() => set(quantity - 1)} className="grid size-9 place-items-center" aria-label="Diminuer la quantité"><Minus className="size-3.5" /></button>
        <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
        <button type="button" disabled={pending} onClick={() => set(quantity + 1)} className="grid size-9 place-items-center" aria-label="Augmenter la quantité"><Plus className="size-3.5" /></button>
      </div>
      <button type="button" disabled={pending} onClick={() => set(0)} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600" aria-label="Retirer du panier"><Trash2 className="size-4" /></button>
    </div>
  );
}
