import { NextResponse } from "next/server";
import { guardApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { clampInt } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders?status=CONFIRMED&since=2026-01-01&page=1
 * Commandes payées pour intégrations logistiques/comptables. Auth : Bearer <API_V1_TOKEN>.
 */
export async function GET(req: Request) {
  const denied = await guardApi(req);
  if (denied) return denied;
  const u = new URL(req.url);
  const page = clampInt(u.searchParams.get("page"), 1, 10000, 1);
  const since = u.searchParams.get("since");
  const status = u.searchParams.get("status");
  if (status && !(status in ORDER_STATUS_LABELS)) return NextResponse.json({ error: "Statut inconnu" }, { status: 400 });
  const where = {
    paymentStatus: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] as ("SUCCEEDED" | "PARTIALLY_REFUNDED" | "REFUNDED")[] },
    ...(status ? { status: status as never } : {}),
    ...(since && !Number.isNaN(Date.parse(since)) ? { createdAt: { gte: new Date(since) } } : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { items: { select: { sku: true, productName: true, quantity: true, unitPriceCents: true, supplierReference: true, supplierOrderRef: true } }, shipments: { select: { carrierName: true, trackingNumber: true, status: true } } } }),
    db.order.count({ where }),
  ]);
  return NextResponse.json({
    data: orders.map((o) => ({ number: o.number, status: o.status, paymentStatus: o.paymentStatus, totalCents: o.totalCents, currency: o.currency, createdAt: o.createdAt, paidAt: o.paidAt, shippingAddress: o.shippingAddress, items: o.items, shipments: o.shipments })),
    meta: { page, perPage: 50, total },
  });
}
