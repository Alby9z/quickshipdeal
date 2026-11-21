"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState } from "react";
import type { ActionResult } from "@/lib/errors";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

/** Petit formulaire générique branché sur une Server Action (retour succès/erreur). */
export function ActionForm({ action, children, submit, className, variant = "primary" }: { action: (s: unknown, f: FormData) => Promise<ActionResult>; children: React.ReactNode; submit: string; className?: string; variant?: "primary" | "night" | "danger" | "outline" }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form onSubmit={submitWithoutReset(formAction)} className={className ?? "space-y-4"}>
      {children}
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message ?? "Enregistré" : state.error}</Alert>}
      <Button type="submit" variant={variant} disabled={pending}>{submit}</Button>
    </form>
  );
}
