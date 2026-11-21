import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "QuickShipDeals — Boutique en ligne", template: "%s | QuickShipDeals" },
  description: "QuickShipDeals, boutique en ligne de vente à distance sur catalogue général. Paiement sécurisé et suivi de livraison.",
  applicationName: "QuickShipDeals",
  openGraph: { type: "website", siteName: "QuickShipDeals", locale: "fr_FR", images: [{ url: "/logo.png", width: 143, height: 142, alt: "QuickShipDeals" }] },
  twitter: { card: "summary" },
  icons: { icon: "/favicon.ico", apple: "/logo.png" },
  robots: process.env.APP_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1b3f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Aller au contenu</a>
        {children}
      </body>
    </html>
  );
}
