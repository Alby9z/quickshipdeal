import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ActionForm } from "@/components/account/forms";
import { replyTicketAction } from "@/actions/customer";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/form";

export const metadata = { title: "Support", robots: { index: false } };
const LABELS = { OPEN: "Ouvert", PENDING_CUSTOMER: "Réponse reçue", RESOLVED: "Résolu", CLOSED: "Clôturé" } as const;

export default async function Page() {
  const user = await requireUser();
  const tickets = await db.supportTicket.findMany({ where: { OR: [{ userId: user.id }, { email: user.email }] }, include: { messages: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-extrabold">Support et réclamations</h1><Link href="/contact" className="text-sm font-semibold text-electric-500">Nouvelle demande</Link></div>
      {tickets.length === 0 ? <EmptyState title="Aucune demande" /> : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <details key={t.id} className="rounded-2xl border border-line bg-white p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2"><span className="font-semibold">{t.number} · {t.subject}</span><Badge tone={t.status === "PENDING_CUSTOMER" ? "orange" : "neutral"}>{LABELS[t.status]}</Badge></summary>
              <ul className="mt-4 space-y-3">
                {t.messages.map((m) => <li key={m.id} className={`rounded-xl p-3 text-sm ${m.fromStaff ? "bg-electric-100/60" : "bg-surface"}`}><p className="text-xs text-muted">{m.fromStaff ? "QuickShipDeals" : "Vous"} · {formatDate(m.createdAt, true)}</p><p className="mt-1 whitespace-pre-wrap">{m.body}</p></li>)}
              </ul>
              {t.status !== "CLOSED" && t.userId === user.id && (
                <ActionForm action={replyTicketAction} submit="Répondre" variant="night" className="mt-4 space-y-3"><input type="hidden" name="ticketId" value={t.id} /><Textarea name="body" rows={3} required aria-label="Votre message" /></ActionForm>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
