import { notFound } from "next/navigation";
import { requireStaff } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { InvoiceView } from "@/components/shop/invoice-view";

export const metadata = { title: "Facture" };
export default async function AdminInvoice({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("order:read");
  const invoice = await db.invoice.findUnique({ where: { id: (await params).id } });
  if (!invoice) notFound();
  return <div className="rounded-2xl bg-white p-4"><InvoiceView invoice={invoice} /></div>;
}
