import { siteUrl } from "@/lib/env";
import { getSetting } from "@/modules/settings/service";

/** Sérialisation JSON-LD sûre (échappe "<" pour empêcher toute injection de balise). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export async function organizationJsonLd() {
  const b = await getSetting("business");
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: b.tradeName || "QuickShipDeals",
    url: siteUrl(),
    logo: `${siteUrl()}/logo.png`,
    ...(b.email ? { email: b.email } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.legalName ? { legalName: b.legalName } : {}),
    ...(b.siret ? { identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: b.siret.replace(/\s/g, "") } } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${siteUrl()}${it.path}` })),
  };
}
