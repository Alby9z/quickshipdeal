import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle } from "@/components/admin/ui";
import { BlogEditor } from "@/components/admin/blog-editor";
import { BlogFields } from "@/components/admin/blog-fields";

export const metadata = { title: "Nouvel article" };
export default async function NewPost() {
  await requireStaff("content:write");
  const categories = await db.blogCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <><AdminTitle title="Nouvel article" /><BlogEditor isNew><BlogFields categories={categories} /></BlogEditor></>;
}
