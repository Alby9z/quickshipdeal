import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { productCardInclude, publicProductWhere, toCard } from "@/modules/catalog/repository";
import { ProductGrid } from "@/components/shop/product-card";
import { EmptyState } from "@/components/ui/misc";
import { Heart } from "lucide-react";

export const metadata = { title: "Mes favoris", robots: { index: false } };
export default async function Page() {
  const user = await requireUser("/compte/favoris");
  const [items, recent] = await Promise.all([
    db.wishlistItem.findMany({ where: { wishlist: { userId: user.id }, product: publicProductWhere() }, include: { product: { include: productCardInclude } }, orderBy: { createdAt: "desc" } }),
    db.recentlyViewed.findMany({ where: { userId: user.id, product: publicProductWhere() }, include: { product: { include: productCardInclude } }, orderBy: { viewedAt: "desc" }, take: 8 }),
  ]);
  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-6 text-3xl font-extrabold">Mes favoris</h1>
        {items.length === 0 ? <EmptyState icon={<Heart className="size-7" />} title="Aucun favori">Cliquez sur le cœur d&apos;une fiche produit pour l&apos;ajouter ici.</EmptyState> : <ProductGrid products={items.map((i) => toCard(i.product))} />}
      </section>
      {recent.length > 0 && <section><h2 className="mb-4 text-xl font-bold">Consultés récemment</h2><ProductGrid products={recent.map((r) => toCard(r.product))} /></section>}
    </div>
  );
}
