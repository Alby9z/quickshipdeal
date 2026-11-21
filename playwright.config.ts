import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

/**
 * E2E contre une build de production branchée sur la base de TEST.
 * Préparer : npm run db:test:prepare && npm run build
 */
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://qsd:qsd@localhost:5432/qsd_test";
const executablePath = process.env.CHROMIUM_PATH ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", trace: "off", locale: "fr-FR", launchOptions: executablePath ? { executablePath } : {} },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100/api/health",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: TEST_DB, DIRECT_URL: TEST_DB, APP_ENV: "test", NEXT_PUBLIC_SITE_URL: "http://localhost:3100", BETTER_AUTH_URL: "http://localhost:3100",
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
      REDIS_URL: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", RESEND_API_KEY: "",
    },
  },
});
