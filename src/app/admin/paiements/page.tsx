import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Table, Td, Pager, Stat } from "@/components/admin/ui";
import { Badge, Alert } from "@/components/ui/misc";
import { formatEuros } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PAYMENT_LABELS } from "@/components/admin/status";
import { integrationStatus } from "@/lib/env";

export const metadata = { title: "Paiements" };
const PER = 40;
const TONE = { SUCCEEDED: "green", FAILED: "red", DISPUTED: "red", PENDING: "neutral", CANCELLED: "neutral", REFUNDED: "night", PARTIALLY_REFUNDED: "night" } as const;

export default async function Payments({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("order:read");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [rows, total, ok, failed, disputes] = await Promise.all([
    db.payment.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { order: { select: { id: true, number: true, email: true } } } }),
    db.payment.count(),
    db.payment.aggregate({ where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amountCents: true } }),
    db.payment.count({ where: { status: "FAILED" } }),
    db.payment.count({ where: { status: "DISPUTED" } }),
  ]);
  const webhooks = await db.processedWebhookEvent.findMany({ where: { provider: "stripe" }, orderBy: { processedAt: "desc" }, take: 10 });
  return (
    <>
      <AdminTitle title="Paiements" description="Paiements enregistrés uniquement à partir des webhooks Stripe signés." />
      {!integrationStatus().stripe && <Alert tone="warning" title="Stripe non configuré">Aucun paiement ne peut être encaissé tant que STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET ne sont pas renseignées.</Alert>}
      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Encaissé (brut)" value={formatEuros(ok._sum.amountCents ?? 0)} tone="green" />
        <Stat label="Paiements échoués" value={failed} tone="orange" />
        <Stat label="Litiges" value={disputes} tone="red" />
      </div>
      <Table head={["Date", "Commande", "Client", "Montant", "Moyen", "Statut", "Détail"]} empty={rows.length === 0}>
        {rows.map((p) => (
          <tr key={p.id}>
            <Td className="whitespace-nowrap">{formatDate(p.createdAt, true)}</Td>
            <Td><Link href={`/admin/commandes/${p.order.id}`} className="font-medium hover:text-electric-600">{p.order.number}</Link></Td>
            <Td>{p.order.email}</Td><Td>{formatEuros(p.amountCents)}</Td><Td>{p.paymentMethodType ?? "—"}</Td>
            <Td><Badge tone={TONE[p.status]}>{PAYMENT_LABELS[p.status]}</Badge></Td>
            <Td className="text-xs text-muted">{p.failureMessage ?? (p.disputeId ? `Litige ${p.disputeStatus}` : "")}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base="/admin/paiements" />
      <h2 className="mb-2 mt-8 font-bold">Derniers webhooks Stripe reçus</h2>
      <Table head={["Reçu le", "Événement", "Type", "Traitement"]} empty={webhooks.length === 0}>
        {webhooks.map((w) => <tr key={w.id}><Td>{formatDate(w.processedAt, true)}</Td><Td className="font-mono text-xs">{w.id}</Td><Td>{w.type}</Td><Td>{w.status}{w.error ? ` · ${w.error}` : ""}</Td></tr>)}
      </Table>
    </>
  );
}
