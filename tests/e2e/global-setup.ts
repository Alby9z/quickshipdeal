import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/** Vide la base de TEST avant les E2E (aucune donnée résiduelle des tests d'intégration). */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://qsd:qsd@localhost:5432/qsd_test";
  if (!url.includes("qsd_test")) throw new Error("Les E2E doivent viser la base de test");
  const db = new PrismaClient({ datasources: { db: { url } } });
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await db.$disconnect();
  // Données de référence uniquement (rôles, transporteurs, pages brouillon) + compte admin E2E.
  execSync("npx prisma db seed", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, SEED_ADMIN_EMAIL: "e2e-admin@example.test", SEED_ADMIN_PASSWORD: "E2E-only-password-2026!" } });
}
