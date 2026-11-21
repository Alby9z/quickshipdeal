import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { supportReplyAction, supportStatusAction } from "@/actions/admin-ops";
import { TICKET_LABELS } from "@/components/admin/status";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ticket" };

export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("support:write");
  const { id } = await params;
  const t = await db.supportTicket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } }, order: { select: { id: true, number: true } }, user: { select: { id: true } } } });
  if (!t) notFound();
  return (
    <>
      <AdminTitle title={`${t.number} · ${t.subject}`} description={<>{t.name} · {t.email} {t.user && <Link className="text-electric-600" href={`/admin/clients/${t.user.id}`}>fiche client</Link>} {t.order && <>· commande <Link className="text-electric-600" href={`/admin/commandes/${t.order.id}`}>{t.order.number}</Link></>} · <Badge>{TICKET_LABELS[t.status]}</Badge></>} actions={<Link href="/admin/support" className="text-sm text-muted">← Support</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {t.messages.map((m) => (
            <div key={m.id} className={cn("max-w-2xl rounded-2xl border p-4 text-sm", m.fromStaff ? "ml-auto border-electric-200 bg-electric-50" : "border-line bg-white")}>
              <p className="mb-1 text-xs text-muted">{m.fromStaff ? m.author?.name ?? "Équipe" : t.name ?? t.email} · {formatDate(m.createdAt, true)}</p>
              <p className="whitespace-pre-line">{m.body}</p>
            </div>
          ))}
          <Panel title="Répondre">
            <AdminForm action={supportReplyAction} submit="Envoyer la réponse">
              <input type="hidden" name="ticketId" value={t.id} />
              <Textarea name="body" required className="min-h-32" />
              <Select name="status" defaultValue="PENDING_CUSTOMER"><option value="PENDING_CUSTOMER">Puis : en attente du client</option><option value="RESOLVED">Puis : résolu</option><option value="OPEN">Puis : laisser ouvert</option></Select>
            </AdminForm>
          </Panel>
        </div>
        <Panel title="Statut">
          <AdminForm action={supportStatusAction} submit="Mettre à jour"><input type="hidden" name="ticketId" value={t.id} /><Select name="status" defaultValue={t.status}>{Object.entries(TICKET_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></AdminForm>
        </Panel>
      </div>
    </>
  );
}
