"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState } from "react";
import type { ActionResult } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Formulaire d'administration branché sur une Server Action, avec retour inline. */
export function AdminForm({ action, children, submit, className, variant = "primary", inline = false, confirm }: {
  action: (s: unknown, f: FormData) => Promise<ActionResult<unknown>>;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  variant?: "primary" | "night" | "danger" | "outline";
  inline?: boolean;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      onSubmit={submitWithoutReset(formAction, () => !confirm || window.confirm(confirm))}
      className={cn(inline ? "flex flex-wrap items-end gap-2" : "space-y-3", className)}
    >
      {children}
      <Button type="submit" variant={variant} size={inline ? "sm" : "md"} disabled={pending}>{pending ? "…" : submit}</Button>
      {state && <p role="status" className={cn("text-xs font-medium", state.ok ? "text-emerald-700" : "text-red-600", inline && "basis-full")}>{state.ok ? state.message ?? "Enregistré" : state.error}</p>}
    </form>
  );
}
