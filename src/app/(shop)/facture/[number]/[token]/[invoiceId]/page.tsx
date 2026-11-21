import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { findOrderForGuest } from "@/modules/orders/queries";
import { InvoiceView } from "@/components/shop/invoice-view";

export const metadata = { title: "Facture", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ number: string; token: string; invoiceId: string }> }) {
  const p = await params;
  const order = await findOrderForGuest(p.number, { token: p.token });
  if (!order) notFound();
  const invoice = await db.invoice.findFirst({ where: { id: p.invoiceId, orderId: order.id } });
  if (!invoice) notFound();
  return <InvoiceView invoice={invoice} />;
}
