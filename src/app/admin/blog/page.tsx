import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { saveBlogCategoryAction } from "@/actions/admin-content";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Blog" };
const L = { DRAFT: "Brouillon", SCHEDULED: "Programmé", PUBLISHED: "Publié", ARCHIVED: "Archivé" } as const;

export default async function Blog() {
  await requireStaff("content:write");
  const [posts, cats] = await Promise.all([db.blogPost.findMany({ orderBy: { updatedAt: "desc" }, include: { category: true } }), db.blogCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } })]);
  return (
    <>
      <AdminTitle title="Blog" description="Articles de conseils et guides. Les articles programmés sont publiés automatiquement à leur date." actions={<Button asChild><Link href="/admin/blog/nouveau">Nouvel article</Link></Button>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Table head={["Titre", "Catégorie", "Statut", "Publication", "Modifié"]} empty={posts.length === 0}>
          {posts.map((p) => <tr key={p.id}><Td><Link href={`/admin/blog/${p.id}`} className="font-semibold hover:text-electric-600">{p.title}</Link></Td><Td>{p.category?.name ?? "—"}</Td><Td><Badge tone={p.status === "PUBLISHED" ? "green" : p.status === "SCHEDULED" ? "electric" : "neutral"}>{L[p.status]}</Badge></Td><Td>{formatDate(p.publishAt, true)}</Td><Td>{formatDate(p.updatedAt)}</Td></tr>)}
        </Table>
        <Panel title="Catégories du blog">
          <ul className="mb-3 space-y-1 text-sm">{cats.map((c) => <li key={c.id}>{c.name} <span className="text-muted">({c._count.posts})</span></li>)}</ul>
          <AdminForm action={saveBlogCategoryAction} submit="Ajouter" inline><Input name="name" placeholder="Nouvelle catégorie" className="h-9 flex-1" required /></AdminForm>
        </Panel>
      </div>
    </>
  );
}
