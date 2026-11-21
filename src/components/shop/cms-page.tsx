import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileClock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/modules/auth/session";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { Markdown } from "./markdown";
import { formatDate } from "@/lib/utils";

export async function cmsMetadata(key: string, path: string): Promise<Metadata> {
  const p = await db.page.findUnique({ where: { key }, include: { seo: true } });
  if (!p) return {};
  return { title: p.seo?.title ?? p.title, description: p.seo?.description ?? undefined, alternates: { canonical: path }, robots: p.status !== "PUBLISHED" || p.seo?.noIndex ? { index: false } : undefined };
}

/** Page de contenu administrable. Non publiée : visible uniquement par l'équipe (aperçu). */
export async function CmsPage({ pageKey, eyebrow, children }: { pageKey: string; eyebrow?: string; children?: React.ReactNode }) {
  const page = await db.page.findUnique({ where: { key: pageKey } });
  if (!page) notFound();
  const published = page.status === "PUBLISHED";
  const user = published ? null : await getCurrentUser();
  const preview = !published && user?.isStaff;
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={page.title} />
      <div className="container-page mt-10 max-w-3xl">
        {preview && <Alert tone="warning" title="Aperçu administrateur" className="mb-6">Cette page n&apos;est pas publiée{page.needsLegalReview ? " et doit être validée juridiquement avant publication" : ""}. Les visiteurs voient un message « en cours de rédaction ».</Alert>}
        {published || preview ? (
          <>
            <Markdown>{page.content}</Markdown>
            <p className="mt-10 text-xs text-muted">Dernière mise à jour : {formatDate(page.updatedAt)}</p>
          </>
        ) : (
          <EmptyState icon={<FileClock className="size-7" aria-hidden />} title="Page en cours de rédaction">Ce contenu sera publié prochainement. Pour toute question, contactez-nous.</EmptyState>
        )}
        {children}
      </div>
    </>
  );
}
