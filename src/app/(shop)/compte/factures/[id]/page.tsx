import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { InvoiceView } from "@/components/shop/invoice-view";

export const metadata = { title: "Facture", robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const invoice = await db.invoice.findFirst({ where: { id: (await params).id, order: { userId: user.id } } });
  if (!invoice) notFound();
  return <InvoiceView invoice={invoice} />;
}
