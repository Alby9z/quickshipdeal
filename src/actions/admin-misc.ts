"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/modules/auth/session";

export async function markNotificationsReadAction() {
  await assertPermission("dashboard:read");
  await db.notification.updateMany({ where: { audience: "admin", readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin");
}
