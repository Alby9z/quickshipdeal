import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { JsonLd, organizationJsonLd } from "@/modules/seo/jsonld";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={await organizationJsonLd()} />
      <Header />
      <main id="contenu">{children}</main>
      <Footer />
      <CookieConsent />
    </>
  );
}
