import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { hmacSha256Hex } from "../auth/crypto";
import { getHashPepper } from "../auth/env";
import { createSessionCookieValue } from "../auth/session";
import { POST as scanRoutePost, GET as scanRouteGet } from "../../app/api/scan/route";
import {
  createConsent,
  revokeQr,
  revokeAllActive,
  scanToken,
  calculateConsentExpiry,
  formatTokenForDisplay,
  normalizeToken,
  hashConsentToken,
  SCAN_RATE_LIMIT_STAFF_MAX,
} from "./index";
import { resetLogSink, setLogSink } from "../privacy";

const rootDir = path.resolve(__dirname, "..", "..", "..");

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

const IDS = {
  facilities: {
    a: "11111111-1111-4111-8111-111111111101",
    b: "11111111-1111-4111-8111-111111111102",
  },
  users: {
    p1: "22222222-2222-4222-8222-222222222101",
    p2: "22222222-2222-4222-8222-222222222102",
    p3: "22222222-2222-4222-8222-222222222103",
    p4: "22222222-2222-4222-8222-222222222104",
    staffA1: "22222222-2222-4222-8222-222222222301",
    staffA2Inactive: "22222222-2222-4222-8222-222222222302",
    staffB1: "22222222-2222-4222-8222-222222222303",
  },
  auditSubjects: {
    p1: "aaaa1111-1111-4111-8111-111111111101",
    p2: "aaaa1111-1111-4111-8111-111111111102",
  },
};

async function createTestStaffSession(
  adminClient: pg.Client,
  userId: string,
  facilityId: string
): Promise<{ cookieHeader: string; sessionId: string }> {
  const pepper = getHashPepper();
  const sessionId = crypto.randomUUID();
  const sessHash = hmacSha256Hex(pepper, sessionId);

  await adminClient.query(
    `INSERT INTO sessions (user_id, role, session_id_hash, expires_at)
     VALUES ($1, 'staff', $2, now() + interval '8 hours');`,
    [userId, sessHash]
  );

  const cookieValue = await createSessionCookieValue({
    sessionId,
    userId,
    role: "staff",
    facilityId,
    expiresAt: Date.now() + 8 * 3600 * 1000,
    version: 1,
  });

  return {
    cookieHeader: `aksespass_session=${cookieValue}`,
    sessionId,
  };
}

describe("Matriks Tes Consent, Pindai, Izin, dan Kebocoran (Bagian 3c)", () => {
  let adminClient: pg.Client;

  beforeAll(async () => {
    const adminTestUrl = getAdminTestDbUrl();
    const env = {
      ...process.env,
      DB_TARGET: "test",
      DATABASE_ADMIN_URL_TEST: adminTestUrl,
      APP_ORIGIN: "http://localhost:3000",
    };

    execFileSync("node", ["scripts/db-reset.mjs", "--test"], {
      cwd: rootDir,
      env,
      stdio: "pipe",
    });
    execFileSync("node", ["scripts/db-migrate.mjs", "--test"], {
      cwd: rootDir,
      env,
      stdio: "pipe",
    });
    execFileSync("node", ["scripts/db-seed.mjs", "--test"], {
      cwd: rootDir,
      env,
      stdio: "pipe",
    });

    adminClient = new pg.Client({ connectionString: adminTestUrl });
    await adminClient.connect();
  });

  afterAll(async () => {
    if (adminClient) {
      await adminClient.end();
    }
  });

  it("1. Lolos: petugas aktif, fasilitas cocok, token valid -> hanya field dicentang; nama panggilan ada; field dan catatan tidak dicentang TIDAK ada di body", async () => {
    const patientSession = {
      userId: IDS.users.p1,
      role: "patient" as const,
      auditSubjectId: IDS.auditSubjects.p1,
    };

    const consentRes = await createConsent(patientSession, {
      facilityId: IDS.facilities.a,
      sharedFields: ["komunikasi", "catatan_pasien"],
      duration: "1 jam",
    });

    expect(consentRes.ok).toBe(true);
    expect(consentRes.token).toHaveLength(26);

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    const scanRes = await scanToken(staffSession, consentRes.token);
    expect(scanRes.status).toBe(200);

    if (scanRes.status === 200) {
      const body = scanRes.body;
      expect(body.ok).toBe(true);
      expect(body.visitId).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.namaPanggilan).toBe("Pasien Contoh 1");
      expect(body.preferredName).toBe("Pasien Contoh 1");
      expect(body.kebutuhan.length).toBeGreaterThan(0);
      expect(body.kebutuhan.every((k) => k.kategori === "komunikasi")).toBe(true);
      expect(body.kebutuhan.some((k) => k.kategori === "pendengaran")).toBe(false);
      expect(body.catatanPasien).toBeDefined();

      const rawBody = body as Record<string, unknown>;
      expect(rawBody.patient_id).toBeUndefined();
      expect(rawBody.patientUserId).toBeUndefined();
      expect(rawBody.phone).toBeUndefined();
      expect(rawBody.userId).toBeUndefined();
    }
  });

  it("2. Ditolak dengan respons identik (status 422, body deep-equal, Cache-Control: no-store): token tak dikenal, salah format, kedaluwarsa, dicabut, belum berlaku, fasilitas lain", async () => {
    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    // a. Token tak dikenal (format Crockford valid 26 karakter tapi tidak ada di DB)
    const unknownToken = "99999999999999999999999999";
    const resUnknown = await scanToken(staffSession, unknownToken);

    // b. Token salah format (karakter ilegal, terlalu pendek)
    const malformedToken = "invalid-token-!@#$";
    const resMalformed = await scanToken(staffSession, malformedToken);

    // c. Token kedaluwarsa: buat QR lalu update expires_at ke masa lalu di DB
    const consentExpired = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );
    await adminClient.query(
      "UPDATE consent_qr SET expires_at = now() - interval '1 hour' WHERE id = $1;",
      [consentExpired.qrId]
    );
    const resExpired = await scanToken(staffSession, consentExpired.token);

    // d. Token dicabut
    const consentRevoked = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );
    await revokeQr({ userId: IDS.users.p1, role: "patient" }, consentRevoked.qrId);
    const resRevoked = await scanToken(staffSession, consentRevoked.token);

    // e. Token belum berlaku: update valid_from ke masa depan di DB
    const futureConsent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );
    await adminClient.query(
      "UPDATE consents SET valid_from = now() + interval '2 hours', valid_until = now() + interval '3 hours' WHERE id = $1;",
      [futureConsent.consentId]
    );
    const resNotYetValid = await scanToken(staffSession, futureConsent.token);

    // f. Fasilitas lain: Petugas Fasilitas B memindai QR yang dibuat untuk Fasilitas A
    const staffSessionB = {
      userId: IDS.users.staffB1,
      role: "staff" as const,
      facilityId: IDS.facilities.b,
      auditSubjectId: "dummy-staff-b",
    };
    const consentFacilityA = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );
    const resWrongFacility = await scanToken(staffSessionB, consentFacilityA.token);

    const expectedFailureBody = {
      ok: false,
      code: "QR_UNUSABLE",
      title: "QR Tidak Dapat Dipakai",
      message: "Minta pasien membuat ConsentQR baru.",
    };

    expect(resUnknown).toEqual({ status: 422, body: expectedFailureBody });
    expect(resMalformed).toEqual({ status: 422, body: expectedFailureBody });
    expect(resExpired).toEqual({ status: 422, body: expectedFailureBody });
    expect(resRevoked).toEqual({ status: 422, body: expectedFailureBody });
    expect(resNotYetValid).toEqual({ status: 422, body: expectedFailureBody });
    expect(resWrongFacility).toEqual({ status: 422, body: expectedFailureBody });
  });

  it("3. Petugas dinonaktifkan di tengah sesi -> 403 dan tercatat qr_scan_rejected", async () => {
    // Buat sesi bertanda tangan dan tercatat di DB untuk Staff A2 (yang keanggotaannya berstatus inactive)
    const session = await createTestStaffSession(
      adminClient,
      IDS.users.staffA2Inactive,
      IDS.facilities.a
    );

    const req = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: session.cookieHeader,
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ token: "99999999999999999999999999" }),
    });

    const res = await scanRoutePost(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({
      ok: false,
      error: "Akun tidak aktif. Hubungi admin fasilitas.",
    });

    // Pastikan tercatat di audit_events
    const auditRes = await adminClient.query<{
      event_type: string;
      actor_id: string;
      facility_id: string;
    }>(
      `SELECT event_type, actor_id, facility_id
       FROM audit_events
       WHERE actor_id = $1 AND event_type = 'qr_scan_rejected'
       ORDER BY id DESC LIMIT 1;`,
      [IDS.users.staffA2Inactive]
    );

    expect(auditRes.rows).toHaveLength(1);
    expect(auditRes.rows[0].facility_id).toBe(IDS.facilities.a);
  });

  it("4. Setiap lolos menulis qr_scanned + profile_read dengan nama field yang benar; setiap gagal menulis qr_scan_rejected; tidak ada token mentah atau nilai profil di audit_events", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi", "catatan_pasien"], duration: "1 jam" }
    );

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    // Jalur lolos
    const scanOk = await scanToken(staffSession, consent.token);
    expect(scanOk.status).toBe(200);

    const auditOkRes = await adminClient.query<{
      event_type: string;
      fields: string[];
      subject_ref: string;
    }>(
      `SELECT event_type, fields, subject_ref
       FROM audit_events
       WHERE actor_id = $1 AND event_type IN ('qr_scanned', 'profile_read')
       ORDER BY id DESC LIMIT 2;`,
      [IDS.users.staffA1]
    );

    expect(auditOkRes.rows).toHaveLength(2);
    const profileReadEv = auditOkRes.rows.find((r) => r.event_type === "profile_read");
    expect(profileReadEv).toBeDefined();
    expect(profileReadEv!.fields).toContain("preferred_name");
    expect(profileReadEv!.fields).toContain("komunikasi");
    expect(profileReadEv!.fields).toContain("catatan_pasien");

    // Jalur gagal
    await scanToken(staffSession, "99999999999999999999999999");

    const auditFailRes = await adminClient.query<{
      event_type: string;
    }>(
      `SELECT event_type
       FROM audit_events
       WHERE actor_id = $1 AND event_type = 'qr_scan_rejected'
       ORDER BY id DESC LIMIT 1;`,
      [IDS.users.staffA1]
    );
    expect(auditFailRes.rows).toHaveLength(1);
    expect(auditFailRes.rows[0].event_type).toBe("qr_scan_rejected");

    // Cek bahwa token mentah tidak pernah muncul di kolom teks audit_events
    const leakCheck = await adminClient.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM audit_events
       WHERE event_type::text LIKE '%' || $1 || '%'
          OR coalesce(actor_role, '') LIKE '%' || $1 || '%';`,
      [consent.token]
    );
    expect(leakCheck.rows[0].count).toBe(0);
  });

  it("5. Audit dipaksa gagal -> rollback transaksi, respons tanpa data profil dan tidak ada kunjungan terbuka", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );

    // Cabut izin INSERT audit_events sementara untuk aksespass_app
    await adminClient.query("REVOKE INSERT ON audit_events FROM aksespass_app;");

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    try {
      await expect(scanToken(staffSession, consent.token)).rejects.toThrow(
        /permission denied for table audit_events/i
      );

      // Pastikan TIDAK ADA kunjungan yang terbuka di database
      const visitCheck = await adminClient.query<{ count: number }>(
        `SELECT count(*)::int AS count
         FROM visits
         WHERE consent_id = $1;`,
        [consent.consentId]
      );
      expect(visitCheck.rows[0].count).toBe(0);
    } finally {
      await adminClient.query("GRANT INSERT ON audit_events TO aksespass_app;");
    }
  });

  it("6. consent_qr berisi SHA-256 token; token mentah tidak ditemukan di kolom teks consents, consent_qr, audit_events, visits", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );

    const expectedHash = hashConsentToken(consent.token);

    const qrRow = await adminClient.query<{ token_hash: string }>(
      "SELECT token_hash FROM consent_qr WHERE id = $1;",
      [consent.qrId]
    );
    expect(qrRow.rows[0].token_hash).toBe(expectedHash);

    const checkTables = ["consents", "consent_qr", "audit_events", "visits"];
    for (const tbl of checkTables) {
      const res = await adminClient.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM ${tbl}
         WHERE CAST(${tbl}.* AS text) LIKE '%' || $1 || '%';`,
        [consent.token]
      );
      expect(res.rows[0].count).toBe(0);
    }
  });

  it("7. Profil diubah setelah QR dibuat -> pindai mengembalikan data terbaru", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi", "catatan_pasien"], duration: "1 jam" }
    );

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    const scan1 = await scanToken(staffSession, consent.token);
    expect(scan1.status).toBe(200);
    if (scan1.status === 200) {
      expect(scan1.body.namaPanggilan).toBe("Pasien Contoh 1");
    }

    // Ubah profil di database
    await adminClient.query(
      `UPDATE patient_profiles
       SET preferred_name = 'Rian Pembaruan',
           patient_note = 'Catatan baru setelah QR dibuat'
       WHERE user_id = $1;`,
      [IDS.users.p1]
    );

    try {
      const scan2 = await scanToken(staffSession, consent.token);
      expect(scan2.status).toBe(200);
      if (scan2.status === 200) {
        expect(scan2.body.namaPanggilan).toBe("Rian Pembaruan");
        expect(scan2.body.catatanPasien).toBe("Catatan baru setelah QR dibuat");
      }
    } finally {
      await adminClient.query(
        `UPDATE patient_profiles
         SET preferred_name = 'Pasien Contoh 1',
             patient_note = 'Mohon gunakan bahasa isyarat BISINDO atau komunikasi tertulis.'
         WHERE user_id = $1;`,
        [IDS.users.p1]
      );
    }
  });

  it("8. revokeQr dan revokeAllActive -> pindai berikutnya ditolak; pasien lain tidak bisa mencabut QR orang lain", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    // 1. Pasien 2 mencoba mencabut QR Pasien 1 -> ditolak
    const revokeOther = await revokeQr(
      { userId: IDS.users.p2, role: "patient" },
      consent.qrId
    );
    expect(revokeOther.ok).toBe(false);
    expect(revokeOther.count).toBe(0);

    const checkStillValid = await scanToken(staffSession, consent.token);
    expect(checkStillValid.status).toBe(200);

    // 2. Pasien 1 mencabut QR miliknya
    const revokeSelf = await revokeQr(
      { userId: IDS.users.p1, role: "patient" },
      consent.qrId
    );
    expect(revokeSelf.ok).toBe(true);
    expect(revokeSelf.count).toBe(1);

    const scanAfterRevoke = await scanToken(staffSession, consent.token);
    expect(scanAfterRevoke.status).toBe(422);

    // 3. revokeAllActive
    const q1 = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );
    const q2 = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );

    const revokeAllRes = await revokeAllActive({
      userId: IDS.users.p1,
      role: "patient",
    });
    expect(revokeAllRes.ok).toBe(true);
    expect(revokeAllRes.count).toBeGreaterThanOrEqual(2);

    expect((await scanToken(staffSession, q1.token)).status).toBe(422);
    expect((await scanToken(staffSession, q2.token)).status).toBe(422);
  });

  it("9. Pindai lolos membuka satu kunjungan; pindai ulang QR yang sama hari itu tidak membuat kunjungan kedua", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    // Pindai pertama
    const scan1 = await scanToken(staffSession, consent.token);
    expect(scan1.status).toBe(200);
    const visitId1 = (scan1.body as { visitId: string }).visitId;

    // Pindai kedua pada hari yang sama
    const scan2 = await scanToken(staffSession, consent.token);
    expect(scan2.status).toBe(200);
    const visitId2 = (scan2.body as { visitId: string }).visitId;

    expect(visitId2).toBe(visitId1);

    const visitCountRes = await adminClient.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM visits WHERE consent_id = $1;",
      [consent.consentId]
    );
    expect(visitCountRes.rows[0].count).toBe(1);
  });

  it("10. Durasi 'hari ini' berakhir 23:59:59 WIB (clock disuntik)", () => {
    const injectedNow = new Date("2026-10-13T10:15:00+07:00");
    const expiry = calculateConsentExpiry("hari ini", injectedNow);

    expect(expiry.toISOString()).toBe("2026-10-13T16:59:59.999Z");

    const expiryWib = new Date(expiry.getTime() + 7 * 3600 * 1000);
    expect(expiryWib.getUTCHours()).toBe(23);
    expect(expiryWib.getUTCMinutes()).toBe(59);
    expect(expiryWib.getUTCSeconds()).toBe(59);
  });

  it("11. createConsent dengan profil kosong -> 'Simpan paspor dulu'; sharedFields kosong atau tak dikenal -> ditolak", async () => {
    const emptyUserId = crypto.randomUUID();
    await adminClient.query(
      `INSERT INTO users (id, role, phone, display_name, status)
       VALUES ($1, 'patient', '+620000000999', 'Pasien Tanpa Paspor', 'active');`,
      [emptyUserId]
    );

    try {
      await expect(
        createConsent(
          { userId: emptyUserId, role: "patient" },
          { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
        )
      ).rejects.toThrow("Simpan paspor dulu");
    } finally {
      await adminClient.query("DELETE FROM users WHERE id = $1;", [emptyUserId]);
    }

    await expect(
      createConsent(
        { userId: IDS.users.p1, role: "patient" },
        { facilityId: IDS.facilities.a, sharedFields: [], duration: "1 jam" }
      )
    ).rejects.toThrow(/sharedFields tidak boleh kosong/i);

    await expect(
      createConsent(
        { userId: IDS.users.p1, role: "patient" },
        {
          facilityId: IDS.facilities.a,
          sharedFields: ["diagnosis_rahasia"],
          duration: "1 jam",
        }
      )
    ).rejects.toThrow(/Field consent tidak dikenal atau tidak diizinkan/i);
  });

  it("12. Rate limit memblokir setelah batas dan tetap memblokir setelah pool/modul dibuat ulang", async () => {
    const testStaffId = crypto.randomUUID();
    await adminClient.query(
      `INSERT INTO users (id, role, phone, display_name, status)
       VALUES ($1, 'staff', '+620000000888', 'Petugas Rate Limit', 'active');`,
      [testStaffId]
    );
    await adminClient.query(
      `INSERT INTO staff_memberships (user_id, facility_id, unit, status)
       VALUES ($1, $2, 'Unit Tes', 'active');`,
      [testStaffId, IDS.facilities.a]
    );

    const staffSession = {
      userId: testStaffId,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    const fixedNow = new Date("2026-10-13T16:00:00.000Z");

    try {
      for (let i = 0; i < SCAN_RATE_LIMIT_STAFF_MAX; i++) {
        const res = await scanToken(
          staffSession,
          "99999999999999999999999999",
          { ip: "10.12.0.1" },
          { now: fixedNow }
        );
        expect(res.status).toBe(422);
      }

      const blockedRes = await scanToken(
        staffSession,
        "99999999999999999999999999",
        { ip: "10.12.0.1" },
        { now: fixedNow }
      );
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toEqual({
        ok: false,
        error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
      });

      const freshClient = new pg.Client({
        connectionString: getAdminTestDbUrl(),
      });
      await freshClient.connect();
      try {
        const hitsRes = await freshClient.query<{ count: number }>(
          `SELECT count FROM rate_limit_hits
           WHERE key = $1;`,
          [`scan:staff:${testStaffId}`]
        );
        expect(hitsRes.rows[0].count).toBe(SCAN_RATE_LIMIT_STAFF_MAX + 1);
      } finally {
        await freshClient.end();
      }
    } finally {
      await adminClient.query(
        "DELETE FROM staff_memberships WHERE user_id = $1;",
        [testStaffId]
      );
      await adminClient.query("DELETE FROM users WHERE id = $1;", [testStaffId]);
    }
  });

  it("13. Konteks tidak bocor: dengan pool max=1, pindai lolos oleh petugas A lalu petugas B (fasilitas B) mencoba membaca profil yang sama tanpa token -> 0 baris", async () => {
    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
    );

    const staffSessionA = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-a",
    };

    const scanOk = await scanToken(staffSessionA, consent.token);
    expect(scanOk.status).toBe(200);

    const rowsPetugasB = await withContext(
      {
        userId: IDS.users.staffB1,
        role: "staff",
        facilityId: IDS.facilities.b,
      },
      async (tx) => {
        const res = await tx.query("SELECT id FROM patient_profiles;");
        return res.rows;
      }
    );

    expect(rowsPetugasB).toHaveLength(0);
  });

  it("14. Kebocoran: penanda unik sintetis di nama panggilan dan catatan pasien, serta token mentah, tidak muncul di output logger maupun console yang ditangkap selama pindai lolos dan gagal", async () => {
    const markerName = "SYNTH_NAME_999";
    const markerNote = "SYNTH_NOTE_SECRET_777";

    await adminClient.query(
      `UPDATE patient_profiles
       SET preferred_name = $1, patient_note = $2
       WHERE user_id = $3;`,
      [markerName, markerNote, IDS.users.p1]
    );

    const consent = await createConsent(
      { userId: IDS.users.p1, role: "patient" },
      { facilityId: IDS.facilities.a, sharedFields: ["komunikasi", "catatan_pasien"], duration: "1 jam" }
    );

    const staffSession = {
      userId: IDS.users.staffA1,
      role: "staff" as const,
      facilityId: IDS.facilities.a,
      auditSubjectId: "dummy-staff-subject",
    };

    const capturedLogs: string[] = [];
    setLogSink((_level, data) => {
      capturedLogs.push(JSON.stringify(data));
    });

    try {
      await scanToken(staffSession, consent.token);
      await scanToken(staffSession, "99999999999999999999999999");

      const allLogText = capturedLogs.join("\n");
      expect(allLogText.includes(markerName)).toBe(false);
      expect(allLogText.includes(markerNote)).toBe(false);
      expect(allLogText.includes(consent.token)).toBe(false);
    } finally {
      resetLogSink();
      await adminClient.query(
        `UPDATE patient_profiles
         SET preferred_name = 'Pasien Contoh 1',
             patient_note = 'Mohon gunakan bahasa isyarat BISINDO atau komunikasi tertulis.'
         WHERE user_id = $1;`,
        [IDS.users.p1]
      );
    }
  });

  it("15. Respons sukses dan gagal ber-header Cache-Control: no-store pada route handler", async () => {
    const testStaffId = crypto.randomUUID();
    await adminClient.query(
      `INSERT INTO users (id, role, phone, display_name, status)
       VALUES ($1, 'staff', '+620000000777', 'Petugas Route Test', 'active');`,
      [testStaffId]
    );
    await adminClient.query(
      `INSERT INTO staff_memberships (user_id, facility_id, unit, status)
       VALUES ($1, $2, 'Unit Route', 'active');`,
      [testStaffId, IDS.facilities.a]
    );

    try {
      const consent = await createConsent(
        { userId: IDS.users.p1, role: "patient" },
        { facilityId: IDS.facilities.a, sharedFields: ["komunikasi"], duration: "1 jam" }
      );

      const session = await createTestStaffSession(
        adminClient,
        testStaffId,
        IDS.facilities.a
      );

      const reqSuccess = new Request("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: session.cookieHeader,
          Origin: "http://localhost:3000",
          "x-forwarded-for": "10.15.0.1",
        },
        body: JSON.stringify({ token: consent.token }),
      });
      const resSuccess = await scanRoutePost(reqSuccess);
      expect(resSuccess.status).toBe(200);
      expect(resSuccess.headers.get("Cache-Control")).toBe("no-store");

      const reqFail = new Request("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: session.cookieHeader,
          Origin: "http://localhost:3000",
          "x-forwarded-for": "10.15.0.1",
        },
        body: JSON.stringify({ token: "99999999999999999999999999" }),
      });
      const resFail = await scanRoutePost(reqFail);
      expect(resFail.status).toBe(422);
      expect(resFail.headers.get("Cache-Control")).toBe("no-store");

      const resGet = scanRouteGet();
      expect(resGet.status).toBe(405);
      expect(resGet.headers.get("Cache-Control")).toBe("no-store");
    } finally {
      await adminClient.query("DELETE FROM visits WHERE staff_user_id = $1;", [testStaffId]);
      await adminClient.query("DELETE FROM staff_memberships WHERE user_id = $1;", [testStaffId]);
      await adminClient.query("DELETE FROM sessions WHERE user_id = $1;", [testStaffId]);
      await adminClient.query("DELETE FROM users WHERE id = $1;", [testStaffId]);
    }
  });

  it("utilitas token: normalisasi huruf ambigu, strip, format display", () => {
    const raw = "abcd-efgh-jkmn-pqrs-tvwx-yz01-ol";
    const normalized = normalizeToken(raw);
    expect(normalized).toBe("ABCDEFGHJKMNPQRSTVWXYZ0101");

    const displayed = formatTokenForDisplay(normalized!);
    expect(displayed).toBe("ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-01");
  });
});
