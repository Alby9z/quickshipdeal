"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { toActionError, type ActionResult } from "@/lib/errors";
import { requireUser } from "@/modules/auth/session";
import { addressSchema } from "@/modules/checkout/schemas";
import { anonymizeUser, createReturnRequest, submitReview } from "@/modules/customers/service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function saveAddressAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const id = form.get("id") ? String(form.get("id")) : null;
    const data = addressSchema.parse(Object.fromEntries(form));
    const isDefault = form.get("isDefault") === "on";
    await db.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefaultShipping: false, isDefaultBilling: false } });
      const payload = { ...data, company: data.company || null, line2: data.line2 || null, phone: data.phone || null, isDefaultShipping: isDefault, isDefaultBilling: isDefault };
      if (id) {
        const owned = await tx.address.findFirst({ where: { id, userId: user.id } });
        if (!owned) throw new Error("Adresse introuvable");
        await tx.address.update({ where: { id }, data: payload });
      } else await tx.address.create({ data: { ...payload, userId: user.id } });
    });
    revalidatePath("/compte/adresses");
    return { ok: true, message: "Adresse enregistrée" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.address.updateMany({ where: { id, userId: user.id }, data: { deletedAt: new Date() } });
  revalidatePath("/compte/adresses");
  return { ok: true };
}

export async function updateProfileAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30).optional(), marketing: z.string().optional() }).parse(Object.fromEntries(form));
    const optIn = d.marketing === "on";
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { name: d.name } }),
      db.customerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, phone: d.phone || null, marketingOptIn: optIn, marketingOptInAt: optIn ? new Date() : null },
        update: { phone: d.phone || null, marketingOptIn: optIn, marketingOptInAt: optIn ? new Date() : null },
      }),
    ]);
    revalidatePath("/compte/profil");
    return { ok: true, message: "Profil mis à jour" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function changePasswordAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const d = z.object({ current: z.string().min(1), next: z.string().min(10).max(128) }).parse(Object.fromEntries(form));
    await auth.api.changePassword({ body: { currentPassword: d.current, newPassword: d.next, revokeOtherSessions: true }, headers: await headers() });
    return { ok: true, message: "Mot de passe modifié. Vos autres sessions ont été déconnectées." };
  } catch {
    return { ok: false, error: "Mot de passe actuel incorrect ou nouveau mot de passe trop court (10 caractères)." };
  }
}

export async function deleteAccountAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (form.get("confirm") !== "SUPPRIMER") return { ok: false, error: "Tapez SUPPRIMER pour confirmer." };
    await anonymizeUser(user.id, user.id);
  } catch (e) {
    return toActionError(e);
  }
  redirect("/?compte=supprime");
}

export async function requestReturnAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const orderId = z.string().parse(form.get("orderId"));
    const items = form.getAll("item").map(String).map((id) => ({ orderItemId: id, quantity: Number(form.get(`qty-${id}`) ?? 1) }));
    const r = await createReturnRequest({
      userId: user.id,
      orderId,
      items,
      reason: z.string().trim().min(3).max(200).parse(form.get("reason")),
      details: String(form.get("details") ?? "").slice(0, 2000) || undefined,
      isWithdrawal: form.get("withdrawal") === "on",
    });
    revalidatePath("/compte/retours");
    return { ok: true, message: `Demande ${r.number} enregistrée.` };
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitReviewAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await submitReview({
      userId: user.id,
      orderItemId: z.string().parse(form.get("orderItemId")),
      rating: Number(form.get("rating")),
      title: String(form.get("title") ?? "").slice(0, 120) || undefined,
      body: z.string().trim().min(10, "10 caractères minimum").max(3000).parse(form.get("body")),
    });
    return { ok: true, message: "Merci ! Votre avis sera publié après modération." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function replyTicketAction(_: unknown, form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const ticketId = z.string().parse(form.get("ticketId"));
    const body = z.string().trim().min(2).max(5000).parse(form.get("body"));
    const t = await db.supportTicket.findFirst({ where: { id: ticketId, userId: user.id } });
    if (!t) return { ok: false, error: "Demande introuvable." };
    await db.$transaction([
      db.supportMessage.create({ data: { ticketId, authorId: user.id, body } }),
      db.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN" } }),
    ]);
    revalidatePath(`/compte/support`);
    return { ok: true, message: "Message envoyé" };
  } catch (e) {
    return toActionError(e);
  }
}
