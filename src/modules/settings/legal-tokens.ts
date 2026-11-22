import type { BusinessSettings, TaxSettings } from "./service";

const MISSING = "[à compléter]";

/**
 * Remplace les balises {{...}} des pages de contenu par les informations des Réglages.
 * Rien n'est inventé : un réglage vide s'affiche « [à compléter] » (ou un texte de procédure neutre).
 */
export function legalTokens(b: BusinessSettings, t: TaxSettings): Record<string, string> {
  const or = (v: string) => v.trim() || MISSING;
  const mediator = b.mediatorName.trim()
    ? b.mediatorUrl.trim() ? `${b.mediatorName.trim()} — [${b.mediatorUrl.trim()}](${b.mediatorUrl.trim()})` : b.mediatorName.trim()
    : MISSING;
  const vat =
    t.vatMode === "FRANCHISE" ? "TVA non applicable, art. 293 B du CGI"
    : t.vatMode === "STANDARD" ? (b.vatNumber.trim() ? `TVA française incluse — n° de TVA intracommunautaire ${b.vatNumber.trim()}` : `TVA française incluse — n° de TVA ${MISSING}`)
    : MISSING;
  return {
    nom_commercial: or(b.tradeName),
    exploitant: or(b.legalName),
    forme: or(b.legalForm),
    siren: or(b.siren),
    siret: or(b.siret),
    rcs: or(b.rcs),
    siege: or(b.registeredAddress),
    adresse: or(b.contactAddress || b.registeredAddress),
    email: or(b.email),
    telephone: or(b.phone),
    hebergeur: or(b.hostName),
    hebergeur_adresse: or(b.hostAddress),
    mediateur: mediator,
    adresse_retour: b.returnAddress.trim() || "elle vous est communiquée par e-mail lors de la confirmation de votre demande de retour",
    mention_tva: vat,
  };
}

export function fillLegalTokens(content: string, tokens: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (all, key: string) => tokens[key] ?? all);
}
