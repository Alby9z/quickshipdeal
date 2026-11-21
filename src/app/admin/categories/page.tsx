import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select, Textarea, Checkbox, Field } from "@/components/ui/form";
import { saveCategoryAction, deleteCategoryAction } from "@/actions/admin-products";

export const metadata = { title: "Catégories" };

type Cat = { id: string; name: string; slug: string; description: string | null; parentId: string | null; position: number; isVisible: boolean; imageUrl: string | null; seo: { title: string | null; description: string | null } | null; _count: { primaryProducts: number } };

function CategoryFields({ c, all }: { c?: Cat; all: Cat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Nom *"><Input name="name" defaultValue={c?.name} required /></Field>
      <Field label="Slug"><Input name="slug" defaultValue={c?.slug} /></Field>
      <Field label="Catégorie parente">
        <Select name="parentId" defaultValue={c?.parentId ?? ""}><option value="">Aucune (niveau 1)</option>{all.filter((x) => x.id !== c?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
      </Field>
      <Field label="Ordre"><Input name="position" type="number" defaultValue={c?.position ?? 0} /></Field>
      <Field label="Image (URL https)" className="sm:col-span-2"><Input name="imageUrl" defaultValue={c?.imageUrl ?? ""} /></Field>
      <Field label="Description" className="sm:col-span-2"><Textarea name="description" defaultValue={c?.description ?? ""} className="min-h-16" /></Field>
      <Field label="Titre SEO"><Input name="seoTitle" defaultValue={c?.seo?.title ?? ""} /></Field>
      <Field label="Meta description"><Input name="seoDescription" defaultValue={c?.seo?.description ?? ""} /></Field>
      <Checkbox name="isVisible" label="Visible en boutique" defaultChecked={c?.isVisible ?? true} />
    </div>
  );
}

export default async function Categories() {
  await requireStaff("category:write");
  const all = await db.category.findMany({ orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }], include: { seo: { select: { title: true, description: true } }, _count: { select: { primaryProducts: true } } } });
  const roots = all.filter((c) => !c.parentId);
  const childrenOf = (id: string) => all.filter((c) => c.parentId === id);
  const Item = ({ c, depth }: { c: Cat; depth: number }) => (
    <>
      <details className="rounded-xl border border-line bg-white" style={{ marginLeft: depth * 24 }}>
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-3 text-sm"><span className="font-semibold">{c.name}</span><span className="text-xs text-muted">/{c.slug} · {c._count.primaryProducts} produit(s){c.isVisible ? "" : " · masquée"}</span></summary>
        <div className="space-y-3 border-t border-line p-4">
          <AdminForm action={saveCategoryAction} submit="Enregistrer"><CategoryFields c={c} all={all} /></AdminForm>
          <AdminForm action={deleteCategoryAction} submit="Supprimer" variant="outline" confirm="Supprimer cette catégorie ?"><input type="hidden" name="id" value={c.id} /></AdminForm>
        </div>
      </details>
      {childrenOf(c.id).map((ch) => <Item key={ch.id} c={ch} depth={depth + 1} />)}
    </>
  );
  return (
    <>
      <AdminTitle title="Catégories" description="Arborescence du catalogue." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-2">
          {all.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">Aucune catégorie. Créez la première avec le formulaire.</p>}
          {roots.map((c) => <Item key={c.id} c={c} depth={0} />)}
        </div>
        <Panel title="Nouvelle catégorie"><AdminForm action={saveCategoryAction} submit="Créer"><CategoryFields all={all} /></AdminForm></Panel>
      </div>
    </>
  );
}
