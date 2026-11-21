import { db } from "@/lib/db";
import { requireStaff } from "@/modules/auth/session";
import { AdminTitle, Panel } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/action-form";
import { Checkbox } from "@/components/ui/form";
import { saveRolePermissionsAction } from "@/actions/admin-content";
import { PERMISSIONS } from "@/modules/auth/permissions";

export const metadata = { title: "Rôles et permissions" };

export default async function Roles() {
  await requireStaff("user:write");
  const roles = await db.role.findMany({ where: { key: { not: "CUSTOMER" } }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  return (
    <>
      <AdminTitle title="Rôles et permissions" />
      <div className="grid gap-6 lg:grid-cols-2">
        {roles.map((r) => {
          const has = new Set(r.permissions.map((p) => p.permission.key));
          const locked = r.key === "SUPER_ADMIN";
          return (
            <Panel key={r.id} title={`${r.name} (${r._count.users})`}>
              <p className="mb-3 text-xs text-muted">{r.description}</p>
              <AdminForm action={saveRolePermissionsAction} submit="Enregistrer">
                <input type="hidden" name="role" value={r.key} />
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {Object.entries(PERMISSIONS).map(([k, l]) => <Checkbox key={k} name="permissions" value={k} label={l} defaultChecked={has.has(k)} disabled={locked} />)}
                </div>
              </AdminForm>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
