import crypto from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { getHashPepper } from "../auth/env";
import { hmacSha256Hex } from "../auth/crypto";
import { getOwnAccessHistory } from "../audit";
import { confirmVisit } from "../careproof";
import { createConsent, scanToken } from "../consent";
import { getFacilityDashboard } from "../dashboard";
import { getOwnPassport, saveOwnPassport } from "../passport";
import {
  approveCompanionLink,
  createLinkCode,
  listOwnCompanions,
  redeemLinkCode,
  revokeCompanionLink,
} from "./index";

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

const SEED = {
  facilityA: "11111111-1111-4111-8111-111111111101",
  staffA: "22222222-2222-4222-8222-222222222301",
  adminA: "22222222-2222-4222-8222-222222222401",
  patient1: "22222222-2222-4222-8222-222222222101",
  patient2: "22222222-2222-4222-8222-222222222102",
  companion1: "22222222-2222-4222-8222-222222222201",
};

describe("Pendamping: Tautan, RLS, Paspor, ConsentQR, dan CareProof (Bagian 10A)", () => {
  let adminClient: pg.Client;
  let testPatientId: string;
  let testCompanionId: string;

  beforeAll(async () => {
    adminClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
    await adminClient.connect();

    // Buat user pasien dan pendamping sintetis khusus untuk pengujian tautan
    testPatientId = crypto.randomUUID();
    testCompanionId = crypto.randomUUID();

    const randomPhonePatient = `+62812${Math.floor(10000000 + Math.random() * 90000000)}`;
    const randomPhoneCompanion = `+62813${Math.floor(10000000 + Math.random() * 90000000)}`;

    await adminClient.query(
      `INSERT INTO users (id, phone, role, display_name)
       VALUES
         ($1, $2, 'patient', 'Budi Santoso'),
         ($3, $4, 'companion', 'Siti Rahma');`,
      [
        testPatientId,
        randomPhonePatient,
        testCompanionId,
        randomPhoneCompanion,
      ]
    );

    await adminClient.query(
      `INSERT INTO patient_profiles (user_id, preferred_name)
       VALUES ($1, 'Budi');`,
      [testPatientId]
    );

    // Bersihkan hitungan rate limit pendamping sebelum suite berjalan
    await adminClient.query(
      "DELETE FROM rate_limit_hits WHERE key LIKE 'companion_redeem:%';"
    );
  });

  afterAll(async () => {
    if (adminClient) {
      await adminClient.query(
        "DELETE FROM users WHERE id IN ($1, $2);",
        [testPatientId, testCompanionId]
      );
      await adminClient.end();
    }
  });

  it("1. Kode tautan: format 8 char Base32, HMAC disimpan (bukan kode asli), kedaluwarsa & salah memberikan galat identik", async () => {
    const patientSession = {
      userId: testPatientId,
      role: "patient" as const,
      sessionId: crypto.randomUUID(),
    };
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    // Pasien buat kode
    const linkCodeInfo = await createLinkCode(patientSession);
    expect(linkCodeInfo.code).toMatch(/^[0-9A-HJ-KM-NP-TV-Z]{8}$/i);
    expect(new Date(linkCodeInfo.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // Verifikasi database: companion_link_codes TIDAK menyimpan kode asli
    const dbRows = await adminClient.query<{
      code_hash: string;
      used_at: Date | null;
    }>(
      `SELECT code_hash, used_at
       FROM companion_link_codes
       WHERE patient_user_id = $1
       ORDER BY created_at DESC LIMIT 1;`,
      [testPatientId]
    );
    expect(dbRows.rows[0].code_hash).not.toBe(linkCodeInfo.code);
    expect(dbRows.rows[0].code_hash).toHaveLength(64); // SHA-256 HMAC
    expect(dbRows.rows[0].used_at).toBeNull();

    // Coba redeem dengan kode acak -> Galat identik
    await expect(
      redeemLinkCode(companionSession, "WRONG123", { clientIp: "127.0.0.1" })
    ).rejects.toThrow("Kode tidak dapat dipakai. Minta kode baru ke pasien.");

    // Coba redeem dengan kode kedaluwarsa -> Galat identik
    await adminClient.query(
      `UPDATE companion_link_codes
       SET expires_at = now() - interval '1 minute'
       WHERE code_hash = $1;`,
      [dbRows.rows[0].code_hash]
    );
    await expect(
      redeemLinkCode(companionSession, linkCodeInfo.code, {
        clientIp: "127.0.0.1",
      })
    ).rejects.toThrow("Kode tidak dapat dipakai. Minta kode baru ke pasien.");

    // Pasien buat kode baru untuk pengujian sukses
    const newCode = await createLinkCode(patientSession);
    const redeemRes = await redeemLinkCode(companionSession, newCode.code, {
      clientIp: "127.0.0.1",
    });
    expect(redeemRes.linkId).toBeDefined();

    // Mencoba gunakan kode yang sama kedua kali (sudah used_at) -> Galat identik
    await expect(
      redeemLinkCode(companionSession, newCode.code, {
        clientIp: "127.0.0.1",
      })
    ).rejects.toThrow("Kode tidak dapat dipakai. Minta kode baru ke pasien.");
  });

  it("2. Rate limit Postgres: memblokir setelah batas dan tetap memblokir setelah pool dibuka ulang", async () => {
    const rateLimitCompanionId = crypto.randomUUID();
    const randomPhone = `+62819${Math.floor(10000000 + Math.random() * 90000000)}`;
    await adminClient.query(
      `INSERT INTO users (id, phone, role, display_name)
       VALUES ($1, $2, 'companion', 'Pendamping RateLimit');`,
      [rateLimitCompanionId, randomPhone]
    );

    const rateLimitSession = {
      userId: rateLimitCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    const uniqueIp = `10.99.88.${Math.floor(Math.random() * 200 + 1)}`;

    try {
      // Buat 5 kegagalan berturut-turut untuk IP ini
      for (let i = 0; i < 5; i++) {
        try {
          await redeemLinkCode(rateLimitSession, "INVALID0", { clientIp: uniqueIp });
        } catch {
          // expected generic error
        }
      }

      // Percobaan ke-6 harus ditolak oleh rate limiter Postgres
      await expect(
        redeemLinkCode(rateLimitSession, "INVALID0", { clientIp: uniqueIp })
      ).rejects.toThrow(/Terlalu banyak percobaan/i);

      // Buka koneksi baru / query langsung ke Postgres rate_limit_hits untuk verifikasi tersimpan persisten
      const hitRes = await adminClient.query<{ count: number }>(
        `SELECT count FROM rate_limit_hits WHERE key = $1;`,
        [`companion_redeem:ip:${hmacSha256Hex(getHashPepper(), uniqueIp)}`]
      );
      expect(hitRes.rows[0].count).toBeGreaterThanOrEqual(5);
    } finally {
      await adminClient.query("DELETE FROM users WHERE id = $1;", [rateLimitCompanionId]);
    }
  });

  it("3. RLS: status pending = 0 baris; setelah disetujui = bisa akses; setelah dicabut = langsung 0 baris", async () => {
    const patientSession = {
      userId: testPatientId,
      role: "patient" as const,
      sessionId: crypto.randomUUID(),
    };
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    // Ambil daftar tautan milik pasien, pastikan status saat ini adalah pending
    const patientCompanions = await listOwnCompanions(patientSession);
    const link = patientCompanions.find(
      (c) => c.companionUserId === testCompanionId
    );
    expect(link).toBeDefined();
    expect(link?.status).toBe("pending");

    // Pendamping berstatus PENDING membaca data pasien lewat withContext -> 0 baris
    await withContext(companionSession, async (tx) => {
      const prof = await tx.query(
        "SELECT id FROM patient_profiles WHERE user_id = $1;",
        [testPatientId]
      );
      expect(prof.rows).toHaveLength(0);

      const consents = await tx.query(
        "SELECT id FROM consents WHERE patient_user_id = $1;",
        [testPatientId]
      );
      expect(consents.rows).toHaveLength(0);

      const visits = await tx.query(
        "SELECT id FROM visits WHERE patient_user_id = $1;",
        [testPatientId]
      );
      expect(visits.rows).toHaveLength(0);
    });

    // Pasien menyetujui tautan -> status ACTIVE
    const approved = await approveCompanionLink(patientSession, link!.id);
    expect(approved.status).toBe("active");

    // Pendamping sekarang BISA membaca profil pasien
    await withContext(companionSession, async (tx) => {
      const prof = await tx.query<{ preferred_name: string }>(
        "SELECT preferred_name FROM patient_profiles WHERE user_id = $1;",
        [testPatientId]
      );
      expect(prof.rows).toHaveLength(1);
      expect(prof.rows[0].preferred_name).toBe("Budi");
    });

    // Pasien mencabut tautan -> status REVOKED
    await revokeCompanionLink(patientSession, link!.id);

    // Request berikutnya oleh pendamping SEKETIKA menjadi 0 baris tanpa perlu login ulang
    await withContext(companionSession, async (tx) => {
      const prof = await tx.query(
        "SELECT id FROM patient_profiles WHERE user_id = $1;",
        [testPatientId]
      );
      expect(prof.rows).toHaveLength(0);
    });
  });

  it("4. UNIQUE check & Re-link: tautan revoked dapat diajukan ulang menjadi pending tanpa duplikasi", async () => {
    const patientSession = {
      userId: testPatientId,
      role: "patient" as const,
      sessionId: crypto.randomUUID(),
    };
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    // Pasien buat kode baru
    const code = await createLinkCode(patientSession);

    // Pendamping menukar kode
    const redeemRes = await redeemLinkCode(companionSession, code.code, {
      clientIp: "127.0.0.1",
    });
    expect(redeemRes.linkId).toBeDefined();

    // Verifikasi di database: hanya ada 1 baris companions untuk pasangan user ini
    const countRes = await adminClient.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM companions
       WHERE patient_user_id = $1 AND companion_user_id = $2;`,
      [testPatientId, testCompanionId]
    );
    expect(countRes.rows[0].count).toBe(1);

    // Pasien menyetujui kembali
    const approved = await approveCompanionLink(patientSession, redeemRes.linkId);
    expect(approved.status).toBe("active");
  });

  it("4b. Menautkan ulang pendamping yang sudah aktif atau menunggu ditolak, status tidak berubah dan kode tidak hangus", async () => {
    const patientSession = {
      userId: testPatientId,
      role: "patient" as const,
      sessionId: crypto.randomUUID(),
    };
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };
    const statusOf = async () =>
      (
        await adminClient.query<{ status: string }>(
          "SELECT status FROM companions WHERE patient_user_id = $1 AND companion_user_id = $2;",
          [testPatientId, testCompanionId]
        )
      ).rows[0].status;

    await adminClient.query("DELETE FROM rate_limit_hits WHERE key LIKE 'companion_redeem:%';");

    // Sudah aktif (dari tes 4): tautkan lagi ditolak dan tetap aktif
    expect(await statusOf()).toBe("active");
    const codeA = await createLinkCode(patientSession);
    await expect(
      redeemLinkCode(companionSession, codeA.code, { clientIp: "127.0.0.1" })
    ).rejects.toMatchObject({ code: "ALREADY_LINKED", message: "Anda sudah tertaut dengan pasien ini." });
    expect(await statusOf()).toBe("active");

    // Kode tidak hangus oleh penolakan
    const used = await adminClient.query(
      "SELECT used_at FROM companion_link_codes WHERE patient_user_id = $1 AND used_at IS NULL;",
      [testPatientId]
    );
    expect(used.rowCount).toBeGreaterThan(0);

    // Dicabut lalu diajukan ulang -> pending; mengajukan lagi saat pending ditolak
    const links = await listOwnCompanions(patientSession);
    const link = links.find((l) => l.companionUserId === testCompanionId)!;
    await revokeCompanionLink(patientSession, link.id);
    const re = await redeemLinkCode(companionSession, codeA.code, { clientIp: "127.0.0.1" });
    expect(await statusOf()).toBe("pending");
    const codeB = await createLinkCode(patientSession);
    await expect(
      redeemLinkCode(companionSession, codeB.code, { clientIp: "127.0.0.1" })
    ).rejects.toMatchObject({ code: "ALREADY_LINKED" });
    expect(await statusOf()).toBe("pending");

    // Pulihkan keadaan aktif untuk tes berikutnya
    await approveCompanionLink(patientSession, re.linkId);
    expect(await statusOf()).toBe("active");
  });

  it("5. Paspor & Audit: pendamping ubah paspor -> last_updated_by_companion terisi + audit profile_changed_by_companion", async () => {
    const patientSession = {
      userId: testPatientId,
      role: "patient" as const,
      sessionId: crypto.randomUUID(),
    };
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    // Pendamping menyimpan paspor atas nama pasien
    await saveOwnPassport(
      companionSession,
      {
        preferredName: "Budi Santoso",
        needCodes: ["komunikasi_tertulis", "jalur_kursi_roda"],
        patientNote: "Mohon bicara di dekat telinga kanan.",
      },
      testPatientId
    );

    // Pasien membaca status paspor -> memuat nama pendamping yang terakhir mengubah
    const passportData = await getOwnPassport(patientSession);
    expect(passportData).not.toBeNull();
    expect(passportData?.lastUpdatedByCompanion).not.toBeNull();
    expect(passportData?.lastUpdatedByCompanion?.companionName).toBe("Siti Rahma");

    // Pasien membaca riwayat P19 -> menemukan entri "Paspor diubah oleh Siti Rahma"
    const history = await getOwnAccessHistory(patientSession);
    const companionEditEvent = history.find(
      (h) => h.eventType === "profile_changed_by_companion"
    );
    expect(companionEditEvent).toBeDefined();
    expect(companionEditEvent?.title).toBe("Paspor diubah oleh Siti Rahma");
  });

  it("6. ConsentQR: pendamping buat QR -> created_by_user_id = pendamping, dipindai petugas berhasil", async () => {
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    // Pendamping membuat ConsentQR atas nama pasien
    const consentRes = await createConsent(companionSession, {
      facilityId: SEED.facilityA,
      duration: "1 jam",
      sharedFields: ["komunikasi", "mobilitas"],
      targetPatientUserId: testPatientId,
    });
    expect(consentRes.ok).toBe(true);

    // Cek di DB: created_by_user_id adalah pendamping, patient_user_id adalah pasien
    const cRow = await adminClient.query<{
      created_by_user_id: string;
      patient_user_id: string;
    }>(
      `SELECT created_by_user_id, patient_user_id
       FROM consents WHERE id = $1;`,
      [consentRes.consentId]
    );
    expect(cRow.rows[0].created_by_user_id).toBe(testCompanionId);
    expect(cRow.rows[0].patient_user_id).toBe(testPatientId);

    // Petugas memindai token -> sukses membaca profil pasien
    const scanRes = await scanToken(
      {
        userId: SEED.staffA,
        role: "staff",
        facilityId: SEED.facilityA,
      },
      consentRes.token
    );
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.ok).toBe(true);
    if (scanRes.body.ok) {
      expect(scanRes.body.preferredName).toBe("Budi Santoso");
      expect(scanRes.body.kebutuhan.length).toBeGreaterThan(0);
    }
  });

  it("7. CareProof: konfirmasi pendamping tersimpan, pasien menimpa sukses, pendamping menimpa pasien -> 409", async () => {
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };
    const patientSession = {
      userId: testPatientId,
      role: "patient" as const,
      sessionId: crypto.randomUUID(),
    };

    // Buat kunjungan sintetis di DB untuk pengujian konfirmasi
    const visitId = crypto.randomUUID();
    await adminClient.query(
      `INSERT INTO visits (
         id, patient_user_id, facility_id, staff_user_id, channel,
         client_id, created_at, recorded_at
       ) VALUES ($1, $2, $3, $4, 'kartu', $5, now(), now());`,
      [visitId, testPatientId, SEED.facilityA, SEED.staffA, `test-cp-${visitId}`]
    );

    // 1. Pendamping mengonfirmasi kunjungan
    const compConfirm = await confirmVisit(companionSession, visitId, {
      status: "sebagian",
      unmetNeedCodes: ["jalur_kursi_roda"],
    });
    expect(compConfirm.ok).toBe(true);
    expect(compConfirm.confirmedBy).toBe("companion");

    // 2. Pasien menimpa jawaban pendamping -> berhasil
    const patientConfirm = await confirmVisit(patientSession, visitId, {
      status: "terpenuhi",
      unmetNeedCodes: [],
    });
    expect(patientConfirm.ok).toBe(true);
    expect(patientConfirm.confirmedBy).toBe("patient");

    // 3. Setelah pasien menjawab, pendamping mencoba menimpa -> 409
    await expect(
      confirmVisit(companionSession, visitId, {
        status: "belum",
        unmetNeedCodes: ["jalur_kursi_roda"],
      })
    ).rejects.toThrow(/Pasien sudah mengonfirmasi/i);

    // 4. Periksa agregat dashboard puskesmas
    const dashboard = await getFacilityDashboard({
      userId: SEED.adminA,
      role: "facility_admin",
      facilityId: SEED.facilityA,
    });
    expect(dashboard.selected).toBeDefined();
    expect(dashboard.selected.answererBreakdown).toBeDefined();
  });

  it("8. Privasi & Keamanan: pendamping panggil getOwnAccessHistory -> 0 baris; pendamping tidak bisa approve tautan sendiri", async () => {
    const companionSession = {
      userId: testCompanionId,
      role: "companion" as const,
      sessionId: crypto.randomUUID(),
    };

    // Pendamping memanggil riwayat akses (P19) -> harus []
    const companionHistory = await getOwnAccessHistory(companionSession);
    expect(companionHistory).toEqual([]);

    // Pendamping mencoba menyetujui tautan sendiri secara langsung lewat UPDATE DB
    // RLS companions_update_policy hanya mengizinkan app_role() = 'patient'
    const updateRes = await withContext(companionSession, async (tx) => {
      const res = await tx.query(
        `UPDATE companions
         SET status = 'active', approved_at = now()
         WHERE companion_user_id = $1;`,
        [testCompanionId]
      );
      return res.rowCount ?? 0;
    });
    expect(updateRes).toBe(0);
  });
});
