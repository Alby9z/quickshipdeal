import { db } from "@/lib/db";

/** Libère le stock réservé et annule une commande non payée. */
export async function releaseOrder(orderId: string, reason: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
    if (!order || order.status !== "PENDING_PAYMENT") return;
    for (const i of order.items) {
      if (!i.product?.trackInventory) continue;
      const where = i.variantId ? { variantId: i.variantId } : { productId: i.productId! };
      const inv = await tx.inventory.findUnique({ where: where as never });
      if (inv)
        await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = GREATEST(0, "reserved" - ${i.quantity}), "updatedAt" = now() WHERE "id" = ${inv.id}`;
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date() } });
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
    await tx.orderEvent.create({ data: { orderId, fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", message: reason, isPublic: false } });
  });
}
