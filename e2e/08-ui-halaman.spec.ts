import { test, expect, type Page } from "@playwright/test";
import { loginAs, type AccountKey } from "./helpers/auth";

/**
 * Smoke layar per peran: setiap halaman terbuka (200), tanpa galat konsol/halaman,
 * punya landmark utama dan satu judul, dan tidak melebar horizontal di 320 px.
 */
const PAGES: Array<[AccountKey, string[]]> = [
  [
    "pasien1",
    [
      "/pasien", "/pasien/paspor", "/pasien/akses", "/pasien/akses/qr", "/pasien/akses/riwayat", "/pasien/akun", "/pasien/akun/hapus",
      "/pasien/kartu-cetak", "/pasien/komunikacare", "/pasien/konfirmasi", "/pasien/konfirmasi/selesai", "/pasien/kunjungan", "/pasien/kunjungan/qr",
      "/pasien/pendamping", "/pasien/tindak-lanjut",
    ],
  ],
  ["pendamping", ["/pendamping", "/pendamping/tautkan"]],
  ["petugasA", ["/petugas", "/petugas/pindai", "/petugas/kartu"]],
  ["adminA", ["/admin", "/admin/dashboard", "/admin/belum-terpenuhi", "/admin/petugas", "/admin/petugas/tambah", "/admin/tindak-lanjut"]],
  ["kurator1", ["/kurator", "/kurator/editor/baru", "/kurator/tinjau"]],
];

async function checkPage(page: Page, path: string, width: number) {
  const errors: string[] = [];
  const onErr = (e: Error) => errors.push(e.message);
  page.on("pageerror", onErr);
  await page.setViewportSize({ width, height: 800 });
  const res = await page.goto(path, { waitUntil: "networkidle" });
  expect(res?.status(), `${path} status`).toBe(200);
  const text = await page.locator("body").innerText();
  expect(text, `${path} teks galat`).not.toMatch(/Application error|Internal Server Error|This page could not be found/);
  await expect(page.locator("main").first(), `${path} landmark main`).toBeVisible();
  expect(await page.locator("h1").count(), `${path} jumlah h1`).toBeGreaterThanOrEqual(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${path} melebar horizontal ${width}px`).toBeLessThanOrEqual(1);
  expect(errors, `${path} galat halaman`).toEqual([]);
  page.off("pageerror", onErr);
}

for (const [key, paths] of PAGES) {
  test(`layar ${key}: semua halaman terbuka bersih di 320 dan 390 px`, async ({ page, context }) => {
    await loginAs(context, key);
    for (const path of paths) {
      await checkPage(page, path, 390);
      await checkPage(page, path, 320);
    }
  });
}

test("halaman publik terbuka", async ({ page }) => {
  for (const path of ["/", "/mulai", "/masuk", "/masuk/petugas"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    expect(await page.locator("body").innerText()).not.toMatch(/Application error|Internal Server Error/);
  }
});

test("halaman tidak ada menampilkan 404 tanpa membocorkan jejak", async ({ page }) => {
  const res = await page.goto("/halaman-tidak-ada");
  expect(res?.status()).toBe(404);
  expect(await page.locator("body").innerText()).not.toMatch(/node_modules|at\s+\S+\s+\(/);
});

test("tautan token /s tanpa/dengan token ngawur tidak membocorkan keberadaan token", async ({ page }) => {
  const a = await page.goto("/s");
  await page.goto("about:blank");
  const b = await page.goto("/s#ZZZZZZZZZZZZZZZZZZZZZZZZZZ");
  expect([200, 404]).toContain(a?.status());
  expect([200, 404]).toContain(b?.status());
  expect(await page.locator("body").innerText()).not.toMatch(/Application error/);
});

test("pasien tidak melihat identitas pasien lain di halaman riwayat akses dan paspor", async ({ page, context }) => {
  await loginAs(context, "pasien2");
  for (const path of ["/pasien", "/pasien/akses/riwayat", "/pasien/paspor", "/pasien/akses"]) {
    await page.goto(path);
    const t = await page.locator("body").innerText();
    expect(t, path).not.toMatch(/Pasien Contoh 1\b|Pasien Contoh 3\b|Pasien Contoh 4\b|\+620000000001/);
  }
});
