import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPermission } from "@/modules/auth/session";
import { presignUpload } from "@/integrations/storage/s3";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await assertPermission("product:write");
    const body = z.object({ filename: z.string().max(200), contentType: z.string().max(100), size: z.number().int().positive(), folder: z.enum(["products", "blog", "documents"]).default("products") }).parse(await req.json());
    return NextResponse.json(await presignUpload(body));
  } catch (e) {
    const status = e instanceof AppError ? e.status : 400;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
