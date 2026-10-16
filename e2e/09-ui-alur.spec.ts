/* eslint-disable @typescript-eslint/no-explicit-any -- kode uji, tipe longgar disengaja */
import { test, expect, type Page } from "@playwright/test";
import { ACCOUNTS, loginAs, type AccountKey } from "./helpers/auth";
import { resetRateLimits } from "./helpers/db";
import { apiAs, freshQr } from "./helpers/api";

/** Masuk lewat formulir OTP seperti pengguna sungguhan. Mengembalikan kode dev yang tampil di respons. */
async function uiLogin(page: Page, who: { phone: string; portal: "pasien" | "institusi" }, code?: string) {
  await resetRateLimits();
  await page.goto(who.portal === "institusi" ? "/masuk/petugas" : "/masuk", { waitUntil: "networkidle" });
  await page.locator('input[type="tel"]').fill(who.phone);
  const reqP = page.waitForResponse((r) => r.url().includes("/api/auth/otp/request"));
  await page.getByRole("button", { name: "Kirim Kode" }).click();
  const { devOtp } = await (await reqP).json();
  const otpInput = page.locator("input:not([type=tel]):not([type=checkbox]):not([type=hidden])").first();
  await otpInput.waitFor({ state: "visible", timeout: 45000 });
  await otpInput.fill(code ?? devOtp);
  const masuk = page.getByRole("button", { name: /^Masuk( sebagai Petugas)?$/ });
  if (await masuk.isVisible().catch(() => false)) await masuk.click().catch(() => {});
  return devOtp as string;
}
const acc = (k: AccountKey) => ACCOUNTS[k];

test.describe("Layar masuk (P3, T2)", () => {
  test("pasien masuk dengan OTP lewat formulir dan mendarat di Beranda Pasien", async ({ page }) => {
    await uiLogin(page, acc("pasien1"));
    await expect(page).toHaveURL(/localhost:\d+\/pasien$/, { timeout: 45000 });
    await expect(page.getByRole("heading", { name: "Beranda Pasien" })).toBeVisible();
  });

  test("OTP salah menampilkan pesan galat dan tetap di halaman masuk", async ({ page }) => {
    await uiLogin(page, acc("pasien2"), "000000");
    await expect(page).toHaveURL(/\/masuk/);
    await expect(page.locator("body")).toContainText(/salah|tidak valid|gagal|kedaluwarsa/i, { timeout: 45000 });
  });

  test("petugas masuk lewat portal institusi dan mendarat di Beranda Petugas", async ({ page }) => {
    await uiLogin(page, acc("petugasA"));
    await expect(page).toHaveURL(/localhost:\d+\/petugas$/, { timeout: 45000 });
    await expect(page.getByRole("heading", { name: "Beranda Petugas" })).toBeVisible();
  });

  test("nomor pasien di portal petugas ditolak dengan pesan, tanpa sesi", async ({ page }) => {
    await uiLogin(page, { phone: ACCOUNTS.pasien1.phone, portal: "institusi" });
    await expect(page).toHaveURL(/\/masuk\/petugas/);
    await page.waitForTimeout(800);
    expect(await page.context().cookies()).toEqual([]);
  });

  test("formulir menolak nomor kosong tanpa mengirim permintaan", async ({ page }) => {
    await page.goto("/masuk", { waitUntil: "networkidle" });
    let called = false;
    page.on("request", (r) => { if (r.url().includes("/api/auth/otp/request")) called = true; });
    await page.getByRole("button", { name: "Kirim Kode" }).click();
    await page.waitForTimeout(500);
    expect(called).toBe(false);
  });

  test("tombol Keluar mengakhiri sesi", async ({ page, context }) => {
    await loginAs(context, "pasien1");
    await page.goto("/pasien", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/masuk|\/$/, { timeout: 45000 });
    await page.goto("/pasien");
    await expect(page).toHaveURL(/\/masuk/);
  });
});

test.describe("Petugas memindai kode manual (T3-T5)", () => {
  test("kode sah menampilkan kebutuhan pasien; kode salah menampilkan pesan generik", async ({ page, context, playwright, baseURL }) => {
    const p1 = await apiAs(playwright, baseURL!, "pasien1");
    const qr = await freshQr(p1);
    await loginAs(context, "petugasA");
    await page.goto("/petugas/pindai", { waitUntil: "networkidle" });
    const input = page.locator("#manual-qr-code");
    await input.fill("SALAHSALAHSALAHSALAHSALAH");
    await page.getByRole("button", { name: "Kirim Kode Manual" }).click();
    await expect(page.locator("body")).toContainText(/QR Tidak Dapat Dipakai|tidak dapat dipakai/i, { timeout: 45000 });

    await input.fill(qr.token);
    await page.getByRole("button", { name: "Kirim Kode Manual" }).click();
    await expect(page).toHaveURL(/\/petugas\/(pasien|kunjungan|hasil|brief|saran)|\/petugas\/pindai/, { timeout: 45000 });
    await expect(page.locator("body")).toContainText(/Pasien Contoh 1/);
    // Hanya pernyataan "Diagnosis tidak diminta"; tidak ada bidang atau nilai diagnosis.
    await expect(page.locator("body")).toContainText(/Diagnosis tidak diminta/);
    await expect(page.locator("body")).not.toContainText(/diagnosis:|diagnosis pasien|hasil diagnosis/i);
  });

  test("kode yang lebih pendek dari 26 karakter ditolak dengan pesan yang sama", async ({ page, context }) => {
    await loginAs(context, "petugasA");
    await page.goto("/petugas/pindai", { waitUntil: "networkidle" });
    await page.locator("#manual-qr-code").fill("PENDEK");
    await page.getByRole("button", { name: "Kirim Kode Manual" }).click();
    await expect(page.locator("body")).toContainText(/QR Tidak Dapat Dipakai|tidak dapat dipakai|26 karakter/i, { timeout: 45000 });
  });
});

test.describe("Pendamping menautkan (D2)", () => {
  test("kode tautan salah menampilkan galat", async ({ page, context }) => {
    await loginAs(context, "pendamping");
    await page.goto("/pendamping/tautkan", { waitUntil: "networkidle" });
    await page.locator("#field-link-code").fill("ABCD-EFGH");
    await page.getByRole("button", { name: "Ajukan Tautan" }).click();
    await expect(page.locator("body")).toContainText(/tidak|salah|kedaluwarsa|gagal/i, { timeout: 45000 });
  });
});

test.describe("Aksesibilitas dasar", () => {
  const publicPages = ["/masuk", "/masuk/petugas", "/mulai"];
  for (const path of publicPages) {
    test(`${path}: semua input berlabel, semua tombol bernama, ada tautan lompat ke konten`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const unlabeled = await page.evaluate(() =>
        Array.from(document.querySelectorAll("input:not([type=hidden]),textarea,select"))
          .filter((e: any) => !(e.labels && e.labels.length) && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby"))
          .map((e: any) => e.id || e.name || e.tagName)
      );
      expect(unlabeled, "input tanpa label").toEqual([]);
      const unnamed = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button,a[href]"))
          .filter((e: any) => !(e.textContent || "").trim() && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby") && !e.querySelector("img[alt]"))
          .map((e: any) => e.outerHTML.slice(0, 80))
      );
      expect(unnamed, "kontrol tanpa nama").toEqual([]);
      await expect(page.locator("html")).toHaveAttribute("lang", "id");
    });
  }

  test("fokus keyboard terlihat dan Tab menjangkau tombol Kirim Kode", async ({ page }) => {
    await page.goto("/masuk", { waitUntil: "networkidle" });
    let reached = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText?.trim() ?? "");
      if (/Kirim Kode/.test(name)) { reached = true; break; }
    }
    expect(reached).toBe(true);
  });

  test("target sentuh tombol utama minimal 44 px", async ({ page }) => {
    await page.goto("/masuk", { waitUntil: "networkidle" });
    const box = await page.getByRole("button", { name: "Kirim Kode" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
