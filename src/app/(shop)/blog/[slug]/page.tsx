import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { publicPostWhere } from "@/modules/blog/queries";
import { Markdown } from "@/components/shop/markdown";
import { JsonLd, breadcrumbJsonLd } from "@/modules/seo/jsonld";
import { formatDate } from "@/lib/utils";

const load = (slug: string) => db.blogPost.findFirst({ where: { slug, ...publicPostWhere() }, include: { seo: true, category: true, author: { select: { name: true } } } });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  return {
    title: p.seo?.title ?? p.title,
    description: p.seo?.description ?? p.excerpt ?? undefined,
    alternates: { canonical: `/blog/${p.slug}` },
    robots: p.seo?.noIndex ? { index: false } : undefined,
    openGraph: { type: "article", title: p.title, images: p.coverUrl ? [{ url: p.coverUrl, alt: p.coverAlt ?? "" }] : undefined, publishedTime: p.publishAt?.toISOString() },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <article className="container-page mt-10 max-w-3xl">
      <JsonLd data={[{ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: (p.publishAt ?? p.createdAt).toISOString(), dateModified: p.updatedAt.toISOString(), author: p.author ? { "@type": "Person", name: p.author.name } : undefined, image: p.coverUrl ?? undefined, mainEntityOfPage: `${siteUrl()}/blog/${p.slug}` }, breadcrumbJsonLd([{ name: "Blog", path: "/blog" }, { name: p.title, path: `/blog/${p.slug}` }])]} />
      <Link href="/blog" className="text-sm text-electric-500">← Blog</Link>
      <h1 className="mt-3 text-4xl font-extrabold">{p.title}</h1>
      <p className="mt-2 text-sm text-muted">{formatDate(p.publishAt ?? p.createdAt)}{p.author ? ` · ${p.author.name}` : ""}{p.category ? ` · ${p.category.name}` : ""}</p>
      {p.coverUrl && <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl"><Image src={p.coverUrl} alt={p.coverAlt ?? ""} fill priority sizes="768px" className="object-cover" /></div>}
      <div className="mt-8"><Markdown>{p.content}</Markdown></div>
      {p.tags.length > 0 && <p className="mt-8 flex flex-wrap gap-2">{p.tags.map((t) => <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-surface px-3 py-1 text-xs">#{t}</Link>)}</p>}
    </article>
  );
}
