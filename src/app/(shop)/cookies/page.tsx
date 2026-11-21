import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
export const generateMetadata = () => cmsMetadata("cookies", "/cookies");
export default function Page() { return <CmsPage pageKey="cookies" eyebrow="Informations légales" />; }
