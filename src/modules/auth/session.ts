import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import type { PermissionKey } from "./permissions";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  roles: string[];
  permissions: Set<PermissionKey>;
  isStaff: boolean;
};

/** Utilisateur courant avec rôles et permissions (une seule requête par rendu). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user || user.deletedAt || user.isBlocked) return null;
  const roles = user.roles.map((r) => r.role.key);
  const permissions = new Set<PermissionKey>(
    user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key as PermissionKey)),
  );
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    roles,
    permissions,
    isStaff: roles.some((r) => r !== "CUSTOMER"),
  };
});

export async function requireUser(redirectTo = "/compte") {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(redirectTo)}`);
  return user;
}

/** Pour les pages admin : redirige si non connecté, 403 si permission absente. */
export async function requireStaff(permission?: PermissionKey) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  if (!user.isStaff) redirect("/");
  if (permission && !user.permissions.has(permission)) throw new ForbiddenError("Permission insuffisante : " + permission);
  return user;
}

/** Pour les Server Actions et services : lève une erreur (pas de redirection). */
export async function assertPermission(permission: PermissionKey) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.has(permission)) throw new ForbiddenError();
  return user;
}

export function hasPermission(user: CurrentUser | null, permission: PermissionKey) {
  return Boolean(user?.permissions.has(permission));
}
