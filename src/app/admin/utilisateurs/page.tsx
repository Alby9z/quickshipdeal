import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel, Table, Td } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Input, Select } from "@/components/ui/form";
import { grantRoleAction, revokeRoleAction } from "@/actions/admin-content";
import { ROLES } from "@/modules/auth/permissions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Administrateurs" };
const STAFF = Object.entries(ROLES).filter(([k]) => k !== "CUSTOMER");

export default async function Admins() {
  await requireStaff("user:write");
  const users = await db.user.findMany({ where: { deletedAt: null, roles: { some: { role: { key: { not: "CUSTOMER" } } } } }, include: { roles: { include: { role: true } }, sessions: { orderBy: { updatedAt: "desc" }, take: 1 } }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <AdminTitle title="Administrateurs" description="Chaque membre de l'équipe utilise son propre compte. Les droits sont vérifiés côté serveur à chaque action." />
      <Table head={["Utilisateur", "Rôles", "Dernière activité"]} empty={users.length === 0}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td><p className="font-semibold">{u.name}</p><p className="text-xs text-muted">{u.email}</p></Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                {u.roles.filter((r) => r.role.key !== "CUSTOMER").map((r) => (
                  <AdminForm key={r.roleId} action={revokeRoleAction} submit={`${r.role.name} ✕`} variant="outline" inline confirm={`Retirer le rôle ${r.role.name} ?`}>
                    <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="role" value={r.role.key} />
                  </AdminForm>
                ))}
              </div>
            </Td>
            <Td>{formatDate(u.sessions[0]?.updatedAt, true)}</Td>
          </tr>
        ))}
      </Table>
      <Panel title="Ajouter un membre" className="mt-6">
        <p className="mb-3 text-sm text-muted">La personne crée d&apos;abord un compte client sur le site et vérifie son e-mail, puis vous lui attribuez un rôle.</p>
        <AdminForm action={grantRoleAction} submit="Attribuer" inline>
          <Input name="email" type="email" placeholder="E-mail du compte" className="h-9 min-w-64 flex-1" required />
          <Select name="role" className="h-9 w-56" aria-label="Rôle">{STAFF.map(([k, r]) => <option key={k} value={k}>{r.name}</option>)}</Select>
        </AdminForm>
      </Panel>
    </>
  );
}
