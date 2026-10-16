/* eslint-disable @typescript-eslint/no-explicit-any -- kode uji, tipe longgar disengaja */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminQuery, resetRateLimits } from "./helpers/db";
import { FAC_A, apiAs, freshQr, jsonOf } from "./helpers/api";

let p1: APIRequestContext;
let p2: APIRequestContext;
let p3: APIRequestContext;
let staffA: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  p1 = await apiAs(playwright, baseURL!, "pasien1");
  p2 = await apiAs(playwright, baseURL!, "pasien2");
  p3 = await apiAs(playwright, baseURL!, "pasien3");
  staffA = await apiAs(playwright, baseURL!, "petugasA");
});
test.beforeEach(resetRateLimits);

test.describe("Preferensi tampilan (P23 pengaturan)", () => {
  test("ukuran teks, kontras, dan mode baca sah tersimpan; nilai ngawur ditolak", async () => {
    const ok = await p1.post("/api/preferences", { data: { textSize: "100", contrast: "standard", readingMode: "standard" } });
    expect(ok.status(), await ok.text()).toBeLessThan(300);
    for (const data of [{ textSize: 9999, contrast: "standard" }, { textSize: "100", contrast: "neon" }, { textSize: "besar", contrast: "standard" }]) {
      const r = await p1.post("/api/preferences", { data });
      expect(r.status(), JSON.stringify(data)).toBeGreaterThanOrEqual(400);
      expect(r.status()).toBeLessThan(500);
    }
  });
});

test.describe("Akun: kode verifikasi, ganti nomor, hapus akun (P22-P23)", () => {
  test("tujuan tak dikenal ditolak; ganti nomor tanpa nomor ditolak", async () => {
    expect((await p1.post("/api/pasien/akun/kode", { data: { purpose: "ngawur" } })).status()).toBe(400);
    expect((await p1.post("/api/pasien/akun/kode", { data: { purpose: "kontak" } })).status()).toBe(400);
  });

  test("hapus akun dengan kode salah ditolak dan akun tetap ada", async () => {
    const issued = await p3.post("/api/pasien/akun/kode", { data: { purpose: "hapus" } });
    expect(issued.status(), await issued.text()).toBe(200);
    const issuedJson = await issued.json();
    const wrong = issuedJson.devOtp === "000000" ? "111111" : "000000";
    const r = await p3.post("/api/pasien/akun/hapus", { data: { code: wrong } });
    expect(r.status()).toBe(400);
    const rows = await adminQuery("SELECT 1 FROM users WHERE id = '22222222-2222-4222-8222-222222222103'");
    expect(rows).toHaveLength(1);
    expect((await p3.post("/api/pasien/akun/hapus", { data: {} })).status()).toBe(400);
  });

  test("ganti nomor dengan kode salah, atau nomor milik akun lain, ditolak", async () => {
    const r = await p2.post("/api/pasien/akun/kontak", { data: { phone: "+620000000555", code: "000000" } });
    expect(r.status()).toBe(400);
    expect((await p2.post("/api/pasien/akun/kontak", { data: { phone: "+620000000555" } })).status()).toBe(400);
  });

  test("peran selain pasien tidak boleh memakai rute akun pasien", async () => {
    expect([401, 403]).toContain((await staffA.post("/api/pasien/akun/kode", { data: { purpose: "hapus" } })).status());
    expect([401, 403]).toContain((await staffA.post("/api/pasien/akun/hapus", { data: { code: "123456" } })).status());
  });
});

test.describe("Kartu cetak dan pencatatan tanpa QR (P7-P8, T4b)", () => {
  test("kode kartu cetak diterbitkan untuk pasien; petugas menolak kode kartu ngawur", async () => {
    const issued = await p1.post("/api/pasien/kartu-cetak/kode", { data: {} });
    expect([200, 201, 400, 409]).toContain(issued.status());
    const bad = await staffA.post("/api/petugas/kunjungan/kartu", { data: { cardCode: "KODE-NGAWUR", needCodes: ["lingkungan_tenang"], ruleIds: [], note: "x", clientId: "e2e-ngawur-1" } });
    expect(bad.status()).toBeGreaterThanOrEqual(400);
    expect(bad.status()).toBeLessThan(500);
  });

  test("catatan kartu: clientId wajib dan idempoten", async () => {
    const r = await staffA.post("/api/petugas/kunjungan/kartu", { data: { cardCode: "", needCodes: [], ruleIds: [], note: null, clientId: "" } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test("pasien tidak boleh memakai rute pencatatan petugas", async () => {
    expect([401, 403]).toContain((await p1.post("/api/petugas/kunjungan/kartu", { data: { cardCode: "A", needCodes: [], ruleIds: [], clientId: "x" } })).status());
  });
});

test.describe("KomunikaCare (P13-P15)", () => {
  async function openVisit() {
    const qr = await freshQr(p1, FAC_A, ["pendengaran", "komunikasi"]);
    const scan = await (await staffA.post("/api/scan", { data: { token: qr.token } })).json();
    return scan.visitId as string;
  }

  test("pasien dan petugas bertukar pesan ikon/teks pada kunjungan yang sama", async () => {
    const visitId = await openVisit();
    const a = await p1.post("/api/komunikacare/pesan", { data: { visitId, kind: "text", body: "Saya mau mendengar penjelasan pelan." } });
    expect(a.status(), await a.text()).toBeLessThan(300);
    const b = await staffA.post("/api/komunikacare/pesan", { data: { visitId, kind: "text", body: "Baik, saya jelaskan pelan." } });
    expect(b.status(), await b.text()).toBeLessThan(300);
    const list = await p1.get(`/api/komunikacare/pesan?kunjungan=${visitId}`);
    expect(list.status()).toBe(200);
    expect(JSON.stringify(await list.json())).toContain("jelaskan pelan");
  });

  test("pasien lain tidak dapat membaca atau menulis pada percakapan orang lain", async () => {
    const visitId = await openVisit();
    const read = await p2.get(`/api/komunikacare/pesan?kunjungan=${visitId}`);
    expect([403, 404]).toContain(read.status());
    const write = await p2.post("/api/komunikacare/pesan", { data: { visitId, kind: "text", body: "Menyusup" } });
    expect(write.status()).toBeGreaterThanOrEqual(400);
    expect(write.status()).toBeLessThan(500);
  });

  test("jenis pesan dan isi tak valid ditolak; pesan terlalu panjang ditolak", async () => {
    const visitId = await openVisit();
    for (const data of [
      { visitId, kind: "video", body: "x" },
      { visitId, kind: "text" },
      { visitId, kind: "text", body: "x".repeat(10_000) },
      { kind: "text", body: "tanpa kunjungan" },
    ]) {
      const r = await p1.post("/api/komunikacare/pesan", { data });
      expect(r.status(), JSON.stringify(data).slice(0, 60)).toBeGreaterThanOrEqual(400);
      expect(r.status()).toBeLessThan(500);
    }
  });

  test("pesan berisi skrip disimpan sebagai teks biasa (tidak dieksekusi di layar petugas)", async ({ browser, baseURL }) => {
    const visitId = await openVisit();
    await p1.post("/api/komunikacare/pesan", { data: { visitId, kind: "text", body: "<img src=x onerror=window.__xss=1>" } });
    const ctx = await browser.newContext({ baseURL });
    const page = await ctx.newPage();
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
    await ctx.addCookies(await (await staffA.storageState()).cookies);
    await page.goto(`/petugas`, { waitUntil: "networkidle" });
    expect(dialogs).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await ctx.close();
  });
});

test("petugas tanpa sesi: rute pencatatan/komunikasi menjawab 401", async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  for (const [m, path] of [
    ["post", "/api/petugas/kunjungan/panggil"], ["post", "/api/petugas/kunjungan/catat"], ["post", "/api/petugas/saran"],
    ["post", "/api/komunikacare/pesan"], ["get", "/api/komunikacare/pesan?kunjungan=x"], ["post", "/api/pasien/kunjungan/consent"],
    ["post", "/api/admin/petugas"], ["post", "/api/kurator/aturan"], ["post", "/api/pendamping/tautkan"],
  ] as const) {
    const r = await (anon as any)[m](path, { data: {} });
    expect(r.status(), path).toBe(401);
  }
  expect((await jsonOf(await anon.post("/api/petugas/saran", { data: {} }))).error).toBeTruthy();
});
