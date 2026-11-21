"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/actions/account";

const KEY = "qsd_recent";

/** Mémorise les produits consultés : en base pour les clients connectés, localement sinon. */
export function TrackView({ productId, slug, name }: { productId: string; slug: string; name: string }) {
  useEffect(() => {
    recordViewAction(productId).catch(() => undefined);
    try {
      const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as { slug: string; name: string }[];
      const next = [{ slug, name }, ...list.filter((x) => x.slug !== slug)].slice(0, 12);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible */
    }
  }, [productId, slug, name]);
  return null;
}
