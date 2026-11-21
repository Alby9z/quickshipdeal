"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const COOKIE = "qsd_consent";
type Consent = { necessary: true; analytics: boolean; marketing: boolean; at: string };

function read(): Consent | null {
  const m = document.cookie.match(/(?:^|; )qsd_consent=([^;]+)/);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as Consent;
  } catch {
    return null;
  }
}
function write(c: Omit<Consent, "necessary" | "at">) {
  const v: Consent = { necessary: true, ...c, at: new Date().toISOString() };
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(v))}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new CustomEvent("qsd-consent", { detail: v }));
}

/**
 * Bandeau de consentement : aucun cookie non essentiel n'est déposé sans accord.
 * "Refuser" est aussi simple qu'"Accepter" (recommandations CNIL). Consentement conservé 6 mois.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    if (!read()) setOpen(true);
    const h = () => setOpen(true);
    window.addEventListener("qsd-open-consent", h);
    return () => window.removeEventListener("qsd-open-consent", h);
  }, []);
  if (!open) return null;
  const done = (a: boolean, m: boolean) => {
    write({ analytics: a, marketing: m });
    setOpen(false);
  };
  return (
    <div role="dialog" aria-labelledby="cc-title" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-white p-5 shadow-lift sm:inset-x-6">
      <h2 id="cc-title" className="text-base font-bold">Vos choix en matière de cookies</h2>
      <p className="mt-2 text-sm text-muted">
        Nous utilisons des cookies strictement nécessaires (session, panier). Avec votre accord, nous pourrions utiliser des cookies de mesure d&apos;audience ou marketing ; aucun n&apos;est actif aujourd&apos;hui. <Link href="/cookies" className="text-electric-500 underline">En savoir plus</Link>
      </p>
      {custom && (
        <div className="mt-3 space-y-2 rounded-xl bg-surface p-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked disabled /> Nécessaires (toujours actifs)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Mesure d&apos;audience</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Marketing</label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => done(false, false)}>Tout refuser</Button>
        <Button variant="night" size="sm" onClick={() => done(true, true)}>Tout accepter</Button>
        {custom ? <Button variant="ghost" size="sm" onClick={() => done(analytics, marketing)}>Enregistrer mes choix</Button> : <Button variant="ghost" size="sm" onClick={() => setCustom(true)}>Personnaliser</Button>}
      </div>
    </div>
  );
}

export function CookieSettingsLink() {
  return <button type="button" className="hover:text-white" onClick={() => window.dispatchEvent(new Event("qsd-open-consent"))}>Gérer les cookies</button>;
}
