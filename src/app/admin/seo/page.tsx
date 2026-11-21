import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td, Stat } from "@/components/admin/ui";
import { siteUrl } from "@/lib/env";

export const metadata = { title: "SEO" };

export default async function Seo() {
  await requireStaff("content:write");
  const [products, missingMeta, noImageAlt, posts, cats] = await Promise.all([
    db.product.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    db.product.findMany({ where: { status: "PUBLISHED", deletedAt: null, OR: [{ seo: null }, { seo: { description: null } }] }, select: { id: true, name: true }, take: 50 }),
    db.productImage.count({ where: { alt: "" } }),
    db.blogPost.findMany({ where: { status: "PUBLISHED", OR: [{ seo: null }, { seo: { description: null } }] }, select: { id: true, title: true }, take: 50 }),
    db.category.findMany({ where: { isVisible: true, OR: [{ seo: null }, { seo: { description: null } }] }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="space-y-6">
      <AdminTitle title="SEO" description="Plan du site, robots et données structurées sont générés automatiquement à partir du contenu publié." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Produits publiés" value={products} />
        <Stat label="Produits sans meta description" value={missingMeta.length} tone={missingMeta.length ? "orange" : "green"} />
        <Stat label="Images sans texte alternatif" value={noImageAlt} tone={noImageAlt ? "red" : "green"} />
      </div>
      <Panel title="Fichiers générés">
        <ul className="space-y-1 text-sm">
          <li><a className="text-electric-600" href="/sitemap.xml" target="_blank">{siteUrl()}/sitemap.xml</a></li>
          <li><a className="text-electric-600" href="/robots.txt" target="_blank">{siteUrl()}/robots.txt</a></li>
          <li className="text-muted">JSON-LD : Organization, Product (avec avis uniquement s&apos;ils existent), BreadcrumbList, Article.</li>
        </ul>
      </Panel>
      <Panel title="À compléter">
        <Table head={["Élément", "Type"]} empty={!missingMeta.length && !posts.length && !cats.length}>
          {missingMeta.map((p) => <tr key={p.id}><Td><Link className="text-electric-600" href={`/admin/produits/${p.id}`}>{p.name}</Link></Td><Td>Produit</Td></tr>)}
          {posts.map((p) => <tr key={p.id}><Td><Link className="text-electric-600" href={`/admin/blog/${p.id}`}>{p.title}</Link></Td><Td>Article</Td></tr>)}
          {cats.map((c) => <tr key={c.id}><Td><Link className="text-electric-600" href="/admin/categories">{c.name}</Link></Td><Td>Catégorie</Td></tr>)}
        </Table>
      </Panel>
    </div>
  );
}
