import { db } from "@/lib/db";
import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td, Pager, SearchBar } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Checkbox } from "@/components/ui/form";
import { Badge, Alert } from "@/components/ui/misc";
import { retryEmailAction, saveEmailTemplateAction } from "@/actions/admin-ops";
import { EMAIL_STATUS_LABELS } from "@/components/admin/status";
import { EMAIL_TYPE_LABELS } from "@/modules/emails/templates";
import { integrationStatus } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "E-mails" };
const PER = 40;
const TONE = { QUEUED: "neutral", SENT: "electric", DELIVERED: "green", BOUNCED: "red", FAILED: "red", SKIPPED_NOT_CONFIGURED: "amber" } as const;

export default async function Emails({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireStaff("email:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.EmailLogWhereInput = sp.q ? { OR: [{ to: { contains: sp.q, mode: "insensitive" } }, { subject: { contains: sp.q, mode: "insensitive" } }] } : {};
  const [rows, total, templates] = await Promise.all([db.emailLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }), db.emailLog.count({ where }), db.emailTemplate.findMany({ orderBy: { key: "asc" } })]);
  return (
    <>
      <AdminTitle title="E-mails transactionnels" description="Historique de chaque e-mail, avec son statut réel chez Resend." />
      {!integrationStatus().resend && <Alert tone="warning" title="Resend non configuré">Les e-mails sont journalisés mais non envoyés (statut « non envoyé »). Renseignez RESEND_API_KEY et EMAIL_FROM sur un domaine vérifié, puis relancez-les.</Alert>}
      <div className="mt-4"><SearchBar placeholder="Destinataire ou objet" defaultValue={sp.q} /></div>
      <Table head={["Date", "Type", "Destinataire", "Objet", "Statut", "Essais", ""]} empty={rows.length === 0}>
        {rows.map((e) => (
          <tr key={e.id}>
            <Td className="whitespace-nowrap">{formatDate(e.createdAt, true)}</Td>
            <Td>{EMAIL_TYPE_LABELS[e.type as keyof typeof EMAIL_TYPE_LABELS] ?? e.type}</Td><Td>{e.to}</Td><Td>{e.subject}</Td>
            <Td><Badge tone={TONE[e.status]}>{EMAIL_STATUS_LABELS[e.status]}</Badge>{e.error && <p className="mt-1 max-w-xs text-xs text-red-600">{e.error}</p>}</Td>
            <Td>{e.attempts}</Td>
            <Td>{["FAILED", "BOUNCED", "SKIPPED_NOT_CONFIGURED"].includes(e.status) && <AdminForm action={retryEmailAction} submit="Renvoyer" variant="outline" inline><input type="hidden" name="id" value={e.id} /></AdminForm>}</Td>
          </tr>
        ))}
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/emails?q=${encodeURIComponent(sp.q ?? "")}`} />
      {hasPermission(user, "settings:write") && (
        <Panel title="Modèles d'e-mails" className="mt-8">
          <div className="space-y-2">
            {templates.map((t) => (
              <AdminForm key={t.id} action={saveEmailTemplateAction} submit="OK" inline className="rounded-xl border border-line p-3">
                <input type="hidden" name="key" value={t.key} />
                <span className="w-48 text-sm font-medium">{EMAIL_TYPE_LABELS[t.key as keyof typeof EMAIL_TYPE_LABELS] ?? t.key}</span>
                <Input name="subject" defaultValue={t.subject} className="h-9 min-w-64 flex-1" aria-label="Objet" />
                <Input name="intro" defaultValue={t.intro ?? ""} placeholder="Introduction personnalisée" className="h-9 min-w-64 flex-1" />
                <Checkbox name="isEnabled" label="Actif" defaultChecked={t.isEnabled} />
              </AdminForm>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
