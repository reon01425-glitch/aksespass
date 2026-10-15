import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { getFacilityDashboard, DashboardError, DASHBOARD_MIN_GROUP_SIZE } from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101"; // Puskesmas Contoh A
const FACILITY_B = "11111111-1111-4111-8111-111111111102"; // Klinik Contoh B
const STAFF_A = "22222222-2222-4222-8222-222222222301";
const ADMIN_A = "22222222-2222-4222-8222-222222222401"; // Admin Fasilitas Contoh A
const ADMIN_B = "22222222-2222-4222-8222-222222222402"; // Admin Fasilitas Contoh B
const PATIENT_1 = "22222222-2222-4222-8222-222222222101"; // setuju statistik
const PATIENT_4 = "22222222-2222-4222-8222-222222222104"; // TIDAK setuju statistik
const COMPANION_1 = "22222222-2222-4222-8222-222222222201";

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

describe("src/lib/dashboard: Accessibility Gap Dashboard (A3, A6, K-10)", () => {
  describe("Data seed Oktober 2026 — Puskesmas Contoh A (bulan berjalan)", () => {
    it("total kunjungan, AFR, dan rincian kategori cocok dengan hitungan manual dari seed", async () => {
      const result = await getFacilityDashboard(
        { userId: ADMIN_A, role: "facility_admin", facilityId: FACILITY_A },
        { year: 2026, month: 10 }
      );

      expect(result.facilityName).toBe("Puskesmas Contoh A");
      expect(result.selected.hidden).toBe(false);

      // Hitungan manual dari scripts/db-seed.mjs untuk Fasilitas A, Oktober 2026,
      // HANYA pasien stats_consent = true (Pasien Contoh 1,2,3,5,6,7,8; Pasien Contoh 4 TIDAK ikut):
      // idx15 (p1, terpenuhi), idx16 (p3, terpenuhi), idx18 (p2, belum),
      // idx20 (p1, belum dikonfirmasi), idx21 (p5, sebagian), idx22 (p6, sebagian),
      // idx23 (p7, sebagian), idx24 (p8, sebagian) = 8 kunjungan dihitung.
      // idx17 (p4, Pasien Contoh 4) DIKECUALIKAN karena stats_consent = false.
      // AFR akan 25% (2/8), tetapi 'terpenuhi' berasal dari hanya 2 pasien: AFR DISEMBUNYIKAN
      // agar sel kecil yang disembunyikan tidak bocor lewat metrik turunan.
      expect(result.selected.totalVisits).toBe(8);
      expect(result.selected.afr).toBeNull();
      expect(result.selected.afrHidden).toBe(true);

      // Rincian kategori: sensorik_lingkungan memiliki tepat 5 pasien berbeda
      // (p2, p5, p6, p7, p8) -> tepat di ambang, HARUS tampil.
      const category = result.selected.categoryBreakdown!;
      expect(category.sensorik_lingkungan).toEqual({ hidden: false, value: 5 });

      // Kategori lain yang benar-benar nol (bukan kelompok kecil) tetap tampil sebagai 0,
      // bukan "disembunyikan" (0 pasien bukan risiko re-identifikasi).
      expect(category.komunikasi).toEqual({ hidden: false, value: 0 });

      // Rincian penjawab: "patient" mencapai ambang (p1, p3, p2, p5, p8 = 5 pasien),
      // sedangkan "companion" dan "on_site" masing-masing hanya 1 pasien -> disembunyikan.
      // Ini membuktikan sub-metrik dipisah, TIDAK digabung diam-diam.
      const answerer = result.selected.answererBreakdown!;
      expect(answerer.patient).toEqual({ hidden: false, value: 5 });
      expect(answerer.companion).toEqual({ hidden: true });
      expect(answerer.on_site).toEqual({ hidden: true });
    });

    it("status 'belum dikonfirmasi' masuk penyebut (totalVisits) tetapi TIDAK PERNAH masuk pembilang (terpenuhi)", async () => {
      // idx20 (Pasien Contoh 1, Oktober) tidak memiliki baris visit_confirmations sama sekali
      // dan tetap ikut dihitung di totalVisits (8), namun AFR (25% = 2/8) tidak naik karenanya.
      const result = await getFacilityDashboard(
        { userId: ADMIN_A, role: "facility_admin", facilityId: FACILITY_A },
        { year: 2026, month: 10 }
      );
      expect(result.selected.totalVisits).toBe(8);
      expect(result.selected.afr).toBeNull();
      expect(result.selected.afrHidden).toBe(true);
    });

    it("Pasien Contoh 4 (stats_consent = false) tidak dihitung sama sekali walau kunjungannya terpenuhi di fasilitas dan bulan yang sama", async () => {
      // idx17: Pasien Contoh 4, Fasilitas A, Oktober 2026, confirmed_by=companion, status terpenuhi.
      // Bila ikut dihitung, totalVisits akan 9 dan AFR akan 3/9 (33%), BUKAN 8 dan 25%.
      const result = await getFacilityDashboard(
        { userId: ADMIN_A, role: "facility_admin", facilityId: FACILITY_A },
        { year: 2026, month: 10 }
      );
      expect(result.selected.totalVisits).toBe(8);
      expect(result.selected.afr).toBeNull();
      expect(result.selected.afrHidden).toBe(true);
    });

    it("serialisasi JSON hasil dashboard tidak memuat ID, nama, atau kontak pasien apa pun", async () => {
      const result = await getFacilityDashboard(
        { userId: ADMIN_A, role: "facility_admin", facilityId: FACILITY_A },
        { year: 2026, month: 10 }
      );
      const json = JSON.stringify(result);

      // Tidak ada UUID pasien/pendamping/petugas/admin dari seed.
      for (const forbiddenId of [
        PATIENT_1,
        PATIENT_4,
        COMPANION_1,
        STAFF_A,
        ADMIN_A,
        "22222222-2222-4222-8222-222222222102",
        "22222222-2222-4222-8222-222222222103",
        "22222222-2222-4222-8222-222222222105",
        "22222222-2222-4222-8222-222222222106",
        "22222222-2222-4222-8222-222222222107",
        "22222222-2222-4222-8222-222222222108",
      ]) {
        expect(json.includes(forbiddenId)).toBe(false);
      }

      // Tidak ada nama atau nomor telepon pasien contoh.
      expect(/Pasien Contoh/i.test(json)).toBe(false);
      expect(/\+620000000/.test(json)).toBe(false);
      expect(/preferred_?name/i.test(json)).toBe(false);
    });
  });

  describe("Ambang kelompok kecil K-10 (per pasien berbeda, bukan per kunjungan)", () => {
    async function seedSyntheticVisits(opts: {
      facilityId: string;
      staffId: string;
      patientCount: number;
      year: number;
      month: number;
      visitsPerPatient?: number;
    }): Promise<{ patientIds: string[]; cleanup: () => Promise<void> }> {
      const adminClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
      await adminClient.connect();
      const patientIds: string[] = [];
      const visitIds: string[] = [];
      const auditSubjectIds: string[] = [];

      const monthStr = String(opts.month).padStart(2, "0");
      const visitsPerPatient = opts.visitsPerPatient ?? 1;

      try {
        for (let i = 0; i < opts.patientCount; i++) {
          const userId = crypto.randomUUID();
          const auditSubjectId = crypto.randomUUID();
          patientIds.push(userId);
          auditSubjectIds.push(auditSubjectId);
          const phone = `+6289${String(Date.now() % 100000).padStart(5, "0")}${i}`;
          await adminClient.query(
            `INSERT INTO users (id, role, phone, display_name, status, stats_consent, audit_subject_id)
             VALUES ($1, 'patient', $2, $3, 'active', true, $4);`,
            [userId, phone, `Pasien Ambang Sintetis ${i}`, auditSubjectId]
          );

          for (let v = 0; v < visitsPerPatient; v++) {
            const visitId = crypto.randomUUID();
            visitIds.push(visitId);
            const day = String(2 + v).padStart(2, "0");
            const at = `${opts.year}-${monthStr}-${day}T09:00:00+07:00`;
            await adminClient.query(
              `INSERT INTO visits (
                 id, patient_user_id, facility_id, staff_user_id, channel,
                 recorded_need_codes, client_id, created_at, synced_at, recorded_at, subject_ref
               ) VALUES ($1, $2, $3, $4, 'kartu', '{}', $5, $6, $6, $6, $7);`,
              [
                visitId,
                userId,
                opts.facilityId,
                opts.staffId,
                `ambang-test-${visitId}`,
                at,
                auditSubjectId,
              ]
            );
            await adminClient.query(
              `INSERT INTO visit_confirmations (
                 id, visit_id, status, unmet_need_codes, confirmed_by, confirmed_by_user_id, confirmed_at
               ) VALUES ($1, $2, 'terpenuhi', '{}', 'patient', $3, $4);`,
              [crypto.randomUUID(), visitId, userId, at]
            );
          }
        }
      } finally {
        await adminClient.end();
      }

      return {
        patientIds,
        cleanup: async () => {
          const cleanupClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
          await cleanupClient.connect();
          try {
            if (visitIds.length > 0) {
              await cleanupClient.query(
                `DELETE FROM visit_confirmations WHERE visit_id = ANY($1::uuid[]);`,
                [visitIds]
              );
              await cleanupClient.query(`DELETE FROM visits WHERE id = ANY($1::uuid[]);`, [
                visitIds,
              ]);
            }
            if (patientIds.length > 0) {
              await cleanupClient.query(`DELETE FROM users WHERE id = ANY($1::uuid[]);`, [
                patientIds,
              ]);
            }
          } finally {
            await cleanupClient.end();
          }
        },
      };
    }

    it(`kelompok dengan ${DASHBOARD_MIN_GROUP_SIZE - 1} pasien berbeda (walau banyak kunjungan per pasien) -> disembunyikan tanpa angka`, async () => {
      const fixture = await seedSyntheticVisits({
        facilityId: FACILITY_B,
        staffId: "22222222-2222-4222-8222-222222222303",
        patientCount: DASHBOARD_MIN_GROUP_SIZE - 1,
        visitsPerPatient: 5, // banyak kunjungan per pasien, tetap harus disembunyikan
        year: 2025,
        month: 1,
      });

      try {
        const result = await getFacilityDashboard(
          { userId: ADMIN_B, role: "facility_admin", facilityId: FACILITY_B },
          { year: 2025, month: 1 }
        );
        expect(result.selected.hidden).toBe(true);
        expect(result.selected).not.toHaveProperty("totalVisits");
        expect(result.selected).not.toHaveProperty("afr");
      } finally {
        await fixture.cleanup();
      }
    });

    it(`kelompok dengan tepat ${DASHBOARD_MIN_GROUP_SIZE} pasien berbeda -> tampil dengan angka`, async () => {
      const fixture = await seedSyntheticVisits({
        facilityId: FACILITY_B,
        staffId: "22222222-2222-4222-8222-222222222303",
        patientCount: DASHBOARD_MIN_GROUP_SIZE,
        year: 2025,
        month: 2,
      });

      try {
        const result = await getFacilityDashboard(
          { userId: ADMIN_B, role: "facility_admin", facilityId: FACILITY_B },
          { year: 2025, month: 2 }
        );
        expect(result.selected.hidden).toBe(false);
        expect(result.selected.totalVisits).toBe(DASHBOARD_MIN_GROUP_SIZE);
        expect(result.selected.afr).toBe(100);
      } finally {
        await fixture.cleanup();
      }
    });
  });

  describe("Isolasi akses lintas fasilitas dan peran (§10, §11)", () => {
    it("admin Fasilitas B tidak bisa memperoleh angka Fasilitas A dengan parameter apa pun", async () => {
      const resultAsB = await getFacilityDashboard(
        { userId: ADMIN_B, role: "facility_admin", facilityId: FACILITY_B },
        { year: 2026, month: 10 }
      );
      // Fasilitas B tidak memiliki kunjungan seed di Oktober 2026 dari pasien stats_consent=true
      // sehingga hasilnya BUKAN data milik Fasilitas A (nama fasilitas berbeda; bukan "Puskesmas Contoh A").
      expect(resultAsB.facilityName).toBe("Klinik Contoh B");
      expect(resultAsB.facilityName).not.toBe("Puskesmas Contoh A");
    });

    it("peran pasien/petugas/pendamping memanggil getFacilityDashboard -> DashboardError (galat), bukan data", async () => {
      await expect(
        getFacilityDashboard({ userId: PATIENT_1, role: "patient" }, { year: 2026, month: 10 })
      ).rejects.toThrow(DashboardError);

      await expect(
        getFacilityDashboard(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          { year: 2026, month: 10 }
        )
      ).rejects.toThrow(DashboardError);

      await expect(
        getFacilityDashboard({ userId: COMPANION_1, role: "companion" }, { year: 2026, month: 10 })
      ).rejects.toThrow(DashboardError);
    });

    it("fungsi get_facility_dashboard mengembalikan NULL (fail-closed) bila dipanggil langsung di luar konteks facility_admin", async () => {
      const result = await withContext(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        async (tx) => {
          const res = await tx.query<{ result: unknown }>(
            `SELECT get_facility_dashboard($1, $2) AS result;`,
            [2026, 10]
          );
          return res.rows[0]?.result;
        }
      );
      expect(result).toBeNull();
    });

    it("admin fasilitas tetap 0 baris saat SELECT langsung ke visits, visit_confirmations, dan patient_profiles (RLS §3)", async () => {
      const rows = await withContext(
        { userId: ADMIN_A, role: "facility_admin", facilityId: FACILITY_A },
        async (tx) => {
          const visits = await tx.query("SELECT 1 FROM visits;");
          const confirmations = await tx.query("SELECT 1 FROM visit_confirmations;");
          const profiles = await tx.query("SELECT 1 FROM patient_profiles;");
          return {
            visits: visits.rowCount,
            confirmations: confirmations.rowCount,
            profiles: profiles.rowCount,
          };
        }
      );
      expect(rows.visits).toBe(0);
      expect(rows.confirmations).toBe(0);
      expect(rows.profiles).toBe(0);
    });

    it("fungsi get_facility_dashboard dimiliki aksespass_owner, SET search_path eksplisit, dan EXECUTE hanya untuk aksespass_app", async () => {
      const adminClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
      await adminClient.connect();
      try {
        const ownerRes = await adminClient.query<{ owner: string; config: string[] | null }>(
          `SELECT r.rolname AS owner, p.proconfig AS config
           FROM pg_proc p
           JOIN pg_roles r ON r.oid = p.proowner
           WHERE p.proname = 'get_facility_dashboard';`
        );
        expect(ownerRes.rows.length).toBe(1);
        expect(ownerRes.rows[0].owner).toBe("aksespass_owner");
        expect(ownerRes.rows[0].config || []).toEqual(
          expect.arrayContaining([expect.stringContaining("search_path=public, pg_temp")])
        );

        const grantsRes = await adminClient.query<{ grantee: string; privilege_type: string }>(
          `SELECT grantee, privilege_type
           FROM information_schema.routine_privileges
           WHERE routine_name = 'get_facility_dashboard';`
        );
        const grantees = grantsRes.rows.map((r) => r.grantee);
        expect(grantees).toContain("aksespass_app");
        expect(grantees).not.toContain("PUBLIC");
      } finally {
        await adminClient.end();
      }
    });
  });
});
