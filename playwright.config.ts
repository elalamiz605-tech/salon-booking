import { defineConfig, devices } from "@playwright/test";
import bcrypt from "bcryptjs";

export const E2E_ADMIN = { email: "admin@test.local", password: "test-password" };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "off" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 860 } } },
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
  webServer: {
    command: "rm -rf .data/e2e && npm run dev",
    port: 3000,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PGLITE_DIR: ".data/e2e",
      DEMO_MODE: "false",
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD_HASH: bcrypt.hashSync(E2E_ADMIN.password, 10),
      SESSION_SECRET: "test-secret-at-least-32-characters-long",
      CRON_SECRET: "test-cron",
      BOOKING_RATE_LIMIT: "1000",
    },
  },
});
