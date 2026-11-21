import type { ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { carrierTrackingUrl } from "@/integrations/tracking";
import { sendEmail } from "@/modules/emails/service";
import { orderTrackingUrl, transitionOrder, notifyStatusChange } from "@/modules/orders/service";

const SHIPMENT_TO_ORDER: Record<ShipmentStatus, Parameters<typeof transitionOrder>[2] | null> = {
  PENDING: null,
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED: "DELIVERY_FAILED",
  RETURNED: null,
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: "En attente",
  SHIPPED: "Expédié",
  IN_TRANSIT: "En transit",
  OUT_FOR_DELIVERY: "En cours de livraison",
  DELIVERED: "Livré",
  FAILED: "Échec de livraison",
  RETURNED: "Retourné à l'expéditeur",
};

/** Enregistre une expédition (saisie manuelle du transporteur et du numéro de suivi). */
export async function createShipment(args: { orderId: string; carrierId: string; trackingNumber: string; shippedAt?: Date; actorId: string }) {
  const tracking = args.trackingNumber.trim();
  if (!/^[A-Za-z0-9-]{4,40}$/.test(tracking)) throw new AppError("Numéro de suivi invalide.");
  const carrier = await db.carrier.findUnique({ where: { id: args.carrierId } });
  if (!carrier) throw new AppError("Transporteur inconnu.");
  const { shipment, order } = await db.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        orderId: args.orderId,
        carrierId: carrier.id,
        carrierName: carrier.name,
        trackingNumber: tracking,
        trackingUrl: carrierTrackingUrl(carrier.trackingUrlTemplate, tracking),
        status: "SHIPPED",
        source: "manual",
        shippedAt: args.shippedAt ?? new Date(),
      },
    });
    const r = await transitionOrder(tx, args.orderId, "SHIPPED", { actorId: args.actorId, message: `Expédiée avec ${carrier.name}` });
    return { shipment, order: r.order };
  });
  await sendEmail({
    type: "order_shipped",
    to: order.email,
    data: { orderNumber: order.number, carrier: carrier.name, trackingNumber: tracking, carrierUrl: shipment.trackingUrl, trackingUrl: orderTrackingUrl(order) },
    idempotencyKey: `order_shipped:${shipment.id}`,
    relatedOrderId: order.id,
  });
  return shipment;
}

/** Ajoute un événement de suivi réel (saisi par l'admin ou reçu d'une API) et met à jour les statuts. */
export async function addTrackingEvent(args: {
  shipmentId: string;
  occurredAt: Date;
  description: string;
  location?: string | null;
  status: ShipmentStatus;
  source?: string;
  actorId?: string | null;
  notify?: boolean;
}) {
  const res = await db.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: args.shipmentId }, include: { order: true } });
    const ev = await tx.trackingEvent
      .create({ data: { shipmentId: shipment.id, occurredAt: args.occurredAt, description: args.description.slice(0, 500), location: args.location, status: args.status, source: args.source ?? "manual" } })
      .catch((e: { code?: string }) => (e.code === "P2002" ? null : Promise.reject(e)));
    if (!ev) return null; // événement déjà connu
    await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: args.status, lastEventAt: args.occurredAt, lastEventText: args.description.slice(0, 200), ...(args.status === "DELIVERED" ? { deliveredAt: args.occurredAt } : {}) },
    });
    const target = SHIPMENT_TO_ORDER[args.status];
    let changed = false;
    if (target) {
      try {
        changed = (await transitionOrder(tx, shipment.orderId, target, { actorId: args.actorId, message: args.description })).changed;
      } catch {
        changed = false; // statut de commande plus avancé (ex. remboursée) : on garde l'événement colis
      }
    }
    return { ev, order: shipment.order, changed, target };
  });
  if (res && args.notify !== false) {
    if (res.target === "DELIVERED" && res.changed) await notifyStatusChange(res.order.id, "DELIVERED");
    else
      await sendEmail({
        type: "tracking_update",
        to: res.order.email,
        data: { orderNumber: res.order.number, status: SHIPMENT_STATUS_LABELS[args.status], description: args.description, trackingUrl: orderTrackingUrl(res.order) },
        idempotencyKey: `tracking_update:${res.ev.id}`,
        relatedOrderId: res.order.id,
      });
  }
  return res?.ev ?? null;
}
