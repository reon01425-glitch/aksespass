import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { hmacSha256Hex } from "../auth/crypto";
import { getHashPepper } from "../auth/env";
import { createSessionCookieValue } from "../auth/session";
import {
  buildQrPayload,
  calculateConsentExpiry,
  formatExpiryText,
  formatRemainingTime,
  formatTimeWib,
  generateConsentToken,
  getExpiryStatus,
  resolveDefaultSharedFields,
  scanToken,
} from "./index";
import { GET as statusRouteGet } from "../../app/api/pasien/qr/[qrId]/status/route";
import { POST as revokeRoutePost } from "../../app/api/pasien/qr/[qrId]/revoke/route";
import { createConsentReplacingActive } from "@/db/consent-test-support";

const TEST_PATIENT_USER_ID = "22222222-2222-4222-8222-222222222101"; // Pasien Contoh 1
const TEST_OTHER_PATIENT_USER_ID = "22222222-2222-4222-8222-222222222102"; // Pasien Contoh 2
const TEST_STAFF_USER_ID = "22222222-2222-4222-8222-222222222301"; // Petugas Aktif A
const FACILITY_A_ID = "11111111-1111-4111-8111-111111111101"; // Puskesmas Contoh A

async function createSessionCookieForUser(
  userId: string,
  role: "patient" | "staff",
  facilityId: string | null = null
): Promise<string> {
  const pepper = getHashPepper();
  const sessionId = crypto.randomUUID();
  const sessHash = hmacSha256Hex(pepper, sessionId);

  await withContext({ userId, role, facilityId }, async (tx) => {
    await tx.query(
      `INSERT INTO sessions (user_id, role, session_id_hash, expires_at)
       VALUES ($1, $2, $3, now() + interval '7 days');`,
      [userId, role, sessHash]
    );
  });

  const cookieValue = await createSessionCookieValue({
    sessionId,
    userId,
    role,
    facilityId,
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    version: 1,
  });

  return `aksespass_session=${cookieValue}`;
}

describe("ConsentQR: Format, Bawaan Toggle, Waktu WIB, Status Polling & Pencabutan", () => {
  it("buildQrPayload menghasilkan tepat origin + '/s#' + 26 karakter Crockford Base32, tanpa data lain", () => {
    const token = generateConsentToken();
    const payload = buildQrPayload(token, "http://localhost:3000");

    expect(payload).toBe(`http://localhost:3000/s#${token}`);
    expect(payload).toMatch(/^http:\/\/localhost:3000\/s#[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);

    // Memastikan tidak ada query params, nama, ID pasien, atau data lain di URL
    expect(payload).not.toContain("?");
    expect(payload).not.toContain("&");
    expect(payload).not.toContain("patient");
    expect(payload).not.toContain("user");
  });

  it("resolveDefaultSharedFields: bawaan toggle dari consent terakhir (diiris dengan kategori yang ada) dan fallback 'semua aktif'", () => {
    // 1. Fallback tanpa consent sebelumnya (null atau array kosong) -> semua aktif
    const fallbackNoHistory = resolveDefaultSharedFields({
      lastSharedFields: null,
      availableCategories: ["komunikasi", "mobilitas"],
      hasNote: true,
    });
    expect(fallbackNoHistory).toEqual(["komunikasi", "mobilitas", "catatan_pasien"]);

    // 2. Irisan dengan consent terakhir: hanya kategori yang masih ada yang diaktifkan
    const withHistory = resolveDefaultSharedFields({
      lastSharedFields: ["komunikasi", "penglihatan", "pendampingan", "catatan_pasien"],
      availableCategories: ["komunikasi", "mobilitas"], // pasien tidak punya penglihatan & pendampingan
      hasNote: false, // pasien tidak punya catatan lagi
    });
    expect(withHistory).toEqual(["komunikasi"]);

    // 3. Bila irisan kosong (misal semua kategori lama dihapus dari paspor) -> fallback ke semua yang ada saat ini
    const emptyIntersectionFallback = resolveDefaultSharedFields({
      lastSharedFields: ["penglihatan"],
      availableCategories: ["mobilitas"],
      hasNote: false,
    });
    expect(emptyIntersectionFallback).toEqual(["mobilitas"]);
  });

  it("format sisa waktu dan jam WIB, termasuk durasi 'hari ini'", () => {
    // 1. Format jam WIB (UTC+7)
    // 2026-10-13 07:35:00 UTC = 14:35:00 WIB
    const dateWib = new Date("2026-10-13T07:35:00.000Z");
    expect(formatTimeWib(dateWib)).toBe("14:35 WIB");

    // 2. Format sisa waktu: 52 menit
    // now = 13:43 WIB (06:43 UTC), expires = 14:35 WIB (07:35 UTC)
    const nowRef = new Date("2026-10-13T06:43:00.000Z");
    expect(formatRemainingTime(dateWib, nowRef)).toBe("sisa 52 menit");
    expect(formatExpiryText(dateWib, nowRef)).toBe(
      "Berlaku sampai 14:35 WIB (sisa 52 menit)"
    );

    // 3. Format sisa jam dan menit
    const futureDate = new Date("2026-10-13T12:12:00.000Z"); // selisih 5 jam 29 menit dari nowRef
    expect(formatRemainingTime(futureDate, nowRef)).toBe("sisa 5 jam 29 menit");

    // 4. Status sudah kedaluwarsa
    const pastDate = new Date("2026-10-13T06:00:00.000Z");
    expect(formatRemainingTime(pastDate, nowRef)).toBe("sudah kedaluwarsa");
    expect(formatExpiryText(pastDate, nowRef)).toBe("Kedaluwarsa pada 13:00 WIB");

    // 5. Durasi "hari ini": berakhir tepat pukul 23:59:59.999 WIB
    const morningNow = new Date("2026-10-13T03:00:00.000Z"); // 10:00 WIB
    const expiryToday = calculateConsentExpiry("hari ini", morningNow);
    expect(formatTimeWib(expiryToday)).toBe("23:59 WIB");
    expect(formatExpiryText(expiryToday, morningNow)).toContain("Berlaku sampai 23:59 WIB");

    // 6. getExpiryStatus
    const statusExpiringSoon = getExpiryStatus(
      new Date(nowRef.getTime() + 10 * 60 * 1000), // sisa 10 menit
      nowRef
    );
    expect(statusExpiringSoon.isExpiringSoon).toBe(true);
    expect(statusExpiringSoon.isExpired).toBe(false);

    const statusExpired = getExpiryStatus(pastDate, nowRef);
    expect(statusExpired.isExpired).toBe(true);
    expect(statusExpired.isExpiringSoon).toBe(false);
  });

  describe("Endpoint status QR (GET /api/pasien/qr/[qrId]/status) & Pencabutan", () => {
    it("tanpa sesi mengembalikan 401", async () => {
      const dummyQrId = crypto.randomUUID();
      const req = new Request(`http://localhost:3000/api/pasien/qr/${dummyQrId}/status`);
      const res = await statusRouteGet(req, {
        params: Promise.resolve({ qrId: dummyQrId }),
      });
      expect(res.status).toBe(401);
    });

    it("sesi petugas mengembalikan 403 (hanya pasien yang dapat mengakses status QR miliknya)", async () => {
      const staffCookie = await createSessionCookieForUser(
        TEST_STAFF_USER_ID,
        "staff",
        FACILITY_A_ID
      );
      const dummyQrId = crypto.randomUUID();
      const req = new Request(`http://localhost:3000/api/pasien/qr/${dummyQrId}/status`, {
        headers: { cookie: staffCookie },
      });
      const res = await statusRouteGet(req, {
        params: Promise.resolve({ qrId: dummyQrId }),
      });
      expect(res.status).toBe(403);
    });

    it("pasien lain atau QR tak dikenal mengembalikan 404 identik (RLS mencegah kebocoran)", async () => {
      const otherPatientCookie = await createSessionCookieForUser(
        TEST_OTHER_PATIENT_USER_ID,
        "patient"
      );

      // Buat QR untuk Pasien Contoh 1
      const created = await createConsentReplacingActive(
        { userId: TEST_PATIENT_USER_ID, role: "patient" },
        {
          facilityId: FACILITY_A_ID,
          sharedFields: ["komunikasi"],
          duration: "1 jam",
        }
      );

      // 1. QR milik pasien 1 diminta oleh pasien 2
      const reqOther = new Request(
        `http://localhost:3000/api/pasien/qr/${created.qrId}/status`,
        { headers: { cookie: otherPatientCookie } }
      );
      const resOther = await statusRouteGet(reqOther, {
        params: Promise.resolve({ qrId: created.qrId }),
      });
      const bodyOther = await resOther.json();
      expect(resOther.status).toBe(404);
      expect(bodyOther).toEqual({ ok: false, error: "QR tidak ditemukan" });

      // 2. QR tak dikenal sama sekali
      const randomId = crypto.randomUUID();
      const reqUnknown = new Request(
        `http://localhost:3000/api/pasien/qr/${randomId}/status`,
        { headers: { cookie: otherPatientCookie } }
      );
      const resUnknown = await statusRouteGet(reqUnknown, {
        params: Promise.resolve({ qrId: randomId }),
      });
      const bodyUnknown = await resUnknown.json();
      expect(resUnknown.status).toBe(404);
      expect(bodyUnknown).toEqual({ ok: false, error: "QR tidak ditemukan" });
    });

    it("pemilik QR: 'aktif' lalu menjadi 'dipindai' + nama fasilitas setelah scanToken", async () => {
      const patientCookie = await createSessionCookieForUser(
        TEST_PATIENT_USER_ID,
        "patient"
      );

      // 1. Buat ConsentQR baru
      const created = await createConsentReplacingActive(
        { userId: TEST_PATIENT_USER_ID, role: "patient" },
        {
          facilityId: FACILITY_A_ID,
          sharedFields: ["komunikasi"],
          duration: "1 jam",
        }
      );

      // 2. Periksa status awal -> 'aktif'
      const reqInitial = new Request(
        `http://localhost:3000/api/pasien/qr/${created.qrId}/status`,
        { headers: { cookie: patientCookie } }
      );
      const resInitial = await statusRouteGet(reqInitial, {
        params: Promise.resolve({ qrId: created.qrId }),
      });
      expect(resInitial.status).toBe(200);
      const bodyInitial = await resInitial.json();
      expect(bodyInitial.ok).toBe(true);
      expect(bodyInitial.status).toBe("aktif");
      expect(bodyInitial.facilityName).toBe("Puskesmas Contoh A");

      // 3. Petugas memindai QR via scanToken
      const scanRes = await scanToken(
        {
          userId: TEST_STAFF_USER_ID,
          role: "staff",
          facilityId: FACILITY_A_ID,
        },
        created.token
      );
      expect(scanRes.status).toBe(200);

      // 4. Periksa status kembali -> 'dipindai'
      const reqScanned = new Request(
        `http://localhost:3000/api/pasien/qr/${created.qrId}/status`,
        { headers: { cookie: patientCookie } }
      );
      const resScanned = await statusRouteGet(reqScanned, {
        params: Promise.resolve({ qrId: created.qrId }),
      });
      expect(resScanned.status).toBe(200);
      const bodyScanned = await resScanned.json();
      expect(bodyScanned.ok).toBe(true);
      expect(bodyScanned.status).toBe("dipindai");
      expect(bodyScanned.facilityName).toBe("Puskesmas Contoh A");
      expect(bodyScanned.scannedAt).toBeDefined();

      // Header Cache-Control: no-store
      expect(resScanned.headers.get("cache-control")).toBe("no-store");
    });

    it("cabut QR: status berubah 'dicabut', scan berikutnya ditolak dengan 422 QR_UNUSABLE", async () => {
      const patientCookie = await createSessionCookieForUser(
        TEST_PATIENT_USER_ID,
        "patient"
      );

      // 1. Buat ConsentQR baru
      const created = await createConsentReplacingActive(
        { userId: TEST_PATIENT_USER_ID, role: "patient" },
        {
          facilityId: FACILITY_A_ID,
          sharedFields: ["komunikasi"],
          duration: "1 jam",
        }
      );

      // 2. Cabut QR lewat route handler POST /api/pasien/qr/[qrId]/revoke
      const reqRevoke = new Request(
        `http://localhost:3000/api/pasien/qr/${created.qrId}/revoke`,
        {
          method: "POST",
          headers: {
            cookie: patientCookie,
            origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
        }
      );
      const resRevoke = await revokeRoutePost(reqRevoke, {
        params: Promise.resolve({ qrId: created.qrId }),
      });
      expect(resRevoke.status).toBe(200);
      const bodyRevoke = await resRevoke.json();
      expect(bodyRevoke).toEqual({ ok: true, count: 1 });

      // 3. Status endpoint sekarang mengembalikan 'dicabut'
      const reqStatus = new Request(
        `http://localhost:3000/api/pasien/qr/${created.qrId}/status`,
        { headers: { cookie: patientCookie } }
      );
      const resStatus = await statusRouteGet(reqStatus, {
        params: Promise.resolve({ qrId: created.qrId }),
      });
      expect(resStatus.status).toBe(200);
      const bodyStatus = await resStatus.json();
      expect(bodyStatus.ok).toBe(true);
      expect(bodyStatus.status).toBe("dicabut");

      // 4. Pindai token yang sudah dicabut -> ditolak 422 QR_UNUSABLE
      const scanRes = await scanToken(
        {
          userId: TEST_STAFF_USER_ID,
          role: "staff",
          facilityId: FACILITY_A_ID,
        },
        created.token
      );
      expect(scanRes.status).toBe(422);
      expect(scanRes.body).toEqual({
        ok: false,
        code: "QR_UNUSABLE",
        title: "QR Tidak Dapat Dipakai",
        message: "Minta pasien membuat ConsentQR baru.",
      });
    });
  });
});

describe("Satu QR aktif per pasien per fasilitas", () => {
  it("QR kedua untuk fasilitas yang sama ditolak; fasilitas lain dan setelah dicabut diizinkan", async () => {
    const { createConsent: realCreate, revokeQr } = await import("./index");
    const actor = { userId: "22222222-2222-4222-8222-222222222102", role: "patient" as const };
    const fa = "11111111-1111-4111-8111-111111111101";
    const fb = "11111111-1111-4111-8111-111111111102";
    const input = { sharedFields: ["komunikasi"], duration: "1 jam" as const };

    // Bersihkan QR aktif milik pasien 2 lebih dulu (tes lain berbagi data).
    const first = await createConsentReplacingActive(actor, { ...input, facilityId: fa });
    await expect(realCreate(actor, { ...input, facilityId: fa })).rejects.toThrow(
      "Sudah ada QR aktif untuk fasilitas ini"
    );
    const other = await createConsentReplacingActive(actor, { ...input, facilityId: fb });
    expect(other.ok).toBe(true);
    await revokeQr(actor, first.qrId);
    const again = await realCreate(actor, { ...input, facilityId: fa });
    expect(again.ok).toBe(true);
  });
});

describe("Tampilkan QR lewat penggantian (regenerateQr)", () => {
  it("mencabut QR lama, membuat QR baru dengan isian dan masa berlaku sama, mencatat audit", async () => {
    const { regenerateQr, revokeQr: revoke } = await import("./index");
    const actor = { userId: "22222222-2222-4222-8222-222222222102", role: "patient" as const };
    const fa = "11111111-1111-4111-8111-111111111101";
    const first = await createConsentReplacingActive(actor, {
      facilityId: fa,
      sharedFields: ["komunikasi", "catatan_pasien"],
      duration: "24 jam",
    });
    const again = await regenerateQr(actor, first.qrId);
    expect(again).not.toBeNull();
    expect(again!.qrId).not.toBe(first.qrId);
    expect(again!.token).not.toBe(first.token);
    expect(again!.expiresAt).toBe(first.expiresAt);
    // QR lama sudah tidak aktif, tidak bisa diganti lagi
    expect(await regenerateQr(actor, first.qrId)).toBeNull();
    expect((await revoke(actor, first.qrId)).ok).toBe(false);
    // Pasien lain tidak bisa mengganti QR milik orang lain
    expect(
      await regenerateQr({ userId: "22222222-2222-4222-8222-222222222101", role: "patient" }, again!.qrId)
    ).toBeNull();
    expect((await revoke(actor, again!.qrId)).ok).toBe(true);
  });
});
