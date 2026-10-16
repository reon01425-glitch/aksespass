import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./e2e/helpers/env";

loadEnvLocal();

/**
 * Tes fungsional (end-to-end) AKSESPASS.
 * - Server dev dijalankan otomatis di port 3100 dengan DATABASE_URL = DATABASE_URL_TEST.
 * - Database tes di-seed ulang di e2e/global-setup.ts sebelum semua tes berjalan.
 * - Satu worker karena banyak skenario mengubah data yang sama (status aturan, QR, kunjungan).
 * Panduan lengkap: docs/testing-e2e.md
 */
const PORT = 3100;
const ORIGIN = `http://localhost:${PORT}`;
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 45_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL: ORIGIN,
    // Rute API menolak permintaan tulis tanpa Origin yang sama dengan APP_ORIGIN.
    extraHTTPHeaders: { Origin: ORIGIN },
    // `next dev` mengompilasi tiap rute saat pertama dibuka; di laptop lambat bisa puluhan detik.
    actionTimeout: 45_000,
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 390, height: 844 },
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [{ name: "hp-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `${ORIGIN}/masuk`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      APP_ORIGIN: ORIGIN,
      OTP_MODE: "dev-display",
      // Server memakai database tes, bukan database dev.
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
    },
  },
});
