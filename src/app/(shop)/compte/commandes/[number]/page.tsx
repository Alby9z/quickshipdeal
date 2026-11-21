import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findOrderForUser } from "@/modules/orders/queries";
import { db } from "@/lib/db";
import { OrderDetail } from "@/components/shop/order-detail";
import { ActionForm } from "@/components/account/forms";
import { requestReturnAction, submitReviewAction } from "@/actions/customer";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/form";

export const metadata = { title: "Détail de commande", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser();
  const order = await findOrderForUser(user.id, (await params).number);
  if (!order) notFound();
  const canReturn = ["DELIVERED", "SHIPPED", "IN_TRANSIT", "PARTIALLY_REFUNDED", "DELIVERY_FAILED"].includes(order.status);
  const canReview = ["DELIVERED", "RETURN_REQUESTED", "RETURN_RECEIVED", "PARTIALLY_REFUNDED"].includes(order.status);
  const reviews = canReview ? await db.review.findMany({ where: { orderItemId: { in: order.items.map((i) => i.id) } } }) : [];
  return (
    <div className="space-y-8">
      <OrderDetail order={order} invoiceBase="/compte/factures" />
      {canReturn && (
        <details className="rounded-2xl border border-line bg-white p-6">
          <summary className="cursor-pointer text-lg font-bold">Demander un retour</summary>
          <ActionForm action={requestReturnAction} submit="Envoyer la demande" className="mt-4 space-y-4">
            <input type="hidden" name="orderId" value={order.id} />
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Articles concernés</legend>
              {order.items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" name="item" value={i.id} id={`it-${i.id}`} className="accent-orange-500" />
                  <label htmlFor={`it-${i.id}`} className="flex-1">{i.productName}{i.variantName ? ` (${i.variantName})` : ""}</label>
                  <input type="number" name={`qty-${i.id}`} min={1} max={i.quantity} defaultValue={i.quantity} aria-label="Quantité" className="h-9 w-16 rounded-lg border border-line px-2" />
                </div>
              ))}
            </fieldset>
            <Field label="Motif" htmlFor="reason">
              <Select id="reason" name="reason" required>
                <option value="Changement d'avis (rétractation)">Changement d&apos;avis (rétractation)</option>
                <option value="Produit défectueux">Produit défectueux</option>
                <option value="Produit non conforme">Produit non conforme à la description</option>
                <option value="Colis endommagé">Colis endommagé</option>
                <option value="Erreur de produit">Erreur de produit</option>
                <option value="Autre">Autre</option>
              </Select>
            </Field>
            <Field label="Précisions" htmlFor="details"><Textarea id="details" name="details" rows={3} /></Field>
            <Checkbox name="withdrawal" label="J'exerce mon droit de rétractation (14 jours)." />
          </ActionForm>
        </details>
      )}
      {canReview && (
        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold">Donner mon avis</h2>
          <div className="mt-4 space-y-6">
            {order.items.filter((i) => i.productId).map((i) => {
              const r = reviews.find((x) => x.orderItemId === i.id);
              return (
                <div key={i.id} className="rounded-xl bg-surface p-4">
                  <p className="font-semibold">{i.productName}</p>
                  {r && <p className="text-xs text-muted">Avis {r.status === "APPROVED" ? "publié" : r.status === "PENDING" ? "en attente de modération" : "refusé"}</p>}
                  <ActionForm action={submitReviewAction} submit={r ? "Modifier mon avis" : "Publier mon avis"} variant="night" className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <input type="hidden" name="orderItemId" value={i.id} />
                    <Field label="Note" htmlFor={`r-${i.id}`}><Select id={`r-${i.id}`} name="rating" defaultValue={r?.rating ?? 5}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</Select></Field>
                    <Field label="Titre" htmlFor={`t-${i.id}`}><Input id={`t-${i.id}`} name="title" defaultValue={r?.title ?? ""} /></Field>
                    <Field label="Votre avis" htmlFor={`b-${i.id}`} className="sm:col-span-2"><Textarea id={`b-${i.id}`} name="body" rows={3} defaultValue={r?.body ?? ""} required minLength={10} /></Field>
                  </ActionForm>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
