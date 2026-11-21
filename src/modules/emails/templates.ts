import { formatEuros } from "@/lib/money";

/** Échappement HTML : toute donnée dynamique passe par ici. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const C = { night: "#0B1B3F", orange: "#FF7A1A", electric: "#1F6BFF", text: "#1B2434", muted: "#5B6B82", bg: "#F3F6FB" };

export type EmailContext = {
  siteUrl: string;
  business: { tradeName: string; legalName: string; contactAddress: string; email: string; siret: string };
};

function layout(ctx: EmailContext, title: string, bodyHtml: string, cta?: { label: string; url: string }, footerNote?: string) {
  const button = cta
    ? `<tr><td style="padding:8px 32px 28px"><a href="${esc(cta.url)}" style="display:inline-block;background:${C.orange};color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:10px">${esc(cta.label)}</a></td></tr>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:${C.bg};font-family:Inter,Segoe UI,Arial,sans-serif;color:${C.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${C.night};padding:22px 32px"><a href="${esc(ctx.siteUrl)}" style="text-decoration:none;color:#fff;font-size:20px;font-weight:800">Quick<span style="color:${C.orange}">Ship</span>Deals</a></td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,${C.orange},${C.electric})"></td></tr>
<tr><td style="padding:32px 32px 8px"><h1 style="margin:0 0 16px;font-size:22px;color:${C.night}">${esc(title)}</h1>${bodyHtml}</td></tr>
${button}
<tr><td style="padding:20px 32px;border-top:1px solid #E6EBF2;color:${C.muted};font-size:12px;line-height:1.6">
${footerNote ? `<p style="margin:0 0 8px">${footerNote}</p>` : ""}
${esc(ctx.business.tradeName)}${ctx.business.legalName ? ` — ${esc(ctx.business.legalName)}` : ""}${ctx.business.siret ? ` — SIRET ${esc(ctx.business.siret)}` : ""}<br>
${esc(ctx.business.contactAddress)}${ctx.business.email ? ` — <a href="mailto:${esc(ctx.business.email)}" style="color:${C.electric}">${esc(ctx.business.email)}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="margin:0 0 14px;line-height:1.6">${s}</p>`;

type OrderLine = { name: string; quantity: number; lineTotalCents: number };
export type OrderSummary = {
  number: string;
  totalCents: number;
  shippingCents: number;
  discountCents: number;
  items: OrderLine[];
  trackingUrl: string;
};

function orderTable(o: OrderSummary) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #EEF1F6">${esc(i.name)} × ${i.quantity}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #EEF1F6">${formatEuros(i.lineTotalCents)}</td></tr>`,
    )
    .join("");
  const extra =
    (o.discountCents ? `<tr><td style="padding:6px 0">Remise</td><td align="right">−${formatEuros(o.discountCents)}</td></tr>` : "") +
    `<tr><td style="padding:6px 0">Livraison</td><td align="right">${o.shippingCents ? formatEuros(o.shippingCents) : "Offerte"}</td></tr>`;
  return `<table role="presentation" width="100%" style="font-size:14px;margin:8px 0 16px">${rows}${extra}<tr><td style="padding:10px 0;font-weight:700">Total</td><td align="right" style="font-weight:700">${formatEuros(o.totalCents)}</td></tr></table>`;
}

/** Données attendues par type d'e-mail. */
export type EmailPayloads = {
  verify_email: { name: string; url: string };
  welcome: { name: string };
  reset_password: { name: string; url: string };
  order_confirmation: { order: OrderSummary };
  payment_confirmed: { order: OrderSummary };
  payment_failed: { orderNumber: string; retryUrl: string };
  order_supplier_sent: { orderNumber: string; trackingUrl: string };
  order_processing: { orderNumber: string; trackingUrl: string };
  order_shipped: { orderNumber: string; carrier: string; trackingNumber: string; carrierUrl?: string | null; trackingUrl: string };
  tracking_update: { orderNumber: string; status: string; description: string; trackingUrl: string };
  order_delivered: { orderNumber: string; trackingUrl: string };
  invoice_available: { orderNumber: string; invoiceNumber: string; url: string };
  order_cancelled: { orderNumber: string; reason?: string | null };
  refund_confirmed: { orderNumber: string; amountCents: number };
  return_received: { returnNumber: string; orderNumber: string };
  return_approved: { returnNumber: string; orderNumber: string; instructions?: string | null };
  support_reply: { ticketNumber: string; subject: string; message: string; url: string };
  newsletter_confirm: { url: string };
  abandoned_cart: { cartUrl: string; unsubscribeUrl: string };
  admin_alert: { title: string; body: string; url?: string };
  contact_received: { name: string; subject: string; ticketNumber: string };
};
export type EmailType = keyof EmailPayloads;

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  verify_email: "Vérification de l'adresse e-mail",
  welcome: "Confirmation d'inscription",
  reset_password: "Réinitialisation du mot de passe",
  order_confirmation: "Confirmation de commande",
  payment_confirmed: "Confirmation de paiement",
  payment_failed: "Paiement refusé",
  order_supplier_sent: "Commande transmise",
  order_processing: "Commande en préparation",
  order_shipped: "Commande expédiée / numéro de suivi",
  tracking_update: "Mise à jour de livraison",
  order_delivered: "Confirmation de livraison",
  invoice_available: "Facture disponible",
  order_cancelled: "Annulation de commande",
  refund_confirmed: "Confirmation de remboursement",
  return_received: "Demande de retour reçue",
  return_approved: "Confirmation de retour",
  support_reply: "Réponse du support",
  newsletter_confirm: "Newsletter (double opt-in)",
  abandoned_cart: "Panier abandonné",
  admin_alert: "Alerte administrateur",
  contact_received: "Accusé de réception contact",
};

/** E-mails marketing : nécessitent un consentement explicite. */
export const MARKETING_TYPES: EmailType[] = ["abandoned_cart"];

export function renderEmail<T extends EmailType>(type: T, data: EmailPayloads[T], ctx: EmailContext, intro?: string | null) {
  const d = data as never as Record<string, unknown> & EmailPayloads[EmailType];
  const introHtml = intro ? p(esc(intro)) : "";
  const L = (title: string, body: string, cta?: { label: string; url: string }, foot?: string) => ({
    subject: title,
    html: layout(ctx, title, introHtml + body, cta, foot),
  });
  switch (type) {
    case "verify_email": {
      const x = d as EmailPayloads["verify_email"];
      return L("Confirmez votre adresse e-mail", p(`Bonjour ${esc(x.name)},`) + p("Merci de confirmer votre adresse pour activer votre compte QuickShipDeals. Ce lien expire dans 24 heures."), { label: "Confirmer mon adresse", url: x.url }, "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.");
    }
    case "welcome": {
      const x = d as EmailPayloads["welcome"];
      return L("Bienvenue chez QuickShipDeals", p(`Bonjour ${esc(x.name)},`) + p("Votre compte est activé. Vous pouvez suivre vos commandes, gérer vos adresses et vos favoris depuis votre espace client."), { label: "Accéder à mon compte", url: `${ctx.siteUrl}/compte` });
    }
    case "reset_password": {
      const x = d as EmailPayloads["reset_password"];
      return L("Réinitialisation de votre mot de passe", p(`Bonjour ${esc(x.name)},`) + p("Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable 1 heure."), { label: "Choisir un nouveau mot de passe", url: x.url }, "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.");
    }
    case "order_confirmation": {
      const x = d as EmailPayloads["order_confirmation"];
      return L(`Commande ${x.order.number} confirmée`, p("Merci pour votre commande. Votre paiement a bien été reçu et vérifié.") + orderTable(x.order) + p("Vous recevrez un e-mail dès l'expédition, avec le numéro de suivi."), { label: "Suivre ma commande", url: x.order.trackingUrl });
    }
    case "payment_confirmed": {
      const x = d as EmailPayloads["payment_confirmed"];
      return L(`Paiement confirmé — ${x.order.number}`, p(`Nous confirmons la réception de votre paiement de ${formatEuros(x.order.totalCents)}.`), { label: "Voir ma commande", url: x.order.trackingUrl });
    }
    case "payment_failed": {
      const x = d as EmailPayloads["payment_failed"];
      return L(`Paiement non abouti — ${x.orderNumber}`, p("Votre paiement n'a pas pu être finalisé. Aucun montant n'a été débité pour cette tentative.") + p("Vous pouvez réessayer depuis votre panier."), { label: "Réessayer", url: x.retryUrl });
    }
    case "order_supplier_sent": {
      const x = d as EmailPayloads["order_supplier_sent"];
      return L(`Commande ${x.orderNumber} transmise`, p("Votre commande a été transmise à notre partenaire logistique pour préparation."), { label: "Suivre ma commande", url: x.trackingUrl });
    }
    case "order_processing": {
      const x = d as EmailPayloads["order_processing"];
      return L(`Commande ${x.orderNumber} en préparation`, p("Votre commande est en cours de préparation."), { label: "Suivre ma commande", url: x.trackingUrl });
    }
    case "order_shipped": {
      const x = d as EmailPayloads["order_shipped"];
      return L(`Commande ${x.orderNumber} expédiée`, p("Bonne nouvelle : votre commande a été expédiée.") + p(`Transporteur : <strong>${esc(x.carrier)}</strong><br>Numéro de suivi : <strong>${esc(x.trackingNumber)}</strong>`) + (x.carrierUrl ? p(`<a href="${esc(x.carrierUrl)}" style="color:${C.electric}">Suivre sur le site du transporteur</a>`) : ""), { label: "Suivre ma commande", url: x.trackingUrl });
    }
    case "tracking_update": {
      const x = d as EmailPayloads["tracking_update"];
      return L(`Suivi de votre colis — ${x.orderNumber}`, p(`Nouvelle étape : <strong>${esc(x.status)}</strong>`) + p(esc(x.description)), { label: "Voir le suivi", url: x.trackingUrl });
    }
    case "order_delivered": {
      const x = d as EmailPayloads["order_delivered"];
      return L(`Commande ${x.orderNumber} livrée`, p("Le transporteur indique que votre commande a été livrée. Un problème ? Répondez à cet e-mail ou contactez-nous depuis votre espace client."), { label: "Voir ma commande", url: x.trackingUrl });
    }
    case "invoice_available": {
      const x = d as EmailPayloads["invoice_available"];
      return L(`Facture ${x.invoiceNumber} disponible`, p(`La facture de votre commande ${esc(x.orderNumber)} est disponible dans votre espace client.`), { label: "Voir la facture", url: x.url });
    }
    case "order_cancelled": {
      const x = d as EmailPayloads["order_cancelled"];
      return L(`Commande ${x.orderNumber} annulée`, p("Votre commande a été annulée.") + (x.reason ? p(`Motif : ${esc(x.reason)}`) : "") + p("Si un paiement a été effectué, il vous sera remboursé sur le moyen de paiement utilisé."));
    }
    case "refund_confirmed": {
      const x = d as EmailPayloads["refund_confirmed"];
      return L(`Remboursement confirmé — ${x.orderNumber}`, p(`Un remboursement de <strong>${formatEuros(x.amountCents)}</strong> a été effectué. Selon votre banque, il apparaît sous 5 à 10 jours ouvrés.`));
    }
    case "return_received": {
      const x = d as EmailPayloads["return_received"];
      return L(`Demande de retour ${x.returnNumber} reçue`, p(`Nous avons bien reçu votre demande de retour pour la commande ${esc(x.orderNumber)}. Nous revenons vers vous rapidement avec les instructions.`));
    }
    case "return_approved": {
      const x = d as EmailPayloads["return_approved"];
      return L(`Retour ${x.returnNumber} accepté`, p(`Votre retour pour la commande ${esc(x.orderNumber)} est accepté.`) + (x.instructions ? p(esc(x.instructions)) : ""));
    }
    case "support_reply": {
      const x = d as EmailPayloads["support_reply"];
      return L(`Réponse à votre demande ${x.ticketNumber}`, p(`<strong>${esc(x.subject)}</strong>`) + `<div style="white-space:pre-wrap;line-height:1.6;margin:0 0 14px">${esc(x.message)}</div>`, { label: "Voir la conversation", url: x.url });
    }
    case "newsletter_confirm": {
      const x = d as EmailPayloads["newsletter_confirm"];
      return L("Confirmez votre inscription à la newsletter", p("Cliquez sur le bouton pour confirmer votre inscription. Sans confirmation, vous ne recevrez aucun e-mail."), { label: "Je confirme", url: x.url }, "Vous pourrez vous désinscrire à tout moment via le lien présent dans chaque e-mail.");
    }
    case "abandoned_cart": {
      const x = d as EmailPayloads["abandoned_cart"];
      return L("Votre panier vous attend", p("Vous avez laissé des articles dans votre panier. Les prix et disponibilités affichés sont ceux en vigueur au moment de votre retour sur le site."), { label: "Retrouver mon panier", url: x.cartUrl }, `<a href="${esc(x.unsubscribeUrl)}" style="color:${C.muted}">Ne plus recevoir ces rappels</a>`);
    }
    case "admin_alert": {
      const x = d as EmailPayloads["admin_alert"];
      return L(`[Alerte] ${x.title}`, p(esc(x.body)), x.url ? { label: "Ouvrir", url: x.url } : undefined);
    }
    case "contact_received": {
      const x = d as EmailPayloads["contact_received"];
      return L(`Nous avons bien reçu votre message (${x.ticketNumber})`, p(`Bonjour ${esc(x.name)},`) + p(`Votre message « ${esc(x.subject)} » a bien été reçu. Nous vous répondons dans les meilleurs délais.`));
    }
  }
  throw new Error(`Type d'e-mail inconnu : ${String(type)}`);
}
