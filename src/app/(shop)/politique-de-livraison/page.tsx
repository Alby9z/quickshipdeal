import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
export const generateMetadata = () => cmsMetadata("shipping", "/politique-de-livraison");
export default function Page() { return <CmsPage pageKey="shipping" eyebrow="Informations légales" />; }
