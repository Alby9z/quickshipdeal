import { db } from "@/lib/db";

export const orderDetailInclude = {
  items: true,
  events: { where: { isPublic: true }, orderBy: { createdAt: "asc" } },
  shipments: { include: { events: { orderBy: { occurredAt: "desc" } } }, orderBy: { createdAt: "asc" } },
  invoices: { orderBy: { issuedAt: "asc" } },
  returnRequests: { orderBy: { createdAt: "desc" } },
} as const;

/** Accès invité : numéro + clé secrète (lien e-mail) OU numéro + e-mail de commande. */
export async function findOrderForGuest(number: string, opts: { token?: string; email?: string }) {
  if (!number || (!opts.token && !opts.email)) return null;
  const order = await db.order.findUnique({ where: { number: number.trim().toUpperCase() }, include: orderDetailInclude });
  if (!order) return null;
  if (opts.token && order.guestAccessToken && opts.token === order.guestAccessToken) return order;
  if (opts.email && order.email.toLowerCase() === opts.email.trim().toLowerCase()) return order;
  return null;
}

export async function findOrderForUser(userId: string, number: string) {
  return db.order.findFirst({ where: { number, userId }, include: orderDetailInclude });
}
