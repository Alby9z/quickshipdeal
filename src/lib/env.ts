import { z } from "zod";

/**
 * Variables d'environnement validées au démarrage.
 * Les intégrations facultatives sont "non configurées" quand leur clé est absente :
 * l'application démarre, mais la fonctionnalité est affichée comme désactivée.
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

// Base Europe (intégration Neon, préfixe DATABASE_EU) : prioritaire, et suffit
// même si DATABASE_URL a disparu après suppression de l'ancienne base.
const euDatabaseUrl = process.env.DATABASE_EU_DATABASE_URL ?? process.env.DATABASE_EU_URL;
if (euDatabaseUrl) process.env.DATABASE_URL = euDatabaseUrl;

const schema = z.object({
  APP_ENV: z.enum(["development", "preview", "production", "test"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: optional,
  BETTER_AUTH_URL: optional,
  REDIS_URL: optional,
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optional,
  RESEND_API_KEY: optional,
  RESEND_WEBHOOK_SECRET: optional,
  EMAIL_FROM: optional,
  EMAIL_REPLY_TO: optional,
  S3_ENDPOINT: optional,
  S3_REGION: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  S3_BUCKET: optional,
  S3_PUBLIC_URL: optional,
  BIGBUY_API_KEY: optional,
  BIGBUY_API_URL: optional,
  CJ_API_EMAIL: optional,
  CJ_API_KEY: optional,
  TRACK17_API_KEY: optional,
  AFTERSHIP_API_KEY: optional,
  API_V1_TOKEN: optional,
  SENTRY_DSN: optional,
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        "Configuration invalide : " +
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
      );
    }
    if (parsed.data.APP_ENV === "production" && !parsed.data.BETTER_AUTH_SECRET) {
      throw new Error("BETTER_AUTH_SECRET est obligatoire en production.");
    }
    cached = parsed.data;
  }
  return cached;
}

/** État de chaque intégration externe, affiché dans l'administration. */
export function integrationStatus() {
  const e = env();
  return {
    stripe: Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET),
    resend: Boolean(e.RESEND_API_KEY && e.EMAIL_FROM),
    storage: Boolean(e.S3_ENDPOINT && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY && e.S3_BUCKET),
    redis: Boolean(e.REDIS_URL),
    bigbuy: Boolean(e.BIGBUY_API_KEY),
    cjdropshipping: Boolean(e.CJ_API_EMAIL && e.CJ_API_KEY),
    track17: Boolean(e.TRACK17_API_KEY),
    aftership: Boolean(e.AFTERSHIP_API_KEY),
    apiV1: Boolean(e.API_V1_TOKEN),
    sentry: Boolean(e.SENTRY_DSN),
  } as const;
}
export type IntegrationKey = keyof ReturnType<typeof integrationStatus>;

export const siteUrl = () => env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
