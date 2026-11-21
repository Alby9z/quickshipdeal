import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, Stat } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { SHIPMENT_STATUS_LABELS } from "@/modules/shipping/service";
import type { ShipmentStatus } from "@prisma/client";

export const metadata = { title: "Livraisons" };
const PER = 40;

export default async function Shipments({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireStaff("order:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.status && sp.status in SHIPMENT_STATUS_LABELS ? { status: sp.status as ShipmentStatus } : {};
  const [rows, total, toShip, stale] = await Promise.all([
    db.shipment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: { select: { id: true, number: true } }, carrier: { select: { name: true } } } }),
    db.shipment.count({ where }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "SUPPLIER_PROCESSING", "SUPPLIER_ORDERED", "AWAITING_SHIPMENT"] } } }),
    db.shipment.count({ where: { status: { in: ["SHIPPED", "IN_TRANSIT"] }, OR: [{ lastEventAt: { lt: new Date(Date.now() - 7 * 86400000) } }, { lastEventAt: null, shippedAt: { lt: new Date(Date.now() - 7 * 86400000) } }] } }),
  ]);
  return (
    <>
      <AdminTitle title="Livraisons" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Commandes à expédier" value={toShip} tone="orange" />
        <Stat label="Colis sans nouvelles depuis 7 jours" value={stale} tone="red" hint="À vérifier sur le site du transporteur" />
      </div>
      <form className="mb-4 flex gap-2">
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 rounded-xl border border-line bg-white px-3 text-sm" aria-label="Statut"><option value="">Tous</option>{Object.entries(SHIPMENT_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="h-10 rounded-xl bg-night-900 px-4 text-sm font-semibold text-white">Filtrer</button>
      </form>
      <Table head={["Expédié le", "Commande", "Transporteur", "N° de suivi", "Statut", "Dernier événement"]} empty={rows.length === 0}>
        {rows.map((s) => (
          <tr key={s.id}>
            <Td>{formatDate(s.shippedAt)}</Td>
            <Td><Link href={`/admin/commandes/${s.order.id}`} className="font-medium hover:text-electric-600">{s.order.number}</Link></Td>
            <Td>{s.carrier?.name ?? s.carrierName}</Td>
            <Td>{s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-electric-600">{s.trackingNumber}</a> : <span className="font-mono text-xs">{s.trackingNumber}</span>}</Td>
            <Td><Badge tone={s.status === "DELIVERED" ? "green" : s.status === "FAILED" || s.status === "RETURNED" ? "red" : "orange"}>{SHIPMENT_STATUS_LABELS[s.status]}</Badge></Td>
            <Td className="text-xs">{s.lastEventText ?? "—"}<br /><span className="text-muted">{formatDate(s.lastEventAt, true)}</span></Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/livraisons?status=${sp.status ?? ""}`} />
    </>
  );
}
