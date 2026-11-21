import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
export const generateMetadata = () => cmsMetadata("returns", "/politique-de-retour");
export default function Page() { return <CmsPage pageKey="returns" eyebrow="Informations légales" />; }
