import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
export const generateMetadata = () => cmsMetadata("about", "/a-propos");
export default function Page() { return <CmsPage pageKey="about" eyebrow="QuickShipDeals" />; }
