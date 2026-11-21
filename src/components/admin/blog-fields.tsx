import { Input, Select, Textarea, Checkbox, Field } from "@/components/ui/form";
import type { BlogPost, SeoMetadata } from "@prisma/client";

const dt = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function BlogFields({ p, categories }: { p?: BlogPost & { seo: SeoMetadata | null }; categories: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="space-y-4">
        <Field label="Titre *"><Input name="title" defaultValue={p?.title} required /></Field>
        <Field label="Chapô"><Textarea name="excerpt" defaultValue={p?.excerpt ?? ""} className="min-h-20" /></Field>
        <Field label="Contenu (Markdown)"><Textarea name="content" defaultValue={p?.content ?? ""} className="min-h-[28rem] font-mono text-xs" /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Statut"><Select name="status" defaultValue={p?.status ?? "DRAFT"}><option value="DRAFT">Brouillon</option><option value="SCHEDULED">Programmé</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option></Select></Field>
        <Field label="Date de publication (si programmé)"><Input name="publishAt" type="datetime-local" defaultValue={dt(p?.publishAt)} /></Field>
        <Field label="Slug"><Input name="slug" defaultValue={p?.slug ?? ""} /></Field>
        <Field label="Catégorie"><Select name="categoryId" defaultValue={p?.categoryId ?? ""}><option value="">Aucune</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Étiquettes (virgules)"><Input name="tags" defaultValue={p?.tags.join(", ") ?? ""} /></Field>
        <Field label="Image de couverture (URL https)"><Input name="coverUrl" defaultValue={p?.coverUrl ?? ""} /></Field>
        <Field label="Texte alternatif de l'image"><Input name="coverAlt" defaultValue={p?.coverAlt ?? ""} /></Field>
        <Field label="Titre SEO"><Input name="seoTitle" defaultValue={p?.seo?.title ?? ""} /></Field>
        <Field label="Meta description"><Textarea name="seoDescription" defaultValue={p?.seo?.description ?? ""} className="min-h-16" /></Field>
        <Checkbox name="noIndex" label="Ne pas indexer" defaultChecked={p?.seo?.noIndex ?? false} />
      </div>
    </div>
  );
}
