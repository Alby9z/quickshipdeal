import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/modules/orders/status";

export type Period = { from: Date; to: Date; bucket: "hour" | "day" | "month"; label: string };

export function resolvePeriod(p?: string, from?: string, to?: string, now = new Date()): Period {
  const end = new Date(now);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (p) {
    case "today":
      return { from: startOfDay(now), to: end, bucket: "hour", label: "Aujourd'hui" };
    case "7d":
      return { from: new Date(startOfDay(now).getTime() - 6 * 86400000), to: end, bucket: "day", label: "7 derniers jours" };
    case "12m":
      return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: end, bucket: "month", label: "12 derniers mois" };
    case "custom": {
      const f = from ? new Date(from) : null;
      const t = to ? new Date(`${to}T23:59:59`) : null;
      if (f && t && !Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && f <= t) {
        const days = (t.getTime() - f.getTime()) / 86400000;
        return { from: f, to: t, bucket: days > 92 ? "month" : "day", label: "Période personnalisée" };
      }
      return resolvePeriod("30d", undefined, undefined, now);
    }
    default:
      return { from: new Date(startOfDay(now).getTime() - 29 * 86400000), to: end, bucket: "day", label: "30 derniers jours" };
  }
}

/**
 * Indicateurs calculés exclusivement à partir des données réelles.
 * - CA encaissé = Σ total des commandes payées − remboursements effectifs.
 * - Marge brute estimée = Σ (articles − remise − TVA articles) − coût d'achat figé à la commande.
 * - Bénéfice estimé = marge brute + frais de port facturés − remboursements (hors coûts de transport réels non connus).
 */
export async function dashboardKpis(period: Period) {
  const paidWhere = { paidAt: { gte: period.from, lte: period.to }, status: { in: PAID_STATUSES.concat(["REFUNDED"]) } };
  const [agg, refunds, ordersCount, pending, customers, newCustomers, published, unavailable, inDelivery, latest, alerts] = await Promise.all([
    db.order.aggregate({ where: paidWhere, _sum: { totalCents: true, costTotalCents: true, taxCents: true, shippingCents: true, discountCents: true, subtotalCents: true }, _count: true }),
    db.refund.aggregate({ where: { status: "SUCCEEDED", updatedAt: { gte: period.from, lte: period.to } }, _sum: { amountCents: true }, _count: true }),
    db.order.count({ where: { createdAt: { gte: period.from, lte: period.to } } }),
    db.order.count({ where: { status: { in: ["PAID", "CONFIRMED", "SUPPLIER_PROCESSING", "SUPPLIER_ORDERED", "AWAITING_SHIPMENT"] } } }),
    db.user.count({ where: { deletedAt: null, roles: { some: { role: { key: "CUSTOMER" } } } } }),
    db.user.count({ where: { deletedAt: null, createdAt: { gte: period.from, lte: period.to }, roles: { some: { role: { key: "CUSTOMER" } } } } }),
    db.product.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    db.product.count({ where: { status: "PUBLISHED", deletedAt: null, availability: { in: ["OUT_OF_STOCK", "DISCONTINUED"] } } }),
    db.shipment.count({ where: { status: { in: ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, email: true, totalCents: true, status: true, createdAt: true } }),
    db.notification.findMany({ where: { audience: "admin", readAt: null }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const s = agg._sum;
  const revenueGross = s.totalCents ?? 0;
  const refunded = refunds._sum.amountCents ?? 0;
  const itemsNet = (s.subtotalCents ?? 0) - (s.discountCents ?? 0) - (s.taxCents ?? 0);
  const margin = itemsNet - (s.costTotalCents ?? 0);
  return {
    revenueCents: revenueGross - refunded,
    revenueGrossCents: revenueGross,
    paidOrders: agg._count,
    ordersCount,
    pending,
    refundsCents: refunded,
    refundsCount: refunds._count,
    customers,
    newCustomers,
    published,
    unavailable,
    inDelivery,
    marginCents: margin,
    profitCents: margin + (s.shippingCents ?? 0) - refunded,
    averageBasketCents: agg._count ? Math.round(revenueGross / agg._count) : 0,
    latest,
    alerts,
  };
}

/** Série temporelle du CA et du nombre de commandes payées (agrégation SQL). */
export async function revenueSeries(period: Period) {
  const trunc = period.bucket;
  const rows = await db.$queryRawUnsafe<{ bucket: Date; revenue: bigint; orders: bigint }[]>(
    `SELECT date_trunc('${trunc}', "paidAt" AT TIME ZONE 'Europe/Paris') AS bucket, COALESCE(SUM("totalCents"),0)::bigint AS revenue, COUNT(*)::bigint AS orders
     FROM "Order" WHERE "paidAt" >= $1 AND "paidAt" <= $2 GROUP BY 1 ORDER BY 1`,
    period.from,
    period.to,
  );
  // Remplit les intervalles vides pour une courbe continue.
  const out: { label: string; revenue: number; orders: number }[] = [];
  const map = new Map(rows.map((r) => [new Date(r.bucket).toISOString().slice(0, trunc === "month" ? 7 : trunc === "day" ? 10 : 13), r]));
  const cur = new Date(period.from);
  while (cur <= period.to && out.length < 400) {
    const key = cur.toISOString().slice(0, trunc === "month" ? 7 : trunc === "day" ? 10 : 13);
    const r = map.get(key);
    out.push({
      label: trunc === "month" ? cur.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) : trunc === "day" ? cur.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : `${cur.getHours()}h`,
      revenue: Number(r?.revenue ?? 0) / 100,
      orders: Number(r?.orders ?? 0),
    });
    if (trunc === "month") cur.setMonth(cur.getMonth() + 1);
    else if (trunc === "day") cur.setDate(cur.getDate() + 1);
    else cur.setHours(cur.getHours() + 1);
  }
  return out;
}

export async function topProducts(period: Period, take = 10) {
  const rows = await db.orderItem.groupBy({
    by: ["productId", "productName"],
    where: { order: { paidAt: { gte: period.from, lte: period.to } } },
    _sum: { quantity: true, lineTotalCents: true },
    orderBy: { _sum: { lineTotalCents: "desc" } },
    take,
  });
  return rows.map((r) => ({ productId: r.productId, name: r.productName, quantity: r._sum.quantity ?? 0, revenueCents: r._sum.lineTotalCents ?? 0 }));
}
