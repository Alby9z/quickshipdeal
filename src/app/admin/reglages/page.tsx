import { requireStaff } from "@/modules/auth/session";
import { getSetting, launchChecklist } from "@/modules/settings/service";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select, Checkbox, Field, Textarea } from "@/components/ui/form";
import { Alert, Badge } from "@/components/ui/misc";
import { saveBusinessSettingsAction, saveTaxSettingsAction, saveStoreSettingsAction } from "@/actions/admin-content";
import { integrationStatus } from "@/lib/env";

export const metadata = { title: "Paramètres" };

const BUSINESS_FIELDS: [string, string, string?][] = [
  ["legalName", "Dénomination / nom de l'entrepreneur"], ["tradeName", "Nom commercial"], ["legalForm", "Forme juridique"], ["siren", "SIREN"], ["siret", "SIRET"],
  ["rcs", "Immatriculation RCS"], ["euid", "EUID"], ["apeCode", "Code APE"], ["createdOn", "Date de création"], ["vatNumber", "N° de TVA intracommunautaire", "Uniquement si vous êtes assujetti"],
  ["registeredAddress", "Adresse du siège (inscrite au RCS)"], ["contactAddress", "Adresse de contact"], ["returnAddress", "Adresse de retour des colis", "Adresse réelle où les clients renvoient les produits"],
  ["email", "E-mail de contact"], ["phone", "Téléphone"], ["publicationDirector", "Directeur de la publication"], ["hostName", "Hébergeur (nom)", "ex. Vercel Inc."], ["hostAddress", "Hébergeur (adresse)"],
  ["mediatorName", "Médiateur de la consommation", "Obligatoire pour la vente aux particuliers"], ["mediatorUrl", "Site du médiateur"],
];

const INTEGRATIONS: [string, keyof ReturnType<typeof integrationStatus>, string][] = [
  ["Stripe (paiement)", "stripe", "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
  ["Resend (e-mails)", "resend", "RESEND_API_KEY, EMAIL_FROM, RESEND_WEBHOOK_SECRET"],
  ["Stockage R2 / S3", "storage", "S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_PUBLIC_URL"],
  ["Redis (worker, files d'attente)", "redis", "REDIS_URL"],
  ["BigBuy", "bigbuy", "BIGBUY_API_KEY"], ["CJ Dropshipping", "cjdropshipping", "CJ_API_EMAIL, CJ_API_KEY"],
  ["17TRACK", "track17", "TRACK17_API_KEY"], ["AfterShip", "aftership", "AFTERSHIP_API_KEY"],
  ["API REST v1", "apiV1", "API_V1_TOKEN"], ["Sentry", "sentry", "SENTRY_DSN"],
];

export default async function Settings() {
  await requireStaff("settings:write");
  const [b, t, s, checklist] = await Promise.all([getSetting("business"), getSetting("tax"), getSetting("store"), launchChecklist()]);
  const st = integrationStatus();
  return (
    <div className="space-y-6">
      <AdminTitle title="Paramètres" />
      {checklist.length > 0 && <Alert tone="warning" title="Points à régler avant l'ouverture"><ul className="list-disc pl-5">{checklist.map((c) => <li key={c}>{c}</li>)}</ul></Alert>}
      <Panel title="Fiscalité">
        <AdminForm action={saveTaxSettingsAction} submit="Enregistrer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Régime de TVA" hint="Vérifiez votre régime auprès de votre SIE ou de votre comptable.">
              <Select name="vatMode" defaultValue={t.vatMode}>
                <option value="UNCONFIGURED">Non choisi</option>
                <option value="FRANCHISE">Franchise en base (TVA non applicable, art. 293 B du CGI)</option>
                <option value="STANDARD">Assujetti : TVA collectée</option>
              </Select>
            </Field>
            <Field label="Taux par défaut des nouveaux produits"><Select name="defaultVatRateBps" defaultValue={String(t.defaultVatRateBps)}><option value="2000">20 %</option><option value="1000">10 %</option><option value="550">5,5 %</option></Select></Field>
          </div>
        </AdminForm>
      </Panel>
      <Panel title="Informations légales de l'entreprise">
        <p className="mb-4 text-sm text-muted">Ces données alimentent les mentions légales, les factures et les e-mails. Laissez vide ce qui n&apos;est pas connu : rien n&apos;est inventé.</p>
        <AdminForm action={saveBusinessSettingsAction} submit="Enregistrer">
          <div className="grid gap-4 sm:grid-cols-2">
            {BUSINESS_FIELDS.map(([k, l, h]) => (
              <Field key={k} label={l} hint={h} className={k.endsWith("Address") ? "sm:col-span-2" : ""}>
                {k.endsWith("Address") ? <Textarea name={k} defaultValue={b[k as keyof typeof b]} className="min-h-16" /> : <Input name={k} defaultValue={b[k as keyof typeof b]} />}
              </Field>
            ))}
          </div>
        </AdminForm>
      </Panel>
      <Panel title="Boutique">
        <AdminForm action={saveStoreSettingsAction} submit="Enregistrer">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Préfixe des commandes"><Input name="orderPrefix" defaultValue={s.orderPrefix} /></Field>
            <Field label="Préfixe des factures"><Input name="invoicePrefix" defaultValue={s.invoicePrefix} /></Field>
            <Field label="Seuil de stock faible"><Input name="lowStockThreshold" type="number" min={0} defaultValue={s.lowStockThreshold} /></Field>
            <Field label="Délai de rétractation (jours)" hint="14 minimum"><Input name="returnWindowDays" type="number" min={14} defaultValue={s.returnWindowDays} /></Field>
            <Field label="Version des CGV acceptées"><Input name="termsVersion" defaultValue={s.termsVersion} /></Field>
            <Field label="Relance panier abandonné après (heures)"><Input name="abandonedCartDelayHours" type="number" min={1} defaultValue={s.abandonedCartDelayHours} /></Field>
            <Field label="Bandeau d'information" className="sm:col-span-3"><Input name="maintenanceBanner" defaultValue={s.maintenanceBanner} /></Field>
          </div>
          <Checkbox name="allowGuestCheckout" label="Autoriser la commande sans compte" defaultChecked={s.allowGuestCheckout} />
          <Checkbox name="abandonedCartEnabled" label="Relancer les paniers abandonnés (uniquement clients ayant accepté les e-mails marketing)" defaultChecked={s.abandonedCartEnabled} />
        </AdminForm>
      </Panel>
      <Panel title="Intégrations">
        <p className="mb-3 text-sm text-muted">Les clés se renseignent uniquement dans les variables d&apos;environnement de l&apos;hébergeur (jamais dans la base ni dans le code).</p>
        <ul className="divide-y divide-line text-sm">
          {INTEGRATIONS.map(([l, k, vars]) => <li key={k} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><strong>{l}</strong><br /><code className="text-xs text-muted">{vars}</code></span><Badge tone={st[k] ? "green" : "amber"}>{st[k] ? "configuré" : "non configuré"}</Badge></li>)}
        </ul>
      </Panel>
    </div>
  );
}
