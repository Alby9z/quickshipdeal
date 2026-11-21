import { db } from "@/lib/db";
import { CmsPage, cmsMetadata } from "@/components/shop/cms-page";
import { JsonLd } from "@/modules/seo/jsonld";

export const generateMetadata = () => cmsMetadata("faq", "/faq");

/** FAQ Schema généré à partir des titres ### / paragraphes de la page publiée. */
function extractFaq(md: string) {
  const out: { q: string; a: string }[] = [];
  const parts = md.split(/^### /m).slice(1);
  for (const p of parts) {
    const [q, ...rest] = p.split("\n");
    const a = rest.join(" ").split(/^## /m)[0]!.trim();
    if (q && a) out.push({ q: q.trim(), a });
  }
  return out;
}

export default async function Page() {
  const page = await db.page.findUnique({ where: { key: "faq" } });
  const faq = page?.status === "PUBLISHED" ? extractFaq(page.content) : [];
  return (
    <>
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
      <CmsPage pageKey="faq" eyebrow="Aide" />
    </>
  );
}
