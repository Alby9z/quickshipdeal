"use server";

import { adminAction, str, optStr, bool } from "@/lib/admin-action";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseEuros } from "@/lib/money";
import { siteUrl } from "@/lib/env";
import { audit } from "@/modules/audit/service";
import { adminSetOrderStatus } from "@/modules/orders/service";
import { createShipment, addTrackingEvent } from "@/modules/shipping/service";
import { requestRefund } from "@/modules/payments/refunds";
import { markSupplierOrdered, runSupplierSync, placeSupplierOrders } from "@/modules/suppliers/service";
import { anonymizeUser, recomputeRating } from "@/modules/customers/service";
import { sendEmail, retryEmail } from "@/modules/emails/service";
import { enqueue } from "@/jobs/queues";
import type { OrderStatus, ShipmentStatus, ReturnStatus, TicketStatus, ReviewStatus, SupplierType, DiscountType } from "@prisma/client";

const int = (f: FormData, k: string) => (str(f, k) === "" ? null : Math.max(0, Math.trunc(Number(str(f, k)))));
const date = (f: FormData, k: string) => (str(f, k) ? new Date(str(f, k)) : null);

// ─────────── Commandes ───────────
export const orderStatusAction = adminAction("order:write", async (user, f) => {
  const id = str(f, "orderId");
  await adminSetOrderStatus(id, str(f, "status") as OrderStatus, user.id, optStr(f, "message") ?? undefined);
  return { message: "Statut mis à jour", revalidate: [`/admin/commandes/${id}`, "/admin/commandes"] };
});

export const orderNoteAction = adminAction("order:write", async (user, f) => {
  const orderId = str(f, "orderId");
  const message = str(f, "message");
  if (!message) throw new AppError("Note vide");
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  await db.orderEvent.create({ data: { orderId, fromStatus: o.status, toStatus: o.status, message, isPublic: false, actorId: user.id } });
  return { message: "Note interne ajoutée", revalidate: [`/admin/commandes/${orderId}`] };
});

export const supplierRefAction = adminAction("order:write", async (user, f) => {
  const orderId = str(f, "orderId");
  const ref = str(f, "supplierOrderRef");
  if (!ref) throw new AppError("Référence de commande fournisseur requise (celle réellement obtenue chez le fournisseur).");
  const itemIds = f.getAll("itemIds").map(String);
  if (!itemIds.length) throw new AppError("Sélectionnez au moins une ligne.");
  await markSupplierOrdered(orderId, itemIds, ref, user.id);
  return { message: "Commande fournisseur enregistrée", revalidate: [`/admin/commandes/${orderId}`] };
});

export const retrySupplierOrderAction = adminAction("order:write", async (_user, f) => {
  const orderId = str(f, "orderId");
  await placeSupplierOrders(orderId);
  return { message: "Transmission relancée (voir l'état des lignes)", revalidate: [`/admin/commandes/${orderId}`] };
});

export const shipmentAction = adminAction("order:write", async (user, f) => {
  const orderId = str(f, "orderId");
  const trackingNumber = str(f, "trackingNumber");
  if (trackingNumber.length < 4) throw new AppError("Numéro de suivi réel requis.");
  await createShipment({ orderId, carrierId: str(f, "carrierId"), trackingNumber, shippedAt: date(f, "shippedAt") ?? undefined, actorId: user.id });
  return { message: "Expédition enregistrée, client notifié", revalidate: [`/admin/commandes/${orderId}`, "/admin/livraisons"] };
});

export const trackingEventAction = adminAction("order:write", async (user, f) => {
  const description = str(f, "description");
  if (!description) throw new AppError("Description requise (telle que donnée par le transporteur).");
  await addTrackingEvent({ shipmentId: str(f, "shipmentId"), occurredAt: date(f, "occurredAt") ?? new Date(), description, location: optStr(f, "location"), status: str(f, "status") as ShipmentStatus, source: "manual", actorId: user.id, notify: bool(f, "notify") });
  const orderId = str(f, "orderId");
  return { message: "Événement de suivi ajouté", revalidate: [`/admin/commandes/${orderId}`, "/admin/livraisons"] };
});

export const refundAction = adminAction("order:refund", async (user, f) => {
  const orderId = str(f, "orderId");
  await requestRefund({ orderId, amountCents: parseEuros(str(f, "amount")), reason: optStr(f, "reason") ?? undefined, actorId: user.id, returnRequestId: optStr(f, "returnRequestId") ?? undefined });
  return { message: "Remboursement demandé à Stripe. Le statut sera confirmé par webhook.", revalidate: [`/admin/commandes/${orderId}`, "/admin/remboursements"] };
});

// ─────────── Fournisseurs ───────────
export const saveSupplierAction = adminAction<{ id: string }>("supplier:write", async (user, f) => {
  const id = str(f, "id") || null;
  const name = str(f, "name");
  if (name.length < 2) throw new AppError("Nom requis");
  const rule = str(f, "marginRuleType") || "none";
  if (!["none", "percent", "fixed"].includes(rule)) throw new AppError("Règle de marge invalide");
  const ruleValueRaw = str(f, "marginRuleValue");
  const marginRuleValue = rule === "percent" ? Math.round(Number(ruleValueRaw.replace(",", ".") || 0) * 100) : rule === "fixed" ? parseEuros(ruleValueRaw || "0") : 0;
  const data = {
    name, type: (str(f, "type") || "MANUAL") as SupplierType, isEnabled: bool(f, "isEnabled"), contactName: optStr(f, "contactName"), email: optStr(f, "email"), phone: optStr(f, "phone"), website: optStr(f, "website"),
    externalAccountId: optStr(f, "externalAccountId"), processingDaysMin: int(f, "processingDaysMin"), processingDaysMax: int(f, "processingDaysMax"), shippingDaysMin: int(f, "shippingDaysMin"), shippingDaysMax: int(f, "shippingDaysMax"),
    shipsFromCountry: optStr(f, "shipsFromCountry"), shippingInfo: optStr(f, "shippingInfo"), marginRuleType: rule, marginRuleValue, autoApplyMargin: bool(f, "autoApplyMargin"), notes: optStr(f, "notes"),
  };
  const s = id ? await db.supplier.update({ where: { id }, data }) : await db.supplier.create({ data });
  await audit({ actorId: user.id, action: id ? "supplier.update" : "supplier.create", entityType: "Supplier", entityId: s.id, changes: { name, type: data.type, isEnabled: data.isEnabled } });
  return { message: "Fournisseur enregistré", data: { id: s.id }, revalidate: ["/admin/fournisseurs", `/admin/fournisseurs/${s.id}`] };
});

export const supplierSyncAction = adminAction("supplier:write", async (user, f) => {
  const supplierId = str(f, "supplierId");
  const kind = (str(f, "kind") || "prices") as "import" | "prices" | "stock";
  const job = await enqueue("supplier-sync", "sync", { supplierId, kind, triggeredById: user.id }, `sync-${supplierId}-${kind}-${Date.now()}`).catch(() => false);
  if (!job) await runSupplierSync(supplierId, kind, user.id);
  return { message: job ? "Synchronisation mise en file d'attente" : "Synchronisation exécutée (voir le journal)", revalidate: [`/admin/fournisseurs/${supplierId}`, "/admin/synchronisations"] };
});

// ─────────── Clients ───────────
export const customerBlockAction = adminAction("customer:write", async (user, f) => {
  const id = str(f, "userId");
  const isBlocked = bool(f, "block");
  await db.user.update({ where: { id }, data: { isBlocked } });
  if (isBlocked) await db.session.deleteMany({ where: { userId: id } });
  await audit({ actorId: user.id, action: isBlocked ? "customer.block" : "customer.unblock", entityType: "User", entityId: id });
  return { message: isBlocked ? "Compte bloqué" : "Compte débloqué", revalidate: [`/admin/clients/${id}`] };
});

export const customerNoteAction = adminAction("customer:write", async (user, f) => {
  const userId = str(f, "userId");
  await db.customerProfile.upsert({ where: { userId }, create: { userId, notesInternal: optStr(f, "notes") }, update: { notesInternal: optStr(f, "notes") } });
  await audit({ actorId: user.id, action: "customer.note", entityType: "User", entityId: userId });
  return { message: "Note enregistrée", revalidate: [`/admin/clients/${userId}`] };
});

export const customerAnonymizeAction = adminAction("customer:write", async (user, f) => {
  const userId = str(f, "userId");
  if (str(f, "confirm") !== "ANONYMISER") throw new AppError("Tapez ANONYMISER pour confirmer.");
  await anonymizeUser(userId, user.id);
  return { message: "Client anonymisé (commandes conservées pour obligations comptables)", revalidate: [`/admin/clients/${userId}`, "/admin/clients"] };
});

// ─────────── Transporteurs / tarifs ───────────
export const saveCarrierAction = adminAction("settings:write", async (user, f) => {
  const id = str(f, "id") || null;
  const tpl = optStr(f, "trackingUrlTemplate");
  if (tpl && (!tpl.startsWith("https://") || !tpl.includes("{tracking}"))) throw new AppError("Le modèle d'URL doit commencer par https:// et contenir {tracking}.");
  const data = { name: str(f, "name"), code: str(f, "code").toLowerCase(), trackingUrlTemplate: tpl, isActive: bool(f, "isActive") };
  if (!data.name || !data.code) throw new AppError("Nom et code requis");
  const c = id ? await db.carrier.update({ where: { id }, data }) : await db.carrier.create({ data });
  await audit({ actorId: user.id, action: "carrier.save", entityType: "Carrier", entityId: c.id, changes: data });
  return { message: "Transporteur enregistré", revalidate: ["/admin/transporteurs"] };
});

export const saveShippingRateAction = adminAction("settings:write", async (user, f) => {
  const id = str(f, "id") || null;
  const countries = str(f, "countries").toUpperCase().split(/[\s,]+/).filter((c) => /^[A-Z]{2}$/.test(c));
  if (!countries.length) throw new AppError("Au moins un code pays (ex. FR).");
  const data = {
    name: str(f, "name"), carrierId: optStr(f, "carrierId"), countries, priceCents: parseEuros(str(f, "price") || "0"), freeAboveCents: str(f, "freeAbove") ? parseEuros(str(f, "freeAbove")) : null,
    minDays: int(f, "minDays"), maxDays: int(f, "maxDays"), isActive: bool(f, "isActive"), position: int(f, "position") ?? 0,
  };
  if (!data.name) throw new AppError("Nom requis");
  if (data.minDays != null && data.maxDays != null && data.maxDays < data.minDays) throw new AppError("Délai max < délai min");
  const r = id ? await db.shippingRate.update({ where: { id }, data }) : await db.shippingRate.create({ data });
  await audit({ actorId: user.id, action: "shipping_rate.save", entityType: "ShippingRate", entityId: r.id, changes: data });
  return { message: "Tarif enregistré", revalidate: ["/admin/transporteurs", "/panier"] };
});

// ─────────── Promotions / coupons ───────────
function discount(f: FormData): { type: DiscountType; value: number } {
  const type = str(f, "type") as DiscountType;
  if (type === "PERCENT") {
    const pct = Number(str(f, "value").replace(",", "."));
    if (!(pct > 0 && pct <= 90)) throw new AppError("Pourcentage entre 0 et 90.");
    return { type, value: Math.round(pct * 100) };
  }
  if (type === "FIXED") return { type, value: parseEuros(str(f, "value")) };
  if (type === "FREE_SHIPPING") return { type, value: 0 };
  throw new AppError("Type de remise invalide");
}

export const saveCouponAction = adminAction("promotion:write", async (user, f) => {
  const id = str(f, "id") || null;
  const code = str(f, "code").toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new AppError("Code : 3 à 32 caractères A-Z, 0-9, - ou _.");
  const data = { code, description: optStr(f, "description"), ...discount(f), minSubtotalCents: str(f, "minSubtotal") ? parseEuros(str(f, "minSubtotal")) : null, maxUses: int(f, "maxUses"), maxUsesPerCustomer: int(f, "maxUsesPerCustomer"), startsAt: date(f, "startsAt"), endsAt: date(f, "endsAt"), isActive: bool(f, "isActive") };
  const c = id ? await db.coupon.update({ where: { id }, data }) : await db.coupon.create({ data });
  await audit({ actorId: user.id, action: "coupon.save", entityType: "Coupon", entityId: c.id, changes: data });
  return { message: "Coupon enregistré", revalidate: ["/admin/coupons"] };
});

export const savePromotionAction = adminAction("promotion:write", async (user, f) => {
  const id = str(f, "id") || null;
  const name = str(f, "name");
  const startsAt = date(f, "startsAt");
  if (!name || !startsAt) throw new AppError("Nom et date de début requis");
  const d = discount(f);
  if (d.type === "FREE_SHIPPING") throw new AppError("Une promotion produit doit être en % ou en montant fixe.");
  const productIds = f.getAll("productIds").map(String);
  const data = { name, description: optStr(f, "description"), ...d, startsAt, endsAt: date(f, "endsAt"), isActive: bool(f, "isActive") };
  const p = await db.$transaction(async (tx) => {
    const p = id ? await tx.promotion.update({ where: { id }, data }) : await tx.promotion.create({ data });
    await tx.promotionProduct.deleteMany({ where: { promotionId: p.id } });
    if (productIds.length) await tx.promotionProduct.createMany({ data: productIds.map((productId) => ({ promotionId: p.id, productId })), skipDuplicates: true });
    await tx.promotionHistory.create({ data: { promotionId: p.id, action: id ? "updated" : "created", snapshot: { ...data, startsAt: data.startsAt.toISOString(), endsAt: data.endsAt?.toISOString() ?? null, productIds }, actorId: user.id } });
    return p;
  });
  await audit({ actorId: user.id, action: "promotion.save", entityType: "Promotion", entityId: p.id, changes: { name, productIds } });
  return { message: "Promotion enregistrée. Le prix promo de chaque produit reste défini sur sa fiche (prix réel).", revalidate: ["/admin/promotions"] };
});

// ─────────── Avis ───────────
export const moderateReviewAction = adminAction("review:write", async (user, f) => {
  const id = str(f, "id");
  const status = str(f, "status") as ReviewStatus;
  const r = await db.review.update({ where: { id }, data: { status, adminReply: optStr(f, "adminReply") } });
  await recomputeRating(r.productId);
  await audit({ actorId: user.id, action: "review.moderate", entityType: "Review", entityId: id, changes: { status } });
  return { message: "Avis mis à jour", revalidate: ["/admin/avis"] };
});

// ─────────── Retours ───────────
export const returnStatusAction = adminAction("return:write", async (user, f) => {
  const id = str(f, "id");
  const status = str(f, "status") as ReturnStatus;
  const r = await db.returnRequest.update({ where: { id }, data: { status, adminNote: optStr(f, "adminNote") }, include: { order: true } });
  await audit({ actorId: user.id, action: "return.status", entityType: "ReturnRequest", entityId: id, changes: { status } });
  if (status === "APPROVED") await sendEmail({ type: "return_approved", to: r.order.email, data: { returnNumber: r.number, orderNumber: r.order.number, instructions: optStr(f, "instructions") }, idempotencyKey: `return-approved:${r.id}`, relatedOrderId: r.orderId });
  return { message: "Retour mis à jour", revalidate: ["/admin/retours", `/admin/retours/${id}`] };
});

// ─────────── Support ───────────
export const supportReplyAction = adminAction("support:write", async (user, f) => {
  const ticketId = str(f, "ticketId");
  const body = str(f, "body");
  const status = (str(f, "status") || "PENDING_CUSTOMER") as TicketStatus;
  if (body.length < 2) throw new AppError("Message vide");
  const t = await db.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
  const msg = await db.supportMessage.create({ data: { ticketId, authorId: user.id, fromStaff: true, body } });
  await db.supportTicket.update({ where: { id: ticketId }, data: { status } });
  await sendEmail({ type: "support_reply", to: t.email, data: { ticketNumber: t.number, subject: t.subject, message: body, url: t.userId ? `${siteUrl()}/compte/support` : `${siteUrl()}/contact` }, idempotencyKey: `support-reply:${msg.id}` });
  return { message: "Réponse envoyée", revalidate: [`/admin/support/${ticketId}`, "/admin/support"] };
});

export const supportStatusAction = adminAction("support:write", async (user, f) => {
  const ticketId = str(f, "ticketId");
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: str(f, "status") as TicketStatus } });
  await audit({ actorId: user.id, action: "ticket.status", entityType: "SupportTicket", entityId: ticketId, changes: { status: str(f, "status") } });
  return { message: "Statut mis à jour", revalidate: [`/admin/support/${ticketId}`] };
});

// ─────────── E-mails ───────────
export const retryEmailAction = adminAction("email:read", async (_user, f) => {
  await retryEmail(str(f, "id"));
  return { message: "Nouvel essai lancé", revalidate: ["/admin/emails"] };
});

export const saveEmailTemplateAction = adminAction("settings:write", async (user, f) => {
  const key = str(f, "key");
  const data = { subject: str(f, "subject"), intro: optStr(f, "intro"), isEnabled: bool(f, "isEnabled") };
  if (!data.subject) throw new AppError("Objet requis");
  await db.emailTemplate.upsert({ where: { key }, create: { key, ...data }, update: data });
  await audit({ actorId: user.id, action: "email_template.save", entityType: "EmailTemplate", entityId: key });
  return { message: "Modèle enregistré", revalidate: ["/admin/emails"] };
});

// ─────────── Import CSV fournisseur et liaison produit ───────────
export const supplierCsvImportAction = adminAction("supplier:write", async (user, f) => {
  const { parseSupplierCsv } = await import("@/modules/suppliers/csv");
  const { applySupplierItem } = await import("@/modules/suppliers/service");
  const supplierId = str(f, "supplierId");
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) throw new AppError("Choisissez un fichier CSV.");
  if (file.size > 5 * 1024 * 1024) throw new AppError("Fichier trop volumineux (5 Mo max).");
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  const { items, errors } = parseSupplierCsv(await file.text());
  const sync = await db.supplierSync.create({ data: { supplierId, kind: "import", status: "RUNNING", startedAt: new Date(), triggeredById: user.id } });
  let updated = 0, priceChanges = 0;
  const log = [...errors];
  for (const item of items) {
    try {
      const r = await db.$transaction((tx) => applySupplierItem(tx, supplier, item));
      updated++;
      if (r.priceChanged) priceChanges++;
    } catch (e) {
      log.push(`${item.externalSku} : ${(e as Error).message}`);
    }
  }
  const errorsCount = log.length;
  await db.supplierSync.update({ where: { id: sync.id }, data: { status: errorsCount ? (updated ? "PARTIAL" : "FAILED") : "SUCCESS", finishedAt: new Date(), itemsTotal: items.length + errors.length, itemsUpdated: updated, priceChanges, errorsCount, log: log.slice(0, 200) } });
  await audit({ actorId: user.id, action: "supplier.csv_import", entityType: "Supplier", entityId: supplierId, changes: { updated, errorsCount } });
  return { message: `${updated} référence(s) importée(s), ${errorsCount} erreur(s).`, revalidate: [`/admin/fournisseurs/${supplierId}`, "/admin/synchronisations"] };
});

export const linkSupplierProductAction = adminAction("supplier:write", async (user, f) => {
  const id = str(f, "supplierProductId");
  const sku = str(f, "productSku");
  const product = sku ? await db.product.findFirst({ where: { sku, deletedAt: null } }) : null;
  if (sku && !product) throw new AppError(`Aucun produit avec le SKU ${sku}.`);
  const sp = await db.supplierProduct.update({ where: { id }, data: { productId: product?.id ?? null } });
  if (product) await db.product.update({ where: { id: product.id }, data: { supplierId: sp.supplierId, supplierReference: sp.externalSku } });
  await audit({ actorId: user.id, action: "supplier_product.link", entityType: "SupplierProduct", entityId: id, changes: { productId: product?.id ?? null } });
  return { message: product ? `Lié à ${product.name}` : "Liaison retirée", revalidate: [`/admin/fournisseurs/${sp.supplierId}`] };
});
