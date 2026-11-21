"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState } from "react";
import { subscribeNewsletterAction } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, null);
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-2">
      <label htmlFor={`nl-${dark}`} className={cn("text-sm font-semibold", dark ? "text-white" : "text-night-900")}>Newsletter</label>
      <div className="flex gap-2">
        <input id={`nl-${dark}`} name="email" type="email" required placeholder="votre@email.fr" className={cn("h-11 min-w-0 flex-1 rounded-xl border px-3.5 text-sm focus:outline-none focus:ring-4", dark ? "border-white/15 bg-white/5 text-white placeholder:text-white/40 focus:ring-orange-500/30" : "border-line bg-white focus:ring-electric-500/15")} />
        <Button type="submit" disabled={pending}>S&apos;inscrire</Button>
      </div>
      <label className={cn("flex items-start gap-2 text-xs", dark ? "text-white/60" : "text-muted")}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-orange-500" />
        J&apos;accepte de recevoir les offres de QuickShipDeals par e-mail. Désinscription possible à tout moment.
      </label>
      {state && <p className={cn("text-xs", state.ok ? (dark ? "text-emerald-300" : "text-emerald-700") : "text-red-400")} role="status">{state.ok ? state.message : state.error}</p>}
    </form>
  );
}
