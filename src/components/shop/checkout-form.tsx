"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { checkoutSchema, SUPPORTED_COUNTRIES, type CheckoutInput } from "@/modules/checkout/schemas";
import { checkoutAction } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { formatEuros } from "@/lib/money";

const COUNTRY_NAMES: Record<string, string> = { FR: "France", BE: "Belgique", LU: "Luxembourg", CH: "Suisse", MC: "Monaco", DE: "Allemagne", ES: "Espagne", IT: "Italie", NL: "Pays-Bas", PT: "Portugal", AT: "Autriche", IE: "Irlande" };

type Rate = { id: string; name: string; priceCents: number; freeAboveCents: number | null; minDays: number | null; maxDays: number | null; countries?: string[] };

export function CheckoutForm({ defaults, rates, subtotalAfterDiscount, freeShippingCoupon }: { defaults: Partial<CheckoutInput>; rates: Rate[]; subtotalAfterDiscount: number; freeShippingCoupon: boolean }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { billingSameAsShipping: true, shippingRateId: rates[0]?.id ?? "", ...defaults, shipping: { country: "FR", ...defaults.shipping } as CheckoutInput["shipping"] },
  });
  const { register, handleSubmit, watch, formState } = form;
  const e = formState.errors;
  const same = watch("billingSameAsShipping");
  const rateId = watch("shippingRateId");
  const rate = rates.find((r) => r.id === rateId);
  const shipping = useMemo(() => (!rate || freeShippingCoupon ? 0 : rate.freeAboveCents != null && subtotalAfterDiscount >= rate.freeAboveCents ? 0 : rate.priceCents), [rate, subtotalAfterDiscount, freeShippingCoupon]);

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    const r = await checkoutAction(data);
    if (r.ok && r.data) window.location.assign(r.data.url);
    else if (!r.ok) setServerError(r.error);
  });

  const addr = (prefix: "shipping" | "billing") => {
    const err = (e[prefix] ?? {}) as Record<string, { message?: string }>;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor={`${prefix}-fn`} error={err.firstName?.message}><Input id={`${prefix}-fn`} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} given-name`} {...register(`${prefix}.firstName`)} /></Field>
        <Field label="Nom" htmlFor={`${prefix}-ln`} error={err.lastName?.message}><Input id={`${prefix}-ln`} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} family-name`} {...register(`${prefix}.lastName`)} /></Field>
        <Field label="Société (facultatif)" htmlFor={`${prefix}-co`} className="sm:col-span-2"><Input id={`${prefix}-co`} {...register(`${prefix}.company`)} /></Field>
        <Field label="Adresse" htmlFor={`${prefix}-l1`} error={err.line1?.message} className="sm:col-span-2"><Input id={`${prefix}-l1`} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} address-line1`} {...register(`${prefix}.line1`)} /></Field>
        <Field label="Complément (facultatif)" htmlFor={`${prefix}-l2`} className="sm:col-span-2"><Input id={`${prefix}-l2`} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} address-line2`} {...register(`${prefix}.line2`)} /></Field>
        <Field label="Code postal" htmlFor={`${prefix}-pc`} error={err.postalCode?.message}><Input id={`${prefix}-pc`} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} postal-code`} {...register(`${prefix}.postalCode`)} /></Field>
        <Field label="Ville" htmlFor={`${prefix}-ci`} error={err.city?.message}><Input id={`${prefix}-ci`} autoComplete={`${prefix === "shipping" ? "shipping" : "billing"} address-level2`} {...register(`${prefix}.city`)} /></Field>
        <Field label="Pays" htmlFor={`${prefix}-cn`}><Select id={`${prefix}-cn`} {...register(`${prefix}.country`)}>{SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c]}</option>)}</Select></Field>
        <Field label="Téléphone (pour le transporteur)" htmlFor={`${prefix}-ph`}><Input id={`${prefix}-ph`} type="tel" autoComplete="tel" {...register(`${prefix}.phone`)} /></Field>
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold"><span className="mr-2 text-orange-500">1.</span>Coordonnées</h2>
        <Field label="Adresse e-mail" htmlFor="email" error={e.email?.message} hint="Confirmation et suivi de commande envoyés à cette adresse."><Input id="email" type="email" autoComplete="email" {...register("email")} /></Field>
      </section>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold"><span className="mr-2 text-orange-500">2.</span>Adresse de livraison</h2>
        {addr("shipping")}
      </section>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold"><span className="mr-2 text-orange-500">3.</span>Adresse de facturation</h2>
        <Checkbox label="Identique à l'adresse de livraison" {...register("billingSameAsShipping")} />
        {!same && <div className="mt-4">{addr("billing")}</div>}
      </section>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold"><span className="mr-2 text-orange-500">4.</span>Mode de livraison</h2>
        {rates.length === 0 ? (
          <Alert tone="warning">Aucun mode de livraison n&apos;est disponible pour le moment.</Alert>
        ) : (
          <div className="space-y-2">
            {rates.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line p-4 has-[:checked]:border-night-900 has-[:checked]:bg-surface">
                <span className="flex items-center gap-3">
                  <input type="radio" value={r.id} {...register("shippingRateId")} className="accent-orange-500" />
                  <span><span className="font-semibold">{r.name}</span>{r.minDays != null && <span className="block text-xs text-muted">{r.minDays}–{r.maxDays ?? r.minDays} jours ouvrés après expédition</span>}</span>
                </span>
                <span className="font-semibold">{r.freeAboveCents != null && subtotalAfterDiscount >= r.freeAboveCents ? "Offerte" : formatEuros(r.priceCents)}</span>
              </label>
            ))}
            {e.shippingRateId && <p className="text-xs text-red-600">{e.shippingRateId.message}</p>}
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold"><span className="mr-2 text-orange-500">5.</span>Validation</h2>
        <Field label="Note pour la commande (facultatif)" htmlFor="note"><Textarea id="note" rows={2} {...register("customerNote")} /></Field>
        <div className="mt-4">
          <Checkbox label={<>J&apos;ai lu et j&apos;accepte les <Link href="/cgv" target="_blank" className="text-electric-500 underline">conditions générales de vente</Link> et la <Link href="/confidentialite" target="_blank" className="text-electric-500 underline">politique de confidentialité</Link>.</>} {...register("acceptTerms")} />
          {e.acceptTerms && <p className="mt-1 text-xs text-red-600">{e.acceptTerms.message}</p>}
        </div>
        <p className="mt-4 text-sm">Livraison : <strong>{shipping === 0 ? "offerte" : formatEuros(shipping)}</strong> · Total à payer : <strong>{formatEuros(subtotalAfterDiscount + shipping)}</strong></p>
        {serverError && <Alert tone="error" className="mt-4">{serverError}</Alert>}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={formState.isSubmitting || rates.length === 0}>
          {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Lock />} Commander avec obligation de paiement
        </Button>
        <p className="mt-2 text-center text-xs text-muted">Vous serez redirigé(e) vers la page de paiement sécurisée Stripe.</p>
      </section>
    </form>
  );
}
