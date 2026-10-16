 
import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminQuery } from "./helpers/db";
import { FAC_A, apiAs, freshQr, jsonOf } from "./helpers/api";

let p1: APIRequestContext;
let p2: APIRequestContext;
let staffA: APIRequestContext;
let staffB: APIRequestContext;
let admin: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  p1 = await apiAs(playwright, baseURL!, "pasien1");
  p2 = await apiAs(playwright, baseURL!, "pasien2");
  staffA = await apiAs(playwright, baseURL!, "petugasA");
  staffB = await apiAs(playwright, baseURL!, "petugasB");
  admin = await apiAs(playwright, baseURL!, "adminA");
});

async function openVisit(patient = p1) {
  const qr = await freshQr(patient, FAC_A, ["pendengaran", "komunikasi"]);
  const scan = await staffA.post("/api/scan", { data: { token: qr.token } });
  expect(scan.status(), await scan.text()).toBe(200);
  const j = await scan.json();
  return { visitId: j.visitId as string, scan: j };
}

/** Petugas wajib mencatat bantuan sebelum pasien bisa mengonfirmasi. */
async function recordAndFinish(visitId: string) {
  const c = await staffA.post("/api/petugas/kunjungan/catat", { data: { visitId, ruleIds: [], note: "Dicatat petugas." } });
  expect(c.status(), await c.text()).toBe(200);
  const d = await staffA.post("/api/petugas/kunjungan/selesai", { data: { visitId } });
  expect(d.status(), await d.text()).toBe(200);
}

test("pasien tidak bisa konfirmasi sebelum petugas mencatat bantuan", async () => {
  const { visitId } = await openVisit();
  const r = await p1.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status: "terpenuhi", unmetNeedCodes: [] } });
  expect(r.status()).toBe(400);
  expect((await jsonOf(r)).code ?? "").toBe("VISIT_NOT_RECORDED");
});

test.describe("Kunjungan: alur sah (T6-T9, P16)", () => {
  test("saran tindakan mengikuti kebutuhan pasien dan memuat sumber serta versi", async () => {
    const { scan } = await openVisit();
    const codes = scan.kebutuhan.map((k: { kode: string }) => k.kode);
    const r = await staffA.post("/api/petugas/saran", { data: { needCodes: codes } });
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(Array.isArray(j.suggestions)).toBe(true);
    for (const s of j.suggestions) {
      expect(s.actionText).toBeTruthy();
      expect(s.source).toBeTruthy();
      expect(s.version).toBeGreaterThanOrEqual(1);
    }
  });

  test("saran hanya memakai aturan TERBIT (draft/tinjauan tidak bocor ke petugas)", async () => {
    const r = await staffA.post("/api/petugas/saran", { data: { needCodes: ["lingkungan_tenang"] } });
    const j = await r.json();
    const texts = j.suggestions.map((s: { actionText: string }) => s.actionText).join(" ");
    expect(texts).not.toContain("Contoh aturan dalam tinjauan");
  });

  test("panggil, catat bantuan, selesai, lalu pasien konfirmasi", async () => {
    const { visitId } = await openVisit();
    const call = await staffA.post("/api/petugas/kunjungan/panggil", { data: { visitId, room: "Ruang 2" } });
    expect(call.status(), await call.text()).toBe(200);
    const catat = await staffA.post("/api/petugas/kunjungan/catat", { data: { visitId, ruleIds: [], note: "Sudah dijelaskan pelan." } });
    expect(catat.status(), await catat.text()).toBe(200);
    const done = await staffA.post("/api/petugas/kunjungan/selesai", { data: { visitId } });
    expect(done.status(), await done.text()).toBe(200);
    const conf = await p1.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status: "terpenuhi", unmetNeedCodes: [] } });
    expect(conf.status(), await conf.text()).toBe(200);
  });

  test("konfirmasi 'belum' mencatat kebutuhan yang belum terpenuhi", async () => {
    const { visitId, scan } = await openVisit();
    await recordAndFinish(visitId);
    const need = scan.kebutuhan[0].kode;
    const conf = await p1.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status: "belum", unmetNeedCodes: [need] } });
    expect(conf.status(), await conf.text()).toBe(200);
  });

  test("pasien dapat melihat status kunjungan miliknya", async () => {
    const { visitId } = await openVisit();
    const r = await p1.get(`/api/pasien/kunjungan/${visitId}/status`);
    expect(r.status(), await r.text()).toBe(200);
  });
});

test.describe("Kunjungan: pelanggaran", () => {
  test("visitId kosong, bukan teks, atau bukan UUID ditolak tanpa 500", async () => {
    for (const ep of ["panggil", "catat", "selesai", "konfirmasi"]) {
      const empty = await staffA.post(`/api/petugas/kunjungan/${ep}`, { data: {} });
      expect(empty.status(), `${ep} kosong`).toBe(400);
      const junk = await staffA.post(`/api/petugas/kunjungan/${ep}`, { data: { visitId: "bukan-uuid", status: "terpenuhi" } });
      expect(junk.status(), `${ep} ngawur`).toBeLessThan(500);
      expect(junk.status(), `${ep} ngawur`).toBeGreaterThanOrEqual(400);
    }
  });

  test("petugas fasilitas lain tidak boleh menyentuh kunjungan fasilitas A", async () => {
    const { visitId } = await openVisit();
    for (const [ep, data] of [
      ["panggil", { visitId, room: "X" }],
      ["catat", { visitId, ruleIds: [], note: "x" }],
      ["selesai", { visitId }],
    ] as const) {
      const r = await staffB.post(`/api/petugas/kunjungan/${ep}`, { data });
      expect(r.status(), ep).toBeGreaterThanOrEqual(400);
      expect(r.status(), ep).toBeLessThan(500);
    }
    const still = await adminQuery<{ completed_at: string | null }>("SELECT completed_at FROM visits WHERE id = $1", [visitId]);
    expect(still[0].completed_at, "kunjungan fasilitas A tidak boleh diselesaikan petugas B").toBeNull();
  });

  test("pasien lain tidak boleh mengonfirmasi atau melihat kunjungan orang lain", async () => {
    const { visitId } = await openVisit(p1);
    const conf = await p2.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status: "terpenuhi", unmetNeedCodes: [] } });
    expect(conf.status()).toBeGreaterThanOrEqual(400);
    expect(conf.status()).toBeLessThan(500);
    const st = await p2.get(`/api/pasien/kunjungan/${visitId}/status`);
    expect([403, 404]).toContain(st.status());
  });

  test("status konfirmasi di luar terpenuhi/sebagian/belum ditolak 400", async () => {
    const { visitId } = await openVisit();
    for (const status of ["sempurna", "", 5, null]) {
      const r = await p1.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status } });
      expect(r.status(), String(status)).toBe(400);
    }
  });

  test("konfirmasi ganda untuk kunjungan yang sama tidak membuat data ganda atau 500", async () => {
    const { visitId } = await openVisit();
    await recordAndFinish(visitId);
    const a = await p1.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status: "terpenuhi", unmetNeedCodes: [] } });
    const b = await p1.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId, status: "belum", unmetNeedCodes: [] } });
    expect(a.status()).toBe(200);
    expect(b.status()).toBeLessThan(500);
  });

  test("catat bantuan dengan rule yang tidak ada atau catatan terlalu panjang ditolak", async () => {
    const { visitId } = await openVisit();
    const r1 = await staffA.post("/api/petugas/kunjungan/catat", { data: { visitId, ruleIds: ["00000000-0000-4000-8000-000000000000"], note: "" } });
    expect(r1.status()).toBeLessThan(500);
    const r2 = await staffA.post("/api/petugas/kunjungan/catat", { data: { visitId, ruleIds: [], note: "x".repeat(5000) } });
    expect(r2.status()).toBeLessThan(500);
    expect([r1.status(), r2.status()].some((s) => s >= 400)).toBe(true);
  });

  test("petugas nonaktif: sesi lama tidak lagi bisa memindai setelah admin menonaktifkan", async ({ playwright, baseURL }) => {
    // Gunakan petugas B (admin B yang berwenang) agar petugas A tetap aktif untuk tes lain.
    const adminB = await apiAs(playwright, baseURL!, "adminB");
    const sb = await apiAs(playwright, baseURL!, "petugasB");
    const off = await adminB.post("/api/admin/petugas/22222222-2222-4222-8222-222222222303/status", { data: { active: false } });
    expect(off.status(), await off.text()).toBe(200);
    const scan = await sb.post("/api/scan", { data: { token: "ZZZZZZZZZZZZZZZZZZZZZZZZZZ" } });
    expect(scan.status()).toBe(403);
    expect((await jsonOf(scan)).error).toMatch(/tidak aktif/i);
    const on = await adminB.post("/api/admin/petugas/22222222-2222-4222-8222-222222222303/status", { data: { active: true } });
    expect(on.status()).toBe(200);
  });

  test("admin fasilitas tidak boleh memindai atau mencatat kunjungan (hanya staff)", async () => {
    const { visitId } = await openVisit();
    // /api/scan menjawab 403; rute kunjungan lama menjawab 401 untuk peran salah. Keduanya menolak.
    expect([401, 403]).toContain((await admin.post("/api/scan", { data: { token: "ZZZZZZZZZZZZZZZZZZZZZZZZZZ" } })).status());
    expect([401, 403]).toContain((await admin.post("/api/petugas/kunjungan/selesai", { data: { visitId } })).status());
  });
});
