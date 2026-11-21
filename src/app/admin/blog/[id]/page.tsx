import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle } from "@/components/admin/ui";
import { BlogEditor } from "@/components/admin/blog-editor";
import { BlogFields } from "@/components/admin/blog-fields";
import { Button } from "@/components/ui/button";
import { deleteBlogPostAction } from "@/actions/admin-content";

export const metadata = { title: "Article" };
export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content:write");
  const { id } = await params;
  const [p, categories] = await Promise.all([db.blogPost.findUnique({ where: { id }, include: { seo: true } }), db.blogCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })]);
  if (!p) notFound();
  return (
    <>
      <AdminTitle title={p.title} actions={<>{p.status === "PUBLISHED" && <Button asChild variant="outline"><Link href={`/blog/${p.slug}`} target="_blank">Voir</Link></Button>}<form action={deleteBlogPostAction.bind(null, p.id)}><Button variant="danger" type="submit">Supprimer</Button></form></>} />
      <BlogEditor isNew={false}><BlogFields p={p} categories={categories} /></BlogEditor>
    </>
  );
}
