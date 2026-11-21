import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Un article est public s'il est publié, ou programmé et dont la date est passée. */
export const publicPostWhere = (): Prisma.BlogPostWhereInput => ({
  OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishAt: { lte: new Date() } }],
});
export async function listPosts(page = 1, categorySlug?: string, tag?: string) {
  const where: Prisma.BlogPostWhereInput = { AND: [publicPostWhere(), categorySlug ? { category: { slug: categorySlug } } : {}, tag ? { tags: { has: tag } } : {}] };
  const [items, total] = await Promise.all([
    db.blogPost.findMany({ where, orderBy: { publishAt: "desc" }, skip: (page - 1) * 12, take: 12, include: { category: true, author: { select: { name: true } } } }),
    db.blogPost.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / 12)) };
}
