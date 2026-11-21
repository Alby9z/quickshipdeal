"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState } from "react";
import { contactAction } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success" title="Message envoyé">{state.message}</Alert>;
  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2">
      <Field label="Nom" htmlFor="c-name" error={fe.name?.[0]}><Input id="c-name" name="name" required autoComplete="name" /></Field>
      <Field label="E-mail" htmlFor="c-email" error={fe.email?.[0]}><Input id="c-email" name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Sujet" htmlFor="c-sub" error={fe.subject?.[0]}><Input id="c-sub" name="subject" required /></Field>
      <Field label="Catégorie" htmlFor="c-cat">
        <Select id="c-cat" name="category" defaultValue="question">
          <option value="question">Question</option>
          <option value="complaint">Réclamation</option>
          <option value="gdpr">Données personnelles (RGPD)</option>
          <option value="other">Autre</option>
        </Select>
      </Field>
      <Field label="N° de commande (facultatif)" htmlFor="c-order" className="sm:col-span-2"><Input id="c-order" name="orderNumber" placeholder="QSD-2026-000001" /></Field>
      <Field label="Message" htmlFor="c-msg" error={fe.message?.[0]} className="sm:col-span-2"><Textarea id="c-msg" name="message" rows={6} required minLength={10} /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <p className="text-xs text-muted sm:col-span-2">Vos données servent uniquement à traiter votre demande. Voir notre politique de confidentialité.</p>
      {state && !state.ok && <Alert tone="error" className="sm:col-span-2">{state.error}</Alert>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Envoyer</Button></div>
    </form>
  );
}
