// Les tests tournent contre une base dédiée, jamais celle de développement ou de production.
// Les variables sont mises à "" (et non supprimées) : sinon Prisma recharge les valeurs du fichier .env.
process.env.APP_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://qsd:qsd@localhost:5432/qsd_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
for (const k of ["REDIS_URL", "RESEND_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "BIGBUY_API_KEY", "CJ_API_KEY", "TRACK17_API_KEY", "AFTERSHIP_API_KEY", "SENTRY_DSN"]) process.env[k] = "";
