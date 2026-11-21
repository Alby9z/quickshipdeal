import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { listPosts } from "@/modules/blog/queries";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { clampInt, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog", description: "Conseils, guides et actualités QuickShipDeals.", alternates: { canonical: "/blog" } };
export const revalidate = 120;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; categorie?: string; tag?: string }> }) {
  const sp = await searchParams;
  const page = clampInt(sp.page, 1, 100, 1);
  const [{ items, pages }, cats] = await Promise.all([listPosts(page, sp.categorie, sp.tag), db.blogCategory.findMany({ orderBy: { name: "asc" } })]);
  return (
    <>
      <PageHeader eyebrow="Blog" title="Conseils et actualités" />
      <div className="container-page mt-10">
        {cats.length > 0 && (
          <nav className="mb-6 flex flex-wrap gap-2" aria-label="Catégories du blog">
            <Link href="/blog" className="rounded-full bg-surface px-3 py-1 text-sm">Tous</Link>
            {cats.map((c) => <Link key={c.id} href={`/blog?categorie=${c.slug}`} className="rounded-full bg-surface px-3 py-1 text-sm hover:bg-electric-100">{c.name}</Link>)}
          </nav>
        )}
        {items.length === 0 ? (
          <EmptyState icon={<Newspaper className="size-7" aria-hidden />} title="Aucun article publié pour le moment" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                {p.coverUrl && <div className="relative aspect-[16/9]"><Image src={p.coverUrl} alt={p.coverAlt ?? ""} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" /></div>}
                <div className="p-5">
                  <p className="text-xs text-muted">{p.category?.name ? `${p.category.name} · ` : ""}{formatDate(p.publishAt ?? p.createdAt)}</p>
                  <h2 className="mt-1 text-lg font-bold"><Link href={`/blog/${p.slug}`} className="hover:text-electric-500">{p.title}</Link></h2>
                  {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{p.excerpt}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Pagination">
            {page > 1 && <Link href={`/blog?page=${page - 1}`} className="rounded-xl border border-line px-4 py-2 text-sm">Précédent</Link>}
            {page < pages && <Link href={`/blog?page=${page + 1}`} className="rounded-xl border border-line px-4 py-2 text-sm">Suivant</Link>}
          </nav>
        )}
      </div>
    </>
  );
}
