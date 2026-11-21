import Link from "next/link";
import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
export const generateMetadata = () => cmsMetadata("privacy", "/confidentialite");
export default function Page() {
  return (
    <CmsPage pageKey="privacy" eyebrow="Informations légales">
      <div className="mt-10 rounded-2xl border border-line bg-surface p-5 text-sm">
        <p className="font-semibold">Exercer vos droits</p>
        <p className="mt-1 text-muted">Depuis votre <Link href="/compte/profil" className="text-electric-500 underline">espace client</Link> : export de vos données et demande de suppression. Ou via le <Link href="/contact" className="text-electric-500 underline">formulaire de contact</Link> (catégorie « Données personnelles »).</p>
      </div>
    </CmsPage>
  );
}
