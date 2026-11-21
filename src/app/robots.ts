import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const prod = process.env.APP_ENV === "production";
  return {
    rules: prod
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/compte", "/api", "/panier", "/commande", "/recherche", "/facture", "/connexion", "/inscription"] }]
      : [{ userAgent: "*", disallow: "/" }], // préproduction / développement : jamais indexé
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
