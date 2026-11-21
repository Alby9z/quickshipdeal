import type { Prisma } from "@prisma/client";
import type { Tx } from "@/lib/db";
import { nextInvoiceNumber } from "./numbering";
import { businessSchema, storeSchema, taxSchema } from "@/modules/settings/service";

/**
 * Émet une facture (ou un avoir) avec numérotation séquentielle et instantané des mentions
 * vendeur/acheteur/lignes. Une facture émise n'est jamais modifiée : un remboursement donne un avoir.
 */
export async function createInvoiceForOrder(tx: Tx, orderId: string, opts: { creditNoteCents?: number } = {}) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!opts.creditNoteCents) {
    const existing = await tx.invoice.findFirst({ where: { orderId, kind: "invoice" } });
    if (existing) return existing;
  }
  const settings = await tx.appSetting.findMany({ where: { key: { in: ["business", "tax", "store"] } } });
  const get = (k: string) => settings.find((s) => s.key === k)?.value ?? {};
  const business = businessSchema.parse(get("business"));
  const tax = taxSchema.parse(get("tax"));
  const store = storeSchema.parse(get("store"));

  const vatMention =
    tax.vatMode === "FRANCHISE"
      ? "TVA non applicable, art. 293 B du CGI"
      : tax.vatMode === "STANDARD"
        ? `TVA ${business.vatNumber ? `n° ${business.vatNumber}` : ""}`.trim()
        : "Régime de TVA non renseigné";

  const isCredit = Boolean(opts.creditNoteCents);
  const number = await nextInvoiceNumber(tx, isCredit ? `${store.invoicePrefix}AV` : store.invoicePrefix);
  const totalCents = isCredit ? -opts.creditNoteCents! : order.totalCents;
  const taxCents = isCredit
    ? -Math.round((order.taxCents * opts.creditNoteCents!) / Math.max(1, order.totalCents))
    : order.taxCents;

  return tx.invoice.create({
    data: {
      orderId,
      number,
      kind: isCredit ? "credit_note" : "invoice",
      totalCents,
      taxCents,
      currency: order.currency,
      sellerSnapshot: { ...business, vatMention } as Prisma.InputJsonValue,
      buyerSnapshot: { email: order.email, billingAddress: order.billingAddress } as Prisma.InputJsonValue,
      linesSnapshot: {
        items: order.items.map((i) => ({ name: i.productName, variant: i.variantName, sku: i.sku, quantity: i.quantity, unitPriceCents: i.unitPriceCents, vatRateBps: i.vatRateBps, lineTotalCents: i.lineTotalCents, discountCents: i.discountCents })),
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        shippingCents: order.shippingCents,
        orderNumber: order.number,
      } as Prisma.InputJsonValue,
    },
  });
}
