import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; desinscription?: string }> }) {
  const { t, desinscription } = await searchParams;
  let ok = false;
  if (t) {
    const sub = await db.newsletterSubscriber.findUnique({ where: { confirmToken: t } });
    if (sub) {
      await db.newsletterSubscriber.update({
        where: { id: sub.id },
        data: desinscription ? { status: "unsubscribed", unsubscribedAt: new Date() } : { status: "confirmed", consentAt: new Date() },
      });
      ok = true;
    }
  }
  return (
    <div className="container-page mt-16 max-w-xl">
      {ok ? <Alert tone="success" title={desinscription ? "Désinscription confirmée" : "Inscription confirmée"}>{desinscription ? "Vous ne recevrez plus la newsletter." : "Merci ! Vous recevrez désormais nos nouveautés et offres."}</Alert> : <Alert tone="error" title="Lien invalide ou expiré" />}
    </div>
  );
}
