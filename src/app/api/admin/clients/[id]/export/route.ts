import { NextResponse } from "next/server";
import { assertPermission } from "@/modules/auth/session";
import { exportUserData } from "@/modules/customers/service";
import { audit } from "@/modules/audit/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await assertPermission("customer:write");
    const { id } = await params;
    const data = await exportUserData(id);
    await audit({ actorId: actor.id, action: "customer.export.admin", entityType: "User", entityId: id });
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="client-${id}.json"`, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
}
