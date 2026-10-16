import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { resetRateLimits } from "./helpers/db";

// Kamera palsu bawaan Chromium: izin otomatis, gambar uji sebagai video.
test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
  },
  permissions: ["camera"],
});

test.describe("Pindai dengan kamera (T4)", () => {
  test("mulai dan hentikan kamera berulang kali tanpa galat halaman (removeChild)", async ({ page, context }) => {
    await resetRateLimits();
    await loginAs(context, "petugasA");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/petugas/pindai", { waitUntil: "networkidle" });
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Mulai kamera" }).click();
      await expect(page.getByText("Kamera aktif")).toBeVisible();
      await expect(page.locator("#qr-reader-container video")).toHaveCount(1);
      await page.getByRole("button", { name: /Hentikan kamera|Matikan kamera/ }).click();
      await expect(page.getByText("Kamera tidak menyala otomatis")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
