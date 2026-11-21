import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Pager } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { moderateReviewAction } from "@/actions/admin-ops";
import { REVIEW_LABELS } from "@/components/admin/status";
import { formatDate } from "@/lib/utils";
import type { ReviewStatus } from "@prisma/client";

export const metadata = { title: "Avis clients" };
const PER = 20;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireStaff("review:write");
  const sp = await searchParams;
  const status = (sp.status && sp.status in REVIEW_LABELS ? sp.status : "PENDING") as ReviewStatus;
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, total] = await Promise.all([
    db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { product: { select: { name: true, id: true } }, user: { select: { name: true } }, orderItem: { select: { order: { select: { number: true, id: true } } } } } }),
    db.review.count({ where: { status } }),
  ]);
  return (
    <>
      <AdminTitle title="Avis clients" description="Seuls les clients ayant acheté et payé le produit peuvent déposer un avis. Les avis négatifs ne doivent pas être écartés pour ce seul motif." />
      <nav className="mb-4 flex gap-2 text-sm">{Object.entries(REVIEW_LABELS).map(([k, l]) => <Link key={k} href={`/admin/avis?status=${k}`} className={`rounded-full px-3 py-1 ${k === status ? "bg-night-900 text-white" : "bg-white"}`}>{l}</Link>)}</nav>
      {rows.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">Aucun avis {(REVIEW_LABELS[status] ?? "").toLowerCase()}.</p>}
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm"><strong>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</strong> · <Link href={`/admin/produits/${r.product.id}`} className="text-electric-600">{r.product.name}</Link> · {r.user.name} · {formatDate(r.createdAt)} · <Link href={`/admin/commandes/${r.orderItem.order.id}`} className="text-muted">{r.orderItem.order.number}</Link> <Badge tone="green">Achat vérifié</Badge></p>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
            <AdminForm action={moderateReviewAction} submit="Valider" inline className="mt-3">
              <input type="hidden" name="id" value={r.id} />
              <Select name="status" defaultValue={r.status} className="h-9 w-36" aria-label="Statut"><option value="APPROVED">Publier</option><option value="REJECTED">Refuser</option><option value="PENDING">En attente</option></Select>
              <Textarea name="adminReply" defaultValue={r.adminReply ?? ""} placeholder="Réponse publique (facultatif)" className="min-h-9 flex-1 py-2" />
            </AdminForm>
          </article>
        ))}
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/avis?status=${status}`} />
    </>
  );
}
