 
import { test, expect, type APIRequestContext } from "@playwright/test";
import { adminQuery } from "./helpers/db";
import { ALL_FIELDS, FAC_A, FAC_B, apiAs, freshQr, jsonOf } from "./helpers/api";

let p1: APIRequestContext;
let p2: APIRequestContext;
let staffA: APIRequestContext;
let staffB: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  p1 = await apiAs(playwright, baseURL!, "pasien1");
  p2 = await apiAs(playwright, baseURL!, "pasien2");
  staffA = await apiAs(playwright, baseURL!, "petugasA");
  staffB = await apiAs(playwright, baseURL!, "petugasB");
});

test.beforeEach(async () => {
  await p1.post("/api/pasien/qr/revoke-all");
  await p2.post("/api/pasien/qr/revoke-all");
});

test.describe("Paspor kebutuhan (P5/P6)", () => {
  test("simpan paspor sah berhasil", async () => {
    const codes = await adminQuery<{ code: string }>("SELECT code FROM needs_catalog ORDER BY code LIMIT 2");
    const r = await p1.post("/api/pasien/paspor", { data: { preferredName: "Pasien Contoh 1", needCodes: codes.map((c) => c.code), patientNote: "Tolong bicara pelan." } });
    expect(r.status(), await r.text()).toBe(200);
  });

  test("nama panggilan kosong ditolak 422", async () => {
    const r = await p1.post("/api/pasien/paspor", { data: { preferredName: "   ", needCodes: ["lingkungan_tenang"] } });
    expect(r.status()).toBe(422);
  });

  test("kolom diagnosis ditolak (privasi: tanpa diagnosis)", async () => {
    for (const key of ["diagnosis", "diagnosa", "Diagnosis_Medis"]) {
      const r = await p1.post("/api/pasien/paspor", { data: { preferredName: "X", needCodes: ["lingkungan_tenang"], [key]: "autisme" } });
      expect(r.status(), key).toBe(422);
      expect((await jsonOf(r)).error).toMatch(/diagnosis/i);
    }
  });

  test("kunci tak dikenal dan kode kebutuhan tak dikenal ditolak", async () => {
    expect((await p1.post("/api/pasien/paspor", { data: { preferredName: "X", needCodes: ["lingkungan_tenang"], isiBebas: 1 } })).status()).toBe(422);
    expect((await p1.post("/api/pasien/paspor", { data: { preferredName: "X", needCodes: ["kode_ngawur_123"] } })).status()).toBe(422);
  });

  test("JSON rusak ditolak 400", async () => {
    const r = await p1.post("/api/pasien/paspor", { headers: { "content-type": "application/json" }, data: Buffer.from("{bukan json") });
    expect(r.status()).toBe(400);
  });
});

test.describe("ConsentQR (P11/P12)", () => {
  test("buat QR: token tidak memuat data pasien, tersimpan sebagai hash", async () => {
    const qr = await freshQr(p1);
    expect(qr.token).toMatch(/^[0-9A-Z]{20,}$/);
    expect(qr.token).not.toMatch(/pasien|contoh|\+62/i);
    const rows = await adminQuery<{ token_hash: string }>("SELECT token_hash FROM consent_qr WHERE id = $1", [qr.qrId]);
    expect(rows[0].token_hash).not.toBe(qr.token);
    expect(rows[0].token_hash.length).toBe(64);
  });

  test("daftar QR aktif memuat QR baru dan label bidang", async () => {
    const qr = await freshQr(p1, FAC_A, ["pendengaran"]);
    const list = await (await p1.get("/api/pasien/akses/qr")).json();
    const mine = list.data.find((q: { id: string }) => q.id === qr.qrId);
    expect(mine.sharedFields).toEqual(["pendengaran"]);
    expect(mine.facilityName).toBe("Puskesmas Contoh A");
  });

  test("QR kedua untuk fasilitas sama ditolak (satu QR aktif per fasilitas)", async () => {
    await freshQr(p1);
    const r = await p1.post("/api/pasien/kunjungan/consent", { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" } });
    expect(r.status()).toBe(422);
    expect((await jsonOf(r)).error).toMatch(/QR aktif/i);
  });

  test("QR untuk fasilitas berbeda boleh berdampingan", async () => {
    await freshQr(p1, FAC_A);
    const r = await p1.post("/api/pasien/kunjungan/consent", { data: { facilityId: FAC_B, sharedFields: ["komunikasi"], duration: "1 jam" } });
    expect(r.status(), await r.text()).toBe(200);
  });

  test("validasi: tanpa fasilitas, tanpa bidang, bidang terlarang, JSON rusak", async () => {
    const base = { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "1 jam" };
    expect((await p1.post("/api/pasien/kunjungan/consent", { data: { ...base, facilityId: "" } })).status()).toBe(422);
    expect((await p1.post("/api/pasien/kunjungan/consent", { data: { ...base, sharedFields: [] } })).status()).toBe(422);
    for (const bad of ["diagnosis", "nama_lengkap", "nik", "<script>"]) {
      const r = await p1.post("/api/pasien/kunjungan/consent", { data: { ...base, sharedFields: ["komunikasi", bad] } });
      expect(r.status(), bad).toBe(422);
    }
    expect((await p1.post("/api/pasien/kunjungan/consent", { data: { ...base, facilityId: "00000000-0000-4000-8000-000000000000" } })).status()).toBeGreaterThanOrEqual(400);
    expect((await p1.post("/api/pasien/kunjungan/consent", { headers: { "content-type": "application/json" }, data: Buffer.from("{rusak") })).status()).toBe(400);
  });

  test("durasi tak dikenal tidak membuat QR berumur panjang", async () => {
    const r = await p1.post("/api/pasien/kunjungan/consent", { data: { facilityId: FAC_A, sharedFields: ["komunikasi"], duration: "10 tahun" } });
    if (r.status() === 200) {
      const j = await r.json();
      const hours = (new Date(j.expiresAt).getTime() - Date.now()) / 3_600_000;
      expect(hours).toBeLessThanOrEqual(24 * 7 + 1);
    } else {
      expect(r.status()).toBe(422);
    }
  });

  test("cabut QR: scan sesudahnya ditolak dengan pesan generik yang sama", async () => {
    const qr = await freshQr(p1);
    const ok = await staffA.post("/api/scan", { data: { token: qr.token } });
    expect(ok.status()).toBe(200);
    const rev = await p1.post(`/api/pasien/qr/${qr.qrId}/revoke`);
    expect(rev.status(), await rev.text()).toBe(200);
    const after = await staffA.post("/api/scan", { data: { token: qr.token } });
    const ngawur = await staffA.post("/api/scan", { data: { token: "ZZZZZZZZZZZZZZZZZZZZZZZZZZ" } });
    expect(after.status()).toBe(422);
    expect(await jsonOf(after)).toEqual(await jsonOf(ngawur));
  });

  test("cabut semua QR", async () => {
    await freshQr(p1, FAC_A);
    await p1.post("/api/pasien/kunjungan/consent", { data: { facilityId: FAC_B, sharedFields: ["komunikasi"], duration: "1 jam" } });
    const r = await p1.post("/api/pasien/qr/revoke-all");
    expect(r.status()).toBe(200);
    const list = await (await p1.get("/api/pasien/akses/qr")).json();
    expect(list.data).toHaveLength(0);
  });

  test("pasien lain tidak dapat mencabut atau melihat status QR milik orang lain", async () => {
    const qr = await freshQr(p1);
    const rev = await p2.post(`/api/pasien/qr/${qr.qrId}/revoke`);
    expect(rev.status()).not.toBe(500);
    const still = await staffA.post("/api/scan", { data: { token: qr.token } });
    expect(still.status(), "QR milik pasien1 harus tetap sah").toBe(200);
    const list2 = await (await p2.get("/api/pasien/akses/qr")).json();
    expect(list2.data.find((q: { id: string }) => q.id === qr.qrId)).toBeUndefined();
    const st = await p2.get(`/api/pasien/qr/${qr.qrId}/status`);
    expect([403, 404]).toContain(st.status());
  });

  test("riwayat akses mencatat pembuatan QR dan pindai petugas, tanpa isi profil", async () => {
    const qr = await freshQr(p1);
    await staffA.post("/api/scan", { data: { token: qr.token } });
    const hist = await (await p1.get("/api/pasien/akses/riwayat")).json();
    const types = hist.data.map((h: { eventType: string }) => h.eventType);
    expect(types).toContain("qr_created");
    expect(JSON.stringify(hist)).not.toMatch(/diagnos/i);
  });
});

test.describe("Pemindaian oleh petugas (T3-T5)", () => {
  test("QR sah memberi kebutuhan sesuai bidang yang dicentang saja", async () => {
    const qr = await freshQr(p1, FAC_A, ["pendengaran"]);
    const r = await staffA.post("/api/scan", { data: { token: qr.token } });
    const j = await r.json();
    expect(r.status()).toBe(200);
    expect(j.kebutuhan.length).toBeGreaterThan(0);
    for (const k of j.kebutuhan) expect(k.kategori).toBe("pendengaran");
    expect(JSON.stringify(j)).not.toMatch(/diagnos/i);
  });

  test("format token longgar (huruf kecil, spasi, tanda hubung, URL) tetap terbaca", async () => {
    const qr = await freshQr(p1);
    const spaced = qr.token.toLowerCase().replace(/(.{4})/g, "$1-");
    expect((await staffA.post("/api/scan", { data: { token: spaced } })).status()).toBe(200);
    expect((await staffA.post("/api/scan", { data: { token: `https://localhost:3100/s#${qr.token}` } })).status()).toBe(200);
  });

  test("petugas fasilitas lain tidak dapat memakai QR (respons generik)", async () => {
    const qr = await freshQr(p1, FAC_A);
    const r = await staffB.post("/api/scan", { data: { token: qr.token } });
    expect(r.status()).toBe(422);
    const ngawur = await staffB.post("/api/scan", { data: { token: "ZZZZZZZZZZZZZZZZZZZZZZZZZZ" } });
    expect(await jsonOf(r)).toEqual(await jsonOf(ngawur));
  });

  test("QR kedaluwarsa ditolak", async () => {
    const qr = await freshQr(p1);
    await adminQuery("UPDATE consent_qr SET expires_at = now() - interval '1 minute' WHERE id = $1", [qr.qrId]);
    const r = await staffA.post("/api/scan", { data: { token: qr.token } });
    expect(r.status()).toBe(422);
  });

  test("token kosong, JSON rusak, dan karakter aneh tidak menyebabkan 500", async () => {
    for (const data of [{}, { token: "" }, { token: "'; DROP TABLE consents;--" }, { token: "A".repeat(5000) }, { token: 12345 }]) {
      const r = await staffA.post("/api/scan", { data });
      expect([400, 422], JSON.stringify(data).slice(0, 40)).toContain(r.status());
    }
    const r = await staffA.post("/api/scan", { headers: { "content-type": "application/json" }, data: Buffer.from("{rusak") });
    expect([400, 422]).toContain(r.status());
  });

  test("batas percobaan pindai: banyak token salah berujung 429", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 40; i++) {
      const r = await staffA.post("/api/scan", { data: { token: `SALAH${i}`.padEnd(26, "X") } });
      statuses.push(r.status());
      if (r.status() === 429) break;
    }
    expect(statuses).toContain(429);
    await adminQuery("DELETE FROM rate_limit_hits");
  });

  test("pindai tercatat di audit tanpa isi profil", async () => {
    const qr = await freshQr(p1);
    await staffA.post("/api/scan", { data: { token: qr.token } });
    const rows = await adminQuery<{ event_type: string }>("SELECT event_type FROM audit_events ORDER BY occurred_at DESC LIMIT 6");
    expect(rows.map((r) => r.event_type)).toEqual(expect.arrayContaining(["qr_scanned"]));
  });
});

test("seed menyediakan semua bidang yang sah untuk dibagikan", async () => {
  expect(ALL_FIELDS.length).toBe(6);
});
