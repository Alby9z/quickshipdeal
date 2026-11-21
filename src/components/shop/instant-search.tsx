"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

/** Recherche instantanée : met à jour les résultats pendant la frappe (anti-rebond 300 ms). */
export function InstantSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (q === initial) return;
    const t = setTimeout(() => start(() => router.replace(q.trim() ? `/recherche?q=${encodeURIComponent(q.trim())}` : "/recherche", { scroll: false })), 300);
    return () => clearTimeout(t);
  }, [q, initial, router]);
  return (
    <div className="relative">
      <label htmlFor="instant-q" className="sr-only">Rechercher</label>
      <input id="instant-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Nom, référence, mot-clé…" className="h-13 w-full rounded-2xl border border-white/15 bg-white pl-12 pr-12 text-base text-ink focus:outline-none focus:ring-4 focus:ring-orange-500/40" />
      <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
      {pending && <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted" aria-label="Recherche en cours" />}
    </div>
  );
}
