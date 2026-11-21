import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";

/** Journalise une action administrative ou critique. Ne jamais y mettre de secret. */
export async function audit(
  entry: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    changes?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  },
  tx: Tx | typeof db = db,
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      changes: entry.changes,
      ipAddress: entry.ipAddress ?? null,
    },
  });
}

export async function notifyAdmins(
  n: { level?: "info" | "warning" | "error"; type: string; title: string; body?: string; link?: string },
  tx: Tx | typeof db = db,
) {
  await tx.notification.create({
    data: { audience: "admin", level: n.level ?? "info", type: n.type, title: n.title, body: n.body, link: n.link },
  });
}
