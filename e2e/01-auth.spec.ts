import { test, expect } from "@playwright/test";
import { ACCOUNTS, loginApi } from "./helpers/auth";
import { adminQuery, resetRateLimits } from "./helpers/db";
import { anon, apiAs, jsonOf } from "./helpers/api";

test.describe("Autentikasi: alur sah", () => {
  for (const key of ["pasien1", "pendamping", "petugasA", "adminA", "kurator1"] as const) {
    test(`login ${key} mendarat di beranda perannya`, async ({ playwright, baseURL }) => {
      const ctx = await anon(playwright, baseURL!);
      const res = await loginApi(ctx, ACCOUNTS[key].phone, ACCOUNTS[key].portal);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.destination).toBe(ACCOUNTS[key].home);
    });
  }

  test("logout menghapus sesi: halaman terlindungi kembali ke /masuk", async ({ playwright, baseURL, browser }) => {
    const ctx = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    const res = await loginApi(ctx.request, ACCOUNTS.pasien1.phone, "pasien");
    expect(res.ok()).toBeTruthy();
    const page = await ctx.newPage();
    await page.goto("/pasien");
    await expect(page).toHaveURL(/\/pasien$/);
    const out = await ctx.request.post("/api/auth/logout");
    expect(out.ok()).toBeTruthy();
    await page.goto("/pasien");
    await expect(page).toHaveURL(/\/masuk/);
    await ctx.close();
  });
});

test.describe("Autentikasi: pelanggaran", () => {
  test("OTP salah ditolak 400 dan tidak membuat sesi", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const ctx = await anon(playwright, baseURL!);
    const r = await ctx.post("/api/auth/otp/request", { data: { phone: ACCOUNTS.pasien1.phone } });
    const { devOtp } = await r.json();
    const wrong = devOtp === "000000" ? "111111" : "000000";
    const v = await ctx.post("/api/auth/otp/verify", { data: { phone: ACCOUNTS.pasien1.phone, code: wrong, portal: "pasien" } });
    expect(v.status()).toBe(400);
    expect(v.headers()["set-cookie"]).toBeUndefined();
  });

  test("5 kali salah membuat kode hangus, kode benar sesudahnya tetap ditolak", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const ctx = await anon(playwright, baseURL!);
    const phone = ACCOUNTS.pasien2.phone;
    const { devOtp } = await (await ctx.post("/api/auth/otp/request", { data: { phone } })).json();
    const wrong = devOtp === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      const v = await ctx.post("/api/auth/otp/verify", { data: { phone, code: wrong, portal: "pasien" } });
      expect(v.status()).toBe(400);
    }
    const ok = await ctx.post("/api/auth/otp/verify", { data: { phone, code: devOtp, portal: "pasien" } });
    expect(ok.status()).toBe(400);
  });

  test("OTP sekali pakai: kode yang sama tidak bisa dipakai dua kali", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const ctx = await anon(playwright, baseURL!);
    const phone = ACCOUNTS.pasien3.phone;
    const { devOtp } = await (await ctx.post("/api/auth/otp/request", { data: { phone } })).json();
    expect((await ctx.post("/api/auth/otp/verify", { data: { phone, code: devOtp, portal: "pasien" } })).status()).toBe(200);
    const again = await anon(playwright, baseURL!);
    expect((await again.post("/api/auth/otp/verify", { data: { phone, code: devOtp, portal: "pasien" } })).status()).toBe(400);
  });

  test("batas permintaan OTP per nomor: permintaan ke-4 mendapat 429", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const ctx = await anon(playwright, baseURL!);
    const phone = ACCOUNTS.pasien5.phone;
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await ctx.post("/api/auth/otp/request", { data: { phone }, headers: { "x-forwarded-for": `10.9.9.${i + 1}` } });
      statuses.push(r.status());
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  test("permintaan tanpa nomor atau kode ditolak 400", async ({ playwright, baseURL }) => {
    const ctx = await anon(playwright, baseURL!);
    expect((await ctx.post("/api/auth/otp/request", { data: {} })).status()).toBe(400);
    expect((await ctx.post("/api/auth/otp/verify", { data: { phone: ACCOUNTS.pasien1.phone } })).status()).toBe(400);
  });

  test("nomor tak dikenal pada portal institusi tidak bisa masuk", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const ctx = await anon(playwright, baseURL!);
    const phone = "+629999999999";
    const r = await ctx.post("/api/auth/otp/request", { data: { phone } });
    const { devOtp } = await r.json();
    const v = await ctx.post("/api/auth/otp/verify", { data: { phone, code: devOtp, portal: "institusi" } });
    expect(v.status()).toBe(400);
    expect(v.headers()["set-cookie"]).toBeUndefined();
  });

  test("nomor pasien tidak bisa masuk lewat portal institusi", async ({ playwright, baseURL }) => {
    const ctx = await anon(playwright, baseURL!);
    const v = await loginApi(ctx, ACCOUNTS.pasien1.phone, "institusi");
    expect(v.status()).toBe(400);
  });

  test("nomor staf tidak bisa masuk lewat portal pasien", async ({ playwright, baseURL }) => {
    const ctx = await anon(playwright, baseURL!);
    const v = await loginApi(ctx, ACCOUNTS.petugasA.phone, "pasien");
    expect(v.status(), await v.text()).toBe(400);
    expect(v.headers()["set-cookie"]).toBeUndefined();
  });

  test("petugas nonaktif ditolak saat login", async ({ playwright, baseURL }) => {
    const ctx = await anon(playwright, baseURL!);
    const v = await loginApi(ctx, ACCOUNTS.petugasNonaktif.phone, "institusi");
    expect(v.status(), await v.text()).toBeGreaterThanOrEqual(400);
    expect(v.headers()["set-cookie"]).toBeUndefined();
  });

  test("OTP tersimpan sebagai hash, bukan teks asli", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const ctx = await anon(playwright, baseURL!);
    const { devOtp } = await (await ctx.post("/api/auth/otp/request", { data: { phone: ACCOUNTS.pasien1.phone } })).json();
    const rows = await adminQuery<{ code_hash: string }>("SELECT code_hash FROM otp_codes");
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.code_hash).not.toContain(devOtp);
  });
});

test.describe("Sesi dan Origin", () => {
  test("tanpa sesi: halaman peran dialihkan ke masuk, API 401", async ({ playwright, baseURL, browser }) => {
    const ctx = await browser.newContext({ baseURL });
    const page = await ctx.newPage();
    for (const [path, dest] of [["/pasien", /\/masuk$/], ["/pendamping", /\/masuk$/], ["/petugas", /\/masuk$/], ["/admin", /\/masuk$/], ["/kurator", /\/masuk$/]] as const) {
      await page.goto(path);
      await expect(page, path).toHaveURL(dest);
    }
    await ctx.close();
    const a = await anon(playwright, baseURL!);
    expect((await a.get("/api/pasien/akses/qr")).status()).toBe(401);
    expect((await a.post("/api/scan", { data: { token: "X" } })).status()).toBe(401);
  });

  test("cookie sesi dirusak: dialihkan dengan alasan sesi berakhir", async ({ browser, baseURL }) => {
    // Satu konteks per tujuan: pengalihan pertama menghapus cookie rusak.
    for (const [path, dest] of [["/pasien", /\/masuk\?alasan=sesi-berakhir/], ["/kurator", /\/masuk\/petugas\?alasan=sesi-berakhir/]] as const) {
      const ctx = await browser.newContext({ baseURL });
      await ctx.addCookies([{ name: "aksespass_session", value: "bukan.cookie.sah", url: baseURL! }]);
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page, path).toHaveURL(dest);
      await ctx.close();
    }
  });

  test("peran salah di prefiks lain dialihkan ke beranda perannya", async ({ browser, baseURL }) => {
    const cases = [
      ["pasien1", "/admin", /\/pasien$/],
      ["pasien1", "/kurator", /\/pasien$/],
      ["petugasA", "/pasien", /\/petugas$/],
      ["adminA", "/petugas", /\/admin$/],
      ["kurator1", "/admin", /\/kurator$/],
      ["pendamping", "/pasien", /\/pendamping$/],
    ] as const;
    for (const [key, path, dest] of cases) {
      const ctx = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
      await loginApi(ctx.request, ACCOUNTS[key].phone, ACCOUNTS[key].portal);
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page, `${key} -> ${path}`).toHaveURL(dest);
      await ctx.close();
    }
  });

  test("peran salah di API dijawab 403 (bukan 500)", async ({ playwright, baseURL }) => {
    const pasien = await apiAs(playwright, baseURL!, "pasien1");
    expect((await pasien.post("/api/scan", { data: { token: "ABC" } })).status()).toBe(403);
    expect((await pasien.post("/api/admin/petugas", { data: { name: "X", phone: "+620000000099", unit: "U" } })).status()).toBeGreaterThanOrEqual(400);
    const staff = await apiAs(playwright, baseURL!, "petugasA");
    expect((await staff.get("/api/pasien/akses/qr")).status()).toBe(403);
    const kur = await apiAs(playwright, baseURL!, "kurator1");
    expect((await kur.post("/api/pasien/qr/revoke-all")).status()).toBe(403);
  });

  test("permintaan tulis dengan Origin asing ditolak 403 (tanpa Origin = klien non-peramban, diizinkan)", async ({ playwright, baseURL }) => {
    await resetRateLimits();
    const evil = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: "https://jahat.example" } });
    const r2 = await evil.post("/api/auth/otp/request", { data: { phone: ACCOUNTS.pasien1.phone } });
    expect(r2.status()).toBe(403);
    expect((await jsonOf(r2)).error).toMatch(/Origin/i);
  });
});
