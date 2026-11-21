import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { env, siteUrl } from "./env";

/**
 * Authentification Better Auth :
 * - e-mail + mot de passe, vérification d'adresse obligatoire ;
 * - réinitialisation du mot de passe par e-mail ;
 * - sessions en base, cookies HttpOnly / Secure (en HTTPS) / SameSite=Lax ;
 * - limitation de débit sur les routes sensibles (anti brute force).
 * Les rôles sont gérés dans nos tables Role/UserRole (voir modules/auth/session.ts).
 */
export const auth = betterAuth({
  appName: "QuickShipDeals",
  baseURL: env().BETTER_AUTH_URL ?? siteUrl(),
  secret: env().BETTER_AUTH_SECRET ?? "dev-only-insecure-secret-change-me-32chars",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      const { sendEmail } = await import("@/modules/emails/service");
      await sendEmail({
        type: "reset_password",
        to: user.email,
        data: { name: user.name, url },
        idempotencyKey: `reset_password:${user.id}:${Date.now()}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 24 * 3600,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendEmail } = await import("@/modules/emails/service");
      await sendEmail({
        type: "verify_email",
        to: user.email,
        data: { name: user.name, url },
        idempotencyKey: `verify_email:${user.id}:${Date.now()}`,
      });
    },
    afterEmailVerification: async (user) => {
      const { sendEmail } = await import("@/modules/emails/service");
      await sendEmail({ type: "welcome", to: user.email, data: { name: user.name }, idempotencyKey: `welcome:${user.id}` });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: siteUrl().startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  // Domaine principal + URLs générées par Vercel (alias de projet, branche, déploiement).
  trustedOrigins: [
    siteUrl(),
    ...[process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
      .filter((h): h is string => Boolean(h))
      .map((h) => `https://${h}`),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const role = await db.role.findUnique({ where: { key: "CUSTOMER" } });
          await db.$transaction([
            db.customerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
            ...(role
              ? [db.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} })]
              : []),
          ]);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
