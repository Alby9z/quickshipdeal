import { Input, Select, Textarea, Checkbox, Field } from "@/components/ui/form";
import type { Supplier } from "@prisma/client";

export function SupplierFields({ s }: { s?: Supplier }) {
  const ruleValue = s ? (s.marginRuleType === "percent" ? String(s.marginRuleValue / 100) : s.marginRuleType === "fixed" ? (s.marginRuleValue / 100).toFixed(2).replace(".", ",") : "") : "";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Nom *"><Input name="name" defaultValue={s?.name} required /></Field>
      <Field label="Type d'intégration">
        <Select name="type" defaultValue={s?.type ?? "MANUAL"}>
          <option value="MANUAL">Manuel (commande passée à la main)</option><option value="BIGBUY">BigBuy (API)</option><option value="CJDROPSHIPPING">CJ Dropshipping (API)</option><option value="OTHER_API">Autre API</option>
        </Select>
      </Field>
      <Field label="Contact"><Input name="contactName" defaultValue={s?.contactName ?? ""} /></Field>
      <Field label="E-mail"><Input name="email" type="email" defaultValue={s?.email ?? ""} /></Field>
      <Field label="Téléphone"><Input name="phone" defaultValue={s?.phone ?? ""} /></Field>
      <Field label="Site web"><Input name="website" defaultValue={s?.website ?? ""} /></Field>
      <Field label="Identifiant de compte chez le fournisseur" hint="Pas de clé API ici : les clés vont dans les variables d'environnement"><Input name="externalAccountId" defaultValue={s?.externalAccountId ?? ""} /></Field>
      <Field label="Pays d'expédition"><Input name="shipsFromCountry" defaultValue={s?.shipsFromCountry ?? ""} placeholder="ex. FR, ES, CN" /></Field>
      <Field label="Préparation (jours min / max)"><div className="flex gap-2"><Input name="processingDaysMin" type="number" min={0} defaultValue={s?.processingDaysMin ?? ""} /><Input name="processingDaysMax" type="number" min={0} defaultValue={s?.processingDaysMax ?? ""} /></div></Field>
      <Field label="Transport (jours min / max)"><div className="flex gap-2"><Input name="shippingDaysMin" type="number" min={0} defaultValue={s?.shippingDaysMin ?? ""} /><Input name="shippingDaysMax" type="number" min={0} defaultValue={s?.shippingDaysMax ?? ""} /></div></Field>
      <Field label="Règle de marge">
        <Select name="marginRuleType" defaultValue={s?.marginRuleType ?? "none"}><option value="none">Aucune</option><option value="percent">Pourcentage sur le prix d&apos;achat</option><option value="fixed">Montant fixe ajouté (€)</option></Select>
      </Field>
      <Field label="Valeur de la règle" hint="ex. 60 pour +60 %, ou 5,00 pour +5 €"><Input name="marginRuleValue" defaultValue={ruleValue} /></Field>
      <Field label="Informations de livraison" className="sm:col-span-2"><Textarea name="shippingInfo" defaultValue={s?.shippingInfo ?? ""} className="min-h-16" /></Field>
      <Field label="Notes internes" className="sm:col-span-2"><Textarea name="notes" defaultValue={s?.notes ?? ""} className="min-h-16" /></Field>
      <Checkbox name="isEnabled" label="Fournisseur actif" defaultChecked={s?.isEnabled ?? false} />
      <Checkbox name="autoApplyMargin" label="Appliquer automatiquement la règle de marge au prix de vente lors des synchronisations" defaultChecked={s?.autoApplyMargin ?? false} />
    </div>
  );
}
