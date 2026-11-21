"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/actions/cart";
import { Button, type ButtonProps } from "@/components/ui/button";

export function AddToCartButton({ productId, variantId, quantity = 1, disabled, className, size, label = "Ajouter" }: { productId: string; variantId?: string | null; quantity?: number; disabled?: boolean; className?: string; size?: ButtonProps["size"]; label?: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);
  return (
    <div className={className}>
      <Button
        type="button"
        size={size}
        className="w-full"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const r = await addToCartAction({ productId, variantId, quantity });
            setState(r.ok ? { ok: true, msg: r.message ?? "Ajouté" } : { ok: false, msg: r.error });
            setTimeout(() => setState(null), 2500);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : state?.ok ? <Check /> : <ShoppingCart />}
        {disabled ? "Indisponible" : state?.ok ? "Ajouté" : label}
      </Button>
      <p className="sr-only" aria-live="polite">{state?.msg}</p>
      {state && !state.ok && <p className="mt-1 text-xs text-red-600">{state.msg}</p>}
    </div>
  );
}
