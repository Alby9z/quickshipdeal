import type { Address } from "@prisma/client";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { SUPPORTED_COUNTRIES } from "@/modules/checkout/schemas";

export function AddressFields({ a }: { a?: Address }) {
  const k = a?.id ?? "new";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Prénom" htmlFor={`fn-${k}`}><Input id={`fn-${k}`} name="firstName" defaultValue={a?.firstName} required /></Field>
      <Field label="Nom" htmlFor={`ln-${k}`}><Input id={`ln-${k}`} name="lastName" defaultValue={a?.lastName} required /></Field>
      <Field label="Société" htmlFor={`co-${k}`} className="sm:col-span-2"><Input id={`co-${k}`} name="company" defaultValue={a?.company ?? ""} /></Field>
      <Field label="Adresse" htmlFor={`l1-${k}`} className="sm:col-span-2"><Input id={`l1-${k}`} name="line1" defaultValue={a?.line1} required /></Field>
      <Field label="Complément" htmlFor={`l2-${k}`} className="sm:col-span-2"><Input id={`l2-${k}`} name="line2" defaultValue={a?.line2 ?? ""} /></Field>
      <Field label="Code postal" htmlFor={`pc-${k}`}><Input id={`pc-${k}`} name="postalCode" defaultValue={a?.postalCode} required /></Field>
      <Field label="Ville" htmlFor={`ci-${k}`}><Input id={`ci-${k}`} name="city" defaultValue={a?.city} required /></Field>
      <Field label="Pays" htmlFor={`cn-${k}`}><Select id={`cn-${k}`} name="country" defaultValue={a?.country ?? "FR"}>{SUPPORTED_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Téléphone" htmlFor={`ph-${k}`}><Input id={`ph-${k}`} name="phone" defaultValue={a?.phone ?? ""} /></Field>
      <Checkbox name="isDefault" defaultChecked={a?.isDefaultShipping} label="Adresse par défaut" />
    </div>
  );
}
