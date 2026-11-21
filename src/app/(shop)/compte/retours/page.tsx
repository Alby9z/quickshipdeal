import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Mes retours", robots: { index: false } };
const LABELS = { REQUESTED: "Demandé", APPROVED: "Accepté", REJECTED: "Refusé", RECEIVED: "Reçu", REFUNDED: "Remboursé", CLOSED: "Clôturé" } as const;

export default async function Page() {
  const user = await requireUser();
  const list = await db.returnRequest.findMany({ where: { userId: user.id }, include: { order: { select: { number: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold">Mes retours</h1>
      {list.length === 0 ? <EmptyState title="Aucune demande de retour">Les retours se demandent depuis le détail d&apos;une <Link href="/compte/commandes" className="text-electric-500 underline">commande</Link>.</EmptyState> : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{r.number} · commande {r.order.number}</p><Badge tone="electric">{LABELS[r.status]}</Badge></div>
              <p className="mt-1 text-sm text-muted">{r.reason} · {formatDate(r.createdAt)}{r.isWithdrawal ? " · rétractation" : ""}</p>
              {r.adminNote && <p className="mt-2 rounded-lg bg-surface p-3 text-sm">{r.adminNote}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
