import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
export const generateMetadata = () => cmsMetadata("terms", "/cgv");
export default function Page() { return <CmsPage pageKey="terms" eyebrow="Informations légales" />; }
