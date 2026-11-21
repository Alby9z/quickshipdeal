import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { exportUserData } from "@/modules/customers/service";
import { audit } from "@/modules/audit/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const data = await exportUserData(user.id);
  await audit({ actorId: user.id, action: "customer.export", entityType: "User", entityId: user.id });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="quickshipdeals-mes-donnees.json"`, "Cache-Control": "no-store" },
  });
}
