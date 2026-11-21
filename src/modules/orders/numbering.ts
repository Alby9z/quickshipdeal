import type { Tx } from "@/lib/db";

/** Numéro séquentiel sans trou, verrouillé dans la transaction (UPSERT atomique). */
export async function nextSequence(tx: Tx, key: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Sequence" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Sequence"."value" + 1
    RETURNING "value"`;
  const v = rows[0]?.value;
  if (v == null) throw new Error("Séquence indisponible");
  return Number(v);
}

export async function nextOrderNumber(tx: Tx, prefix = "QSD", now = new Date()) {
  const y = now.getFullYear();
  return `${prefix}-${y}-${String(await nextSequence(tx, `order:${y}`)).padStart(6, "0")}`;
}
export async function nextInvoiceNumber(tx: Tx, prefix = "F", now = new Date()) {
  const y = now.getFullYear();
  return `${prefix}-${y}-${String(await nextSequence(tx, `invoice:${y}`)).padStart(6, "0")}`;
}
export async function nextReturnNumber(tx: Tx, now = new Date()) {
  const y = now.getFullYear();
  return `RET-${y}-${String(await nextSequence(tx, `return:${y}`)).padStart(5, "0")}`;
}
export async function nextTicketNumber(tx: Tx, now = new Date()) {
  const y = now.getFullYear();
  return `SAV-${y}-${String(await nextSequence(tx, `ticket:${y}`)).padStart(5, "0")}`;
}
