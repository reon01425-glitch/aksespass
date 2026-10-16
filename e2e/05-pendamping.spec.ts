import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminQuery, resetRateLimits } from "./helpers/db";
import { FAC_A, apiAs, jsonOf } from "./helpers/api";

let p2: APIRequestContext;
let p4: APIRequestContext;
let comp: APIRequestContext;
let staffA: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  p2 = await apiAs(playwright, baseURL!, "pasien2");
  p4 = await apiAs(playwright, baseURL!, "pasien4");
  comp = await apiAs(playwright, baseURL!, "pendamping");
  staffA = await apiAs(playwright, baseURL!, "petugasA");
});

const P2_ID = "22222222-2222-4222-8222-222222222102";
const cleanP2 = () => adminQuery("DELETE FROM companions WHERE patient_user_id = $1", [P2_ID]);
test.beforeEach(async () => {
  await cleanP2();
  await resetRateLimits();
});
test.afterEach(cleanP2);

async function linkP2() {
  const code = await (await p2.post("/api/pasien/pendamping/kode")).json();
  expect(code.ok).toBe(true);
  const red = await comp.post("/api/pendamping/tautkan", { data: { code: code.code } });
  expect(red.status(), await red.text()).toBe(200);
  const j = await red.json();
  return { code: code.code as string, link: j };
}

test.describe("Penautan pendamping (D2-D4, P21)", () => {
  test("kode tautan: pendamping menukar, pasien menyetujui, lalu pendamping bisa membuat QR atas nama pasien", async () => {
    const { link } = await linkP2();
    const linkId = link.linkId ?? link.id ?? link.link?.id;
    expect(linkId, JSON.stringify(link)).toBeTruthy();

    // Sebelum disetujui, pendamping belum boleh bertindak.
    const early = await comp.post(`/api/pendamping/tautan/${linkId}/qr`, { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" } });
    expect(early.status(), "tautan belum disetujui").toBeGreaterThanOrEqual(400);

    const ap = await p2.post(`/api/pasien/pendamping/${linkId}/approve`);
    expect(ap.status(), await ap.text()).toBe(200);

    await p2.post("/api/pasien/qr/revoke-all");
    const qr = await comp.post(`/api/pendamping/tautan/${linkId}/qr`, { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" } });
    expect(qr.status(), await qr.text()).toBe(200);

    // Setelah pasien mencabut tautan, pendamping langsung kehilangan akses.
    const rv = await p2.post(`/api/pasien/pendamping/${linkId}/revoke`);
    expect(rv.status(), await rv.text()).toBe(200);
    await p2.post("/api/pasien/qr/revoke-all");
    const after = await comp.post(`/api/pendamping/tautan/${linkId}/qr`, { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" } });
    expect(after.status()).toBeGreaterThanOrEqual(400);
    expect(after.status()).toBeLessThan(500);
  });

  test("pasien dapat menolak permintaan tautan", async () => {
    const { link } = await linkP2();
    const linkId = link.linkId ?? link.id ?? link.link?.id;
    const rj = await p2.post(`/api/pasien/pendamping/${linkId}/reject`);
    expect(rj.status(), await rj.text()).toBe(200);
    const ap = await p2.post(`/api/pasien/pendamping/${linkId}/approve`);
    expect(ap.status(), "tautan yang ditolak tidak bisa disetujui").toBeGreaterThanOrEqual(400);
  });
});

test.describe("Pendamping: pelanggaran", () => {
  test("menebak kode tautan berulang kali berujung 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 30; i++) {
      const r = await comp.post("/api/pendamping/tautkan", { data: { code: `TEBAK${String(i).padStart(3, "0")}` } });
      statuses.push(r.status());
      if (r.status() === 429) break;
    }
    expect(statuses).toContain(429);
  });

  test("kode salah, kosong, atau tak dikenal ditolak", async () => {
    for (const code of ["", "SALAHSALAH", "N436-7FC4", "0000"]) {
      const r = await comp.post("/api/pendamping/tautkan", { data: { code } });
      expect([400, 404, 410, 422], `kode ${code}`).toContain(r.status());
    }
  });

  test("kode tautan sekali pakai: pemakaian kedua gagal", async () => {
    const { code } = await linkP2();
    const again = await comp.post("/api/pendamping/tautkan", { data: { code } });
    expect(again.status()).toBeGreaterThanOrEqual(400);
    expect(again.status()).toBeLessThan(500);
    // bersihkan tautan pending agar tes lain tidak terganggu
  });

  test("kode kedaluwarsa ditolak", async () => {
    const code = await (await p2.post("/api/pasien/pendamping/kode")).json();
    await adminQuery("UPDATE companion_link_codes SET expires_at = now() - interval '1 minute'").catch(async () => {
      // nama tabel dapat berbeda; cari tabel kode tautan
      const t = await adminQuery<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%link%code%' OR table_name LIKE '%invite%'");
      if (t[0]) await adminQuery(`UPDATE ${t[0].table_name} SET expires_at = now() - interval '1 minute'`);
    });
    const r = await comp.post("/api/pendamping/tautkan", { data: { code: code.code } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test("pendamping tidak dapat bertindak atas pasien yang tidak tertaut (linkId acak)", async () => {
    const rnd = "99999999-9999-4999-8999-999999999999";
    for (const [path, data] of [
      [`/api/pendamping/tautan/${rnd}/qr`, { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" }],
      [`/api/pendamping/tautan/${rnd}/paspor`, { preferredName: "X", needCodes: ["lingkungan_tenang"] }],
    ] as const) {
      const r = await comp.post(path, { data });
      expect([403, 404, 422], path).toContain(r.status());
    }
  });

  test("pasien lain tidak dapat menyetujui/mencabut tautan milik pasien lain", async () => {
    const { link } = await linkP2();
    const linkId = link.linkId ?? link.id ?? link.link?.id;
    const ap = await p4.post(`/api/pasien/pendamping/${linkId}/approve`);
    expect(ap.status()).toBeGreaterThanOrEqual(400);
    expect(ap.status()).toBeLessThan(500);
  });

  test("pendamping tertaut dapat membuat QR atas nama pasien 4 yang sudah tertaut seed", async () => {
    await p4.post("/api/pasien/qr/revoke-all");
    const links = await adminQuery<{ id: string }>("SELECT id FROM companions WHERE patient_user_id = '22222222-2222-4222-8222-222222222104' AND status = 'active' LIMIT 1").catch(() => []);
    if (!links[0]) test.skip(true, "tautan seed pasien 4 tidak ditemukan");
    const r = await comp.post(`/api/pendamping/tautan/${links[0].id}/qr`, { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" } });
    expect(r.status(), await r.text()).toBe(200);
    await p4.post("/api/pasien/qr/revoke-all");
  });

  test("peran pasien tidak dapat memakai rute pendamping dan sebaliknya", async () => {
    expect([401, 403]).toContain((await p2.post("/api/pendamping/tautkan", { data: { code: "X" } })).status());
    expect([401, 403]).toContain((await comp.post("/api/pasien/pendamping/kode")).status());
    expect([401, 403]).toContain((await comp.post("/api/pasien/kunjungan/consent", { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" } })).status());
  });

  test("galat tidak membocorkan keberadaan pasien lain", async () => {
    const r = await comp.post("/api/pendamping/tautkan", { data: { code: "ABCD-EFGH" } });
    expect(JSON.stringify(await jsonOf(r))).not.toMatch(/Pasien Contoh|\+6200000000/);
  });
});

test("petugas tidak dapat memakai rute pendamping", async () => {
  expect([401, 403]).toContain((await staffA.post("/api/pendamping/tautkan", { data: { code: "X" } })).status());
});
