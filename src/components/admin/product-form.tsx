"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { saveProductAction } from "@/actions/admin-products";
import { Input, Textarea, Select, Field, Checkbox } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export type ProductFormValues = Record<string, string | boolean | string[] | { url: string; alt: string }[] | null | undefined> & {
  images?: { url: string; alt: string }[];
  categoryIds?: string[];
};

type Opt = { id: string; name: string };

export function ProductForm({ initial, categories, suppliers, storageReady, canEditPrices }: { initial: ProductFormValues; categories: Opt[]; suppliers: Opt[]; storageReady: boolean; canEditPrices: boolean }) {
  const [state, action, pending] = useActionState(saveProductAction, null);
  const router = useRouter();
  const [images, setImages] = useState<{ url: string; alt: string }[]>(initial.images?.length ? initial.images : []);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const v = (k: string) => (typeof initial[k] === "string" ? (initial[k] as string) : "");

  useEffect(() => {
    if (state?.ok && state.data && !initial.id) router.replace(`/admin/produits/${state.data.id}`);
  }, [state, initial.id, router]);

  async function upload(file: File) {
    setUploadMsg("Envoi en cours…");
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, folder: "products" }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Échec");
      const put = await fetch(j.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!put.ok) throw new Error("Le stockage a refusé le fichier");
      if (!j.publicUrl) throw new Error("S3_PUBLIC_URL non configurée : fichier envoyé mais pas d'URL publique");
      setImages((im) => [...im, { url: j.publicUrl, alt: "" }]);
      setUploadMsg("Image ajoutée. Renseignez son texte alternatif.");
    } catch (e) {
      setUploadMsg((e as Error).message);
    }
  }

  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      {typeof initial.id === "string" && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-6">
        <Section title="Informations">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du produit *" className="sm:col-span-2"><Input name="name" defaultValue={v("name")} required minLength={2} /></Field>
            <Field label="Slug (URL)" hint="Généré depuis le nom si vide"><Input name="slug" defaultValue={v("slug")} /></Field>
            <Field label="Référence SKU *"><Input name="sku" defaultValue={v("sku")} required pattern="[A-Za-z0-9._-]+" /></Field>
            <Field label="Marque"><Input name="brand" defaultValue={v("brand")} /></Field>
            <Field label="Mots-clés (séparés par des virgules)"><Input name="tags" defaultValue={v("tags")} /></Field>
            <Field label="Description courte" className="sm:col-span-2"><Textarea name="shortDescription" defaultValue={v("shortDescription")} className="min-h-20" /></Field>
            <Field label="Description complète (Markdown)" className="sm:col-span-2"><Textarea name="description" defaultValue={v("description")} className="min-h-64 font-mono text-xs" /></Field>
          </div>
        </Section>

        <Section title="Images">
          {images.length === 0 && <p className="mb-3 text-sm text-muted">Aucune image. Ajoutez des photos réelles du produit (fournies par le fournisseur ou les vôtres).</p>}
          <div className="space-y-3">
            {images.map((im, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[80px_1fr_1fr_auto] sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {im.url ? <img src={im.url} alt="" className="size-20 rounded-lg object-cover" /> : <div className="size-20 rounded-lg bg-surface" />}
                <Input name="imageUrl" placeholder="https://…" value={im.url} onChange={(e) => setImages((a) => a.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} aria-label="URL de l'image" />
                <Input name="imageAlt" placeholder="Texte alternatif *" value={im.alt} onChange={(e) => setImages((a) => a.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} aria-label="Texte alternatif" />
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" disabled={i === 0} onClick={() => setImages((a) => { const b = [...a]; [b[i - 1], b[i]] = [b[i]!, b[i - 1]!]; return b; })} aria-label="Monter">↑</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImages((a) => a.filter((_, j) => j !== i))} aria-label="Retirer">✕</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setImages((a) => [...a, { url: "", alt: "" }])}>Ajouter une URL d&apos;image</Button>
            {storageReady ? (
              <label className="cursor-pointer text-sm font-semibold text-electric-600">
                Téléverser un fichier
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            ) : (
              <span className="text-xs text-amber-700">Téléversement : stockage R2/S3 non configuré</span>
            )}
            {uploadMsg && <span className="text-xs text-muted">{uploadMsg}</span>}
          </div>
        </Section>

        <Section title="Prix (TTC, en euros)">
          {!canEditPrices && <Alert tone="warning">Vous n&apos;avez pas la permission de modifier les prix : toute modification sera refusée.</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prix de vente TTC *"><Input name="priceCents" inputMode="decimal" defaultValue={v("priceCents")} required placeholder="0,00" /></Field>
            <Field label="Prix d'achat fournisseur HT *" hint="Sert au calcul de marge, jamais affiché"><Input name="costPriceCents" inputMode="decimal" defaultValue={v("costPriceCents")} required placeholder="0,00" /></Field>
            <Field label="Prix promotionnel TTC" hint="Uniquement pour une promotion réelle"><Input name="salePriceCents" inputMode="decimal" defaultValue={v("salePriceCents")} /></Field>
            <Field label="Prix de référence barré" hint="Doit correspondre à un prix réellement pratiqué (règle du prix antérieur)"><Input name="compareAtCents" inputMode="decimal" defaultValue={v("compareAtCents")} /></Field>
            <Field label="Début de promotion"><Input type="datetime-local" name="saleStartsAt" defaultValue={v("saleStartsAt")} /></Field>
            <Field label="Fin de promotion"><Input type="datetime-local" name="saleEndsAt" defaultValue={v("saleEndsAt")} /></Field>
            <Field label="Taux de TVA">
              <Select name="vatRateBps" defaultValue={v("vatRateBps") || "2000"}>
                <option value="2000">20 %</option><option value="1000">10 %</option><option value="550">5,5 %</option><option value="210">2,1 %</option><option value="0">0 %</option>
              </Select>
            </Field>
            <Field label="Motif du changement de prix" hint="Conservé dans l'historique des prix"><Input name="priceChangeReason" /></Field>
          </div>
        </Section>

        <Section title="Livraison et dimensions">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Poids (g)"><Input name="weightGrams" type="number" min={0} defaultValue={v("weightGrams")} /></Field>
            <Field label="Longueur (mm)"><Input name="lengthMm" type="number" min={0} defaultValue={v("lengthMm")} /></Field>
            <Field label="Largeur (mm)"><Input name="widthMm" type="number" min={0} defaultValue={v("widthMm")} /></Field>
            <Field label="Hauteur (mm)"><Input name="heightMm" type="number" min={0} defaultValue={v("heightMm")} /></Field>
            <Field label="Délai min. (jours)"><Input name="leadTimeMinDays" type="number" min={0} defaultValue={v("leadTimeMinDays")} /></Field>
            <Field label="Délai max. (jours)"><Input name="leadTimeMaxDays" type="number" min={0} defaultValue={v("leadTimeMaxDays")} /></Field>
          </div>
        </Section>

        <Section title="Conformité (sécurité des produits, GPSR)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pays d'origine"><Input name="originCountry" defaultValue={v("originCountry")} /></Field>
            <Field label="Personne responsable dans l'UE" hint="Nom et adresse (obligatoire pour les produits importés)"><Input name="euResponsiblePerson" defaultValue={v("euResponsiblePerson")} /></Field>
            <Field label="Avertissements et informations de sécurité" className="sm:col-span-2"><Textarea name="safetyInformation" defaultValue={v("safetyInformation")} /></Field>
            <Field label="Vidéos (URL https, une par ligne)" className="sm:col-span-2"><Textarea name="videoUrls" defaultValue={v("videoUrls")} className="min-h-16" /></Field>
          </div>
        </Section>

        <Section title="Référencement">
          <div className="grid gap-4">
            <Field label="Titre SEO" hint="60 caractères conseillés"><Input name="seoTitle" maxLength={120} defaultValue={v("seoTitle")} /></Field>
            <Field label="Meta description" hint="155 caractères conseillés"><Textarea name="seoDescription" maxLength={300} defaultValue={v("seoDescription")} className="min-h-20" /></Field>
            <Checkbox name="noIndex" label="Ne pas indexer cette page" defaultChecked={initial.noIndex === true} />
          </div>
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="Publication">
          <Field label="Statut">
            <Select name="status" defaultValue={v("status") || "DRAFT"}>
              <option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
            </Select>
          </Field>
          <p className="mt-2 text-xs text-muted">Un produit publié doit avoir au moins une image réelle. Vérifiez prix, stock et informations de sécurité avant publication.</p>
          {state && <div className="mt-4"><Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert></div>}
          <Button type="submit" className="mt-4 w-full" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        </Section>
        <Section title="Catégories">
          <Field label="Catégorie principale">
            <Select name="primaryCategoryId" defaultValue={v("primaryCategoryId")}>
              <option value="">Aucune</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
            {categories.length === 0 && <p className="text-xs text-muted">Créez d&apos;abord des catégories.</p>}
            {categories.map((c) => <Checkbox key={c.id} name="categoryIds" value={c.id} label={c.name} defaultChecked={initial.categoryIds?.includes(c.id)} />)}
          </div>
        </Section>
        <Section title="Stock et disponibilité">
          <div className="space-y-3">
            <Field label="Disponibilité affichée">
              <Select name="availability" defaultValue={v("availability") || "IN_STOCK"}>
                <option value="IN_STOCK">En stock</option><option value="LOW_STOCK">Stock limité</option><option value="ON_ORDER">Sur commande</option><option value="OUT_OF_STOCK">Rupture</option><option value="DISCONTINUED">Indisponible</option>
              </Select>
            </Field>
            <Checkbox name="trackInventory" label="Suivre le stock (bloque la vente au-delà du stock)" defaultChecked={initial.trackInventory !== false} />
            <Field label="Quantité en stock"><Input name="stockQuantity" type="number" min={0} defaultValue={v("stockQuantity")} /></Field>
            <Field label="Seuil d'alerte"><Input name="lowStockThreshold" type="number" min={0} defaultValue={v("lowStockThreshold") || "3"} /></Field>
          </div>
        </Section>
        <Section title="Fournisseur">
          <div className="space-y-3">
            <Field label="Fournisseur">
              <Select name="supplierId" defaultValue={v("supplierId")}>
                <option value="">Aucun</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Référence chez le fournisseur"><Input name="supplierReference" defaultValue={v("supplierReference")} /></Field>
          </div>
        </Section>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}
