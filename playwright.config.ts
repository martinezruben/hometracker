import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

export const PORT = 3100;
export const SMTP_PORT = 2526;
export const MAIL_FILE = path.join(os.tmpdir(), "ht-e2e-mail.log");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 800 },
    trace: "retain-on-failure",
  },
  // Requiere `npm run build` previo y DATABASE_URL (MySQL con las migraciones aplicadas).
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...(process.env as Record<string, string>),
      STORAGE_DIR: path.join(os.tmpdir(), "ht-e2e-storage"),
      SESSION_SECRET: "e2e-secret",
      SMTP_URL: `smtp://127.0.0.1:${SMTP_PORT}`,
      MAIL_FROM: "HomeTracker <e2e@test.local>",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
