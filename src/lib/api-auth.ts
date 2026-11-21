import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "./env";
import { rateLimit, clientIp } from "./rate-limit";

/** Authentification de l'API REST v1 par jeton Bearer (comparaison à temps constant). */
export async function guardApi(req: Request): Promise<NextResponse | null> {
  const token = env().API_V1_TOKEN;
  if (!token) return NextResponse.json({ error: "API non configurée (API_V1_TOKEN)" }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!(await rateLimit(`api:${clientIp(req.headers)}`, 120, 60)).ok) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  return null;
}
