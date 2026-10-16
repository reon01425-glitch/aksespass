import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test("server hidup dan halaman masuk terbuka", async ({ page }) => {
  const res = await page.goto("/masuk");
  expect(res?.status()).toBe(200);
});

test("login kurator via API lalu halaman kurator terbuka", async ({ page, context }) => {
  await loginAs(context, "kurator1");
  await page.goto("/kurator");
  await expect(page).toHaveURL(/\/kurator$/);
  await page.screenshot({ path: "test-results/smoke-kurator.png" });
});
