import { PrismaClient } from "@prisma/client";

// Base Europe connectée avec le préfixe DATABASE_EU (intégration Neon) : prioritaire.
if (process.env.DATABASE_EU_URL) process.env.DATABASE_URL = process.env.DATABASE_EU_URL;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.APP_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
