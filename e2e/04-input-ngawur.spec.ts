/* eslint-disable @typescript-eslint/no-explicit-any -- kode uji, tipe longgar disengaja */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiAs } from "./helpers/api";

/**
 * Id bukan UUID di path atau body tidak boleh menjadi galat server (500).
 * Semua rute di bawah harus menjawab 4xx.
 */
const J = "bukan-uuid";
let p: APIRequestContext, s: APIRequestContext, a: APIRequestContext, k: APIRequestContext, c: APIRequestContext;

test.beforeAll(async ({ playwright, baseURL }) => {
  p = await apiAs(playwright, baseURL!, "pasien1");
  s = await apiAs(playwright, baseURL!, "petugasA");
  a = await apiAs(playwright, baseURL!, "adminA");
  k = await apiAs(playwright, baseURL!, "kurator1");
  c = await apiAs(playwright, baseURL!, "pendamping");
});

test("id bukan UUID di semua rute: tidak ada 500", async () => {
  const calls: Array<[string, () => Promise<{ status(): number }>]> = [
    ...["panggil", "catat", "selesai", "konfirmasi"].map(
      (ep) => [`petugas ${ep}`, () => s.post(`/api/petugas/kunjungan/${ep}`, { data: { visitId: J, status: "terpenuhi", ruleIds: [], note: "" } })] as [string, () => Promise<{ status(): number }>]
    ),
    ["petugas kartu", () => s.post("/api/petugas/kunjungan/kartu", { data: { visitId: J } })],
    ["pasien konfirmasi", () => p.post("/api/pasien/kunjungan/konfirmasi", { data: { visitId: J, status: "terpenuhi" } })],
    ["pasien status kunjungan", () => p.get(`/api/pasien/kunjungan/${J}/status`)],
    ["pasien qr revoke", () => p.post(`/api/pasien/qr/${J}/revoke`)],
    ["pasien qr status", () => p.get(`/api/pasien/qr/${J}/status`)],
    ["pasien qr tampilkan", () => p.post(`/api/pasien/qr/${J}/tampilkan`)],
    ["pasien pendamping approve", () => p.post(`/api/pasien/pendamping/${J}/approve`)],
    ["pasien pendamping reject", () => p.post(`/api/pasien/pendamping/${J}/reject`)],
    ["pasien pendamping revoke", () => p.post(`/api/pasien/pendamping/${J}/revoke`)],
    ["admin petugas status", () => a.post(`/api/admin/petugas/${J}/status`, { data: { active: false } })],
    ["admin petugas patch", () => a.patch(`/api/admin/petugas/${J}`, { data: { name: "x", unit: "y" } })],
    ["admin tindak lanjut patch", () => a.patch(`/api/admin/tindak-lanjut/${J}`, { data: { status: "selesai" } })],
    ["kurator patch", () => k.patch(`/api/kurator/aturan/${J}`, { data: { actionText: "x" } })],
    ["kurator delete", () => k.delete(`/api/kurator/aturan/${J}`)],
    ["kurator ajukan", () => k.post(`/api/kurator/aturan/${J}/ajukan`, { data: { changeNote: "x" } })],
    ["kurator tinjau", () => k.post(`/api/kurator/aturan/${J}/tinjau`, { data: { decision: "approve" } })],
    ["kurator versi baru", () => k.post(`/api/kurator/garis/${J}/versi-baru`)],
    ["pendamping qr", () => c.post(`/api/pendamping/tautan/${J}/qr`, { data: { facilityId: "x", sharedFields: ["komunikasi"], duration: "1 jam" } })],
    ["pendamping paspor", () => c.post(`/api/pendamping/tautan/${J}/paspor`, { data: {} })],
    ["pendamping konfirmasi", () => c.post(`/api/pendamping/tautan/${J}/konfirmasi/${J}`, { data: { status: "terpenuhi" } })],
    ["pemulihan batal", () => p.post(`/api/pemulihan/${J}/batal`)],
    ["komunikasi pesan", () => p.get(`/api/komunikacare/pesan?kunjungan=${J}`)],
  ];
  const bad: string[] = [];
  for (const [name, fn] of calls) {
    const st = (await fn()).status();
    if (st < 400 || st >= 500) bad.push(`${name} -> ${st}`);
  }
  expect(bad, bad.join("\n")).toEqual([]);
});

test("badan JSON bukan objek atau bertipe salah tidak menjadi 500", async () => {
  const eps: Array<[string, APIRequestContext, string]> = [
    ["/api/petugas/saran", s, "post"],
    ["/api/petugas/kunjungan/catat", s, "post"],
    ["/api/admin/petugas", a, "post"],
    ["/api/admin/tindak-lanjut", a, "post"],
    ["/api/kurator/aturan", k, "post"],
    ["/api/pendamping/tautkan", c, "post"],
    ["/api/pasien/kunjungan/consent", p, "post"],
    ["/api/pasien/paspor", p, "post"],
  ];
  const bad: string[] = [];
  for (const [path, ctx, m] of eps) {
    for (const data of [null, [], "teks", 123, { needCodes: "bukan-array", sharedFields: 5, name: 5, phone: {}, category: [] }]) {
      const r = await (ctx as any)[m](path, { data, headers: { "content-type": "application/json" } });
      if (r.status() >= 500) bad.push(`${path} ${JSON.stringify(data)} -> ${r.status()}`);
    }
  }
  expect(bad, bad.join("\n")).toEqual([]);
});

test("respons galat tidak membocorkan jejak tumpukan atau SQL", async () => {
  const r = await s.post("/api/petugas/kunjungan/selesai", { data: { visitId: J } });
  const t = await r.text();
  expect(t).not.toMatch(/at\s+\S+\s+\(|node_modules|SELECT |INSERT |syntax for type uuid/i);
});
