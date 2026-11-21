import type { Metadata } from "next";
import { getSetting } from "@/modules/settings/service";
import { PageHeader } from "@/components/ui/misc";
import { ContactForm } from "@/components/shop/contact-form";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = { title: "Contact", description: "Contactez le service client QuickShipDeals.", alternates: { canonical: "/contact" } };

export default async function Page() {
  const b = await getSetting("business");
  return (
    <>
      <PageHeader eyebrow="Service client" title="Contactez-nous" description="Une question sur une commande, un produit ou vos données ? Écrivez-nous." />
      <div className="container-page mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ContactForm />
        <aside className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-6 text-sm">
          {b.email && <p className="flex gap-3"><Mail className="size-5 text-orange-500" aria-hidden /><a href={`mailto:${b.email}`} className="hover:underline">{b.email}</a></p>}
          {b.phone && <p className="flex gap-3"><Phone className="size-5 text-orange-500" aria-hidden /><a href={`tel:${b.phone.replace(/\s/g, "")}`} className="hover:underline">{b.phone}</a></p>}
          {(b.contactAddress || b.registeredAddress) && <p className="flex gap-3"><MapPin className="size-5 shrink-0 text-orange-500" aria-hidden />{b.contactAddress || b.registeredAddress}</p>}
        </aside>
      </div>
    </>
  );
}
