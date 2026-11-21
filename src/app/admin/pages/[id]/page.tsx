import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select, Textarea, Checkbox, Field } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { savePageAction } from "@/actions/admin-content";

export const metadata = { title: "Page" };
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content:write");
  const p = await db.page.findUnique({ where: { id: (await params).id }, include: { seo: true } });
  if (!p) notFound();
  const todo = (p.content.match(/\[À COMPLÉTER[^\]]*\]/gi) ?? []).length;
  return (
    <>
      <AdminTitle title={p.title} description={`/${p.slug}`} actions={<Link href={`/${p.slug}`} target="_blank" className="text-sm text-electric-600">Aperçu</Link>} />
      {p.needsLegalReview && <Alert tone="warning" title="Texte juridique à valider">Ce modèle ne constitue pas un conseil juridique. Complétez les mentions manquantes ({todo}) et faites-le relire avant publication.</Alert>}
      <AdminForm action={savePageAction} submit="Enregistrer" className="mt-4 space-y-4 rounded-2xl border border-line bg-white p-5">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Titre"><Input name="title" defaultValue={p.title} /></Field>
          <Field label="Statut"><Select name="status" defaultValue={p.status}><option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publiée</option></Select></Field>
        </div>
        <Field label="Contenu (Markdown)"><Textarea name="content" defaultValue={p.content} className="min-h-[32rem] font-mono text-xs" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre SEO"><Input name="seoTitle" defaultValue={p.seo?.title ?? ""} /></Field>
          <Field label="Meta description"><Input name="seoDescription" defaultValue={p.seo?.description ?? ""} /></Field>
        </div>
        <Checkbox name="noIndex" label="Ne pas indexer" defaultChecked={p.seo?.noIndex ?? false} />
        {p.needsLegalReview && <Checkbox name="legalReviewed" label="Je confirme que ce texte a été complété et vérifié (par moi-même ou un professionnel du droit)." />}
      </AdminForm>
    </>
  );
}
