import "server-only";
import { revalidatePath } from "next/cache";
import { toActionError, type ActionResult } from "./errors";
import { assertPermission, type CurrentUser } from "@/modules/auth/session";
import type { PermissionKey } from "@/modules/auth/permissions";

/**
 * Enveloppe des Server Actions d'administration : vérifie la permission côté serveur,
 * capture les erreurs et revalide les pages concernées.
 */
export function adminAction<T = undefined>(
  permission: PermissionKey,
  fn: (user: CurrentUser, form: FormData) => Promise<{ message?: string; data?: T; revalidate?: string[] } | void>,
) {
  return async (_prev: unknown, form: FormData): Promise<ActionResult<T>> => {
    try {
      const user = await assertPermission(permission);
      const r = (await fn(user, form)) ?? {};
      for (const p of r.revalidate ?? []) revalidatePath(p);
      return { ok: true, message: r.message ?? "Enregistré", data: r.data };
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
      return toActionError(e);
    }
  };
}

export const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const optStr = (f: FormData, k: string) => str(f, k) || null;
export const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
