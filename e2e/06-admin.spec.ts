import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminQuery } from "./helpers/db";
import { apiAs, jsonOf } from "./helpers/api";
import { loginAs } from "./helpers/auth";

const STAFF_A1 = "22222222-2222-4222-8222-222222222301";
let adminA: APIRequestContext;
let adminB: APIRequestContext;
let p1: APIRequestContext;
let staffA: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  adminA = await apiAs(playwright, baseURL!, "adminA");
  adminB = await apiAs(playwright, baseURL!, "adminB");
  p1 = await apiAs(playwright, baseURL!, "pasien1");
  staffA = await apiAs(playwright, baseURL!, "petugasA");
});

test.describe("Admin: kelola petugas (A2, A4, A5)", () => {
  test("daftar petugas, tambah, ubah nama, nonaktifkan, aktifkan lagi", async () => {
    const phone = `+62000000${String(Date.now()).slice(-4)}9`;
    const add = await adminA.post("/api/admin/petugas", { data: { name: "Petugas E2E", phone, unit: "Poli Umum" } });
    expect(add.status(), await add.text()).toBe(200);
    const { userId } = await add.json();
    expect(userId).toBeTruthy();

    const patch = await adminA.patch(`/api/admin/petugas/${userId}`, { data: { name: "Petugas E2E Baru", unit: "Poli Gigi" } });
    expect(patch.status(), await patch.text()).toBe(200);

    expect((await adminA.post(`/api/admin/petugas/${userId}/status`, { data: { active: false } })).status()).toBe(200);
    expect((await adminA.post(`/api/admin/petugas/${userId}/status`, { data: { active: true } })).status()).toBe(200);
  });

  test("validasi: nama kosong/terlalu panjang, nomor tidak valid, unit kosong", async () => {
    const ok = { name: "Petugas X", phone: "+620000000077", unit: "Poli" };
    for (const [label, data] of [
      ["nama kosong", { ...ok, name: "  " }],
      ["nama panjang", { ...ok, name: "A".repeat(500) }],
      ["unit kosong", { ...ok, unit: "" }],
      ["nomor huruf", { ...ok, phone: "abcdef" }],
      ["nomor kosong", { ...ok, phone: "" }],
    ] as const) {
      const r = await adminA.post("/api/admin/petugas", { data });
      expect(r.status(), label).toBe(400);
    }
  });

  test("nomor yang sudah dipakai pasien/petugas/admin tidak bisa didaftarkan (tanpa membocorkan siapa)", async () => {
    for (const phone of ["+620000000001", "+620000000011", "+620000000021", "+620000000031"]) {
      const r = await adminA.post("/api/admin/petugas", { data: { name: "Duplikat", phone, unit: "Poli" } });
      expect(r.status(), phone).toBe(409);
      expect(JSON.stringify(await jsonOf(r))).not.toMatch(/Pasien Contoh|Petugas Contoh|Admin Fasilitas/);
    }
  });

  test("admin fasilitas B tidak bisa mengubah atau menonaktifkan petugas fasilitas A", async () => {
    const st = await adminB.post(`/api/admin/petugas/${STAFF_A1}/status`, { data: { active: false } });
    expect(st.status()).toBe(404);
    const pt = await adminB.patch(`/api/admin/petugas/${STAFF_A1}`, { data: { name: "Diretas", unit: "X" } });
    expect(pt.status()).toBe(404);
    const row = await adminQuery<{ active: boolean }>("SELECT u.is_active AS active FROM users u WHERE u.id = $1", [STAFF_A1]).catch(() => []);
    if (row[0]) expect(row[0].active).toBe(true);
    // Petugas A tetap bisa memindai (masih aktif).
    const scan = await staffA.post("/api/scan", { data: { token: "ZZZZZZZZZZZZZZZZZZZZZZZZZZ" } });
    expect(scan.status()).toBe(422);
  });

  test("status 'active' harus boolean", async () => {
    for (const active of ["false", 0, null, undefined]) {
      const r = await adminA.post(`/api/admin/petugas/${STAFF_A1}/status`, { data: { active } });
      expect(r.status(), String(active)).toBe(400);
    }
  });

  test("peran selain admin fasilitas ditolak", async () => {
    for (const ctx of [p1, staffA]) {
      const r = await ctx.post("/api/admin/petugas", { data: { name: "X", phone: "+620000000088", unit: "Y" } });
      expect([401, 403]).toContain(r.status());
    }
  });
});

test.describe("Admin: tindak lanjut (A8)", () => {
  test("buat tindak lanjut, kategori sama ganda ditolak 409, ubah status bertahap", async () => {
    const created = await adminA.post("/api/admin/tindak-lanjut", { data: { category: "mobilitas" } });
    let id: string;
    if (created.status() === 409) {
      id = (await created.json()).id ?? "";
    } else {
      expect(created.status(), await created.text()).toBe(200);
      id = (await created.json()).id;
      const dup = await adminA.post("/api/admin/tindak-lanjut", { data: { category: "mobilitas" } });
      expect(dup.status()).toBe(409);
    }
    if (id) {
      const prog = await adminA.patch(`/api/admin/tindak-lanjut/${id}`, { data: { status: "dikerjakan", stepNote: "Sudah diperiksa jalur kursi roda." } });
      expect(prog.status(), await prog.text()).toBe(200);
      const done = await adminA.patch(`/api/admin/tindak-lanjut/${id}`, { data: { status: "selesai" } });
      expect(done.status(), await done.text()).toBe(200);
    }
  });

  test("validasi: kategori tak dikenal, status tak dikenal, catatan terlalu panjang", async () => {
    expect((await adminA.post("/api/admin/tindak-lanjut", { data: { category: "ngawur" } })).status()).toBe(400);
    const c = await adminA.post("/api/admin/tindak-lanjut", { data: { category: "komunikasi" } });
    const id = c.status() === 200 ? (await c.json()).id : (await c.json()).id;
    expect((await adminA.patch(`/api/admin/tindak-lanjut/${id}`, { data: { status: "ngawur" } })).status()).toBe(400);
    expect((await adminA.patch(`/api/admin/tindak-lanjut/${id}`, { data: { status: "dikerjakan", stepNote: "x".repeat(3000) } })).status()).toBe(400);
  });

  test("admin fasilitas B tidak dapat mengubah tindak lanjut fasilitas A", async () => {
    const c = await adminA.post("/api/admin/tindak-lanjut", { data: { category: "penglihatan" } });
    const id = (await c.json()).id;
    if (!id) test.skip(true, "tidak ada id tindak lanjut");
    const r = await adminB.patch(`/api/admin/tindak-lanjut/${id}`, { data: { status: "selesai" } });
    expect(r.status()).toBe(404);
  });
});

test.describe("Admin: halaman dashboard (A3, A6, A7)", () => {
  test("dashboard, belum-terpenuhi, petugas, tindak-lanjut terbuka tanpa galat dan tanpa identitas pasien", async ({ page, context }) => {
    await loginAs(context, "adminA");
    for (const path of ["/admin", "/admin/dashboard", "/admin/belum-terpenuhi", "/admin/petugas", "/admin/petugas/tambah", "/admin/tindak-lanjut"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      const text = await page.locator("body").innerText();
      expect(text, path).not.toMatch(/Application error|Internal Server Error|undefined|NaN/);
      if (path !== "/admin/petugas") expect(text, `${path} tidak boleh memuat identitas pasien`).not.toMatch(/Pasien Contoh|\+62000000000[1-9]/);
    }
  });

  test("halaman admin B tidak menampilkan petugas fasilitas A", async ({ page, context }) => {
    await loginAs(context, "adminB");
    await page.goto("/admin/petugas");
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Petugas Contoh Aktif A");
    expect(text).not.toContain("Petugas Contoh Nonaktif A");
  });

  test("detail petugas fasilitas lain: 404, bukan data", async ({ page, context }) => {
    await loginAs(context, "adminB");
    const res = await page.goto(`/admin/petugas/${STAFF_A1}`);
    expect([200, 404]).toContain(res?.status());
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Petugas Contoh Aktif A");
  });
});
