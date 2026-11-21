"use client";

import { useState } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { AddToCartButton } from "./add-to-cart-button";
import { toggleWishlistAction } from "@/actions/account";
import { formatEuros } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = { id: string; name: string; priceCents: number | null; available: boolean };

export function ProductPurchase({ productId, basePriceCents, variants, available, inWishlist }: { productId: string; basePriceCents: number; variants: Variant[]; available: boolean; inWishlist: boolean }) {
  const [variantId, setVariantId] = useState<string | null>(variants.find((v) => v.available)?.id ?? null);
  const [qty, setQty] = useState(1);
  const [fav, setFav] = useState(inWishlist);
  const [favMsg, setFavMsg] = useState<string | null>(null);
  const variant = variants.find((v) => v.id === variantId);
  const canBuy = available && (variants.length === 0 || Boolean(variant?.available));
  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Choisir une option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" disabled={!v.available} onClick={() => setVariantId(v.id)} aria-pressed={v.id === variantId} className={cn("rounded-xl border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40", v.id === variantId ? "border-night-900 bg-night-900 text-white" : "border-line hover:border-night-900/40")}>
                {v.name}{v.priceCents != null && v.priceCents !== basePriceCents ? ` — ${formatEuros(v.priceCents)}` : ""}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-xl border border-line" role="group" aria-label="Quantité">
          <button type="button" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer"><Minus className="size-4" /></button>
          <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
          <button type="button" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Augmenter"><Plus className="size-4" /></button>
        </div>
        <AddToCartButton productId={productId} variantId={variantId} quantity={qty} disabled={!canBuy} className="flex-1" size="md" label="Ajouter au panier" />
        <button
          type="button"
          aria-pressed={fav}
          aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          onClick={async () => {
            const r = await toggleWishlistAction(productId);
            if (r.ok) setFav(Boolean(r.data?.inWishlist));
            else setFavMsg(r.error);
          }}
          className="grid size-11 place-items-center rounded-xl border border-line hover:bg-surface"
        >
          <Heart className={cn("size-5", fav && "fill-orange-500 text-orange-500")} />
        </button>
      </div>
      {favMsg && <p className="text-xs text-muted">{favMsg}</p>}
    </div>
  );
}
