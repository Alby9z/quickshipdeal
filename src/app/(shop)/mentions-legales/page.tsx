import type { Metadata } from "next";
import { getSetting } from "@/modules/settings/service";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };
export const revalidate = 300;

/** Mentions légales générées à partir des réglages : aucune information n'est inventée ; un champ vide est signalé. */
export default async function Page() {
  const [b, t] = await Promise.all([getSetting("business"), getSetting("tax")]);
  const v = (x: string) => x || <em className="text-amber-700">[à compléter]</em>;
  return (
    <>
      <PageHeader eyebrow="Informations légales" title="Mentions légales" />
      <div className="container-page prose-qsd mt-10 max-w-3xl">
        <h2>Éditeur du site</h2>
        <p>
          <strong>{b.tradeName}</strong> — {v(b.legalName)}<br />
          Forme juridique : {v(b.legalForm)}<br />
          SIREN : {v(b.siren)} — SIRET : {v(b.siret)}<br />
          Immatriculation : {v(b.rcs)}{b.euid ? ` — EUID ${b.euid}` : ""}<br />
          Code APE : {v(b.apeCode)}<br />
          Siège social (RCS) : {v(b.registeredAddress)}<br />
          {b.contactAddress && b.contactAddress !== b.registeredAddress ? <>Adresse de contact : {b.contactAddress}<br /></> : null}
          E-mail : {b.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : v("")} — Téléphone : {v(b.phone)}<br />
          TVA : {t.vatMode === "FRANCHISE" ? "TVA non applicable, art. 293 B du CGI" : t.vatMode === "STANDARD" ? v(b.vatNumber) : v("")}<br />
          Directeur de la publication : {v(b.publicationDirector)}
        </p>
        <h2>Hébergement</h2>
        <p>{v(b.hostName)}<br />{v(b.hostAddress)}</p>
        <h2>Médiation de la consommation</h2>
        <p>Conformément aux articles L611-1 et suivants du Code de la consommation, le consommateur peut recourir gratuitement à un médiateur : {b.mediatorName ? <>{b.mediatorName}{b.mediatorUrl ? <> — <a href={b.mediatorUrl} target="_blank" rel="noopener noreferrer">{b.mediatorUrl}</a></> : null}</> : v("")}</p>
        <h2>Propriété intellectuelle</h2>
        <p>Les contenus du site (textes, logo, éléments graphiques) sont la propriété de l&apos;éditeur, sauf mention contraire. Toute reproduction sans autorisation est interdite.</p>
        <h2>Données personnelles</h2>
        <p>Voir la <a href="/confidentialite">politique de confidentialité</a> et la <a href="/cookies">politique de cookies</a>.</p>
      </div>
    </>
  );
}
