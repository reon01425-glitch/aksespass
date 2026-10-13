import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { withContext } from "../../db";
import {
  listTodayVisits,
  mapVisitStatus,
  formatVisitTimeWIB,
  recordAssistance,
} from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101"; // Puskesmas Contoh A
const FACILITY_B = "11111111-1111-4111-8111-111111111102"; // RS Contoh B

const STAFF_A = "22222222-2222-4222-8222-222222222301"; // Petugas Faskes A
const STAFF_B = "22222222-2222-4222-8222-222222222303"; // Petugas Faskes B
const PATIENT_1 = "22222222-2222-4222-8222-222222222101"; // Pasien Contoh 1
const PATIENT_2 = "22222222-2222-4222-8222-222222222102"; // Pasien Contoh 2

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

describe("src/lib/visits: Kunjungan Hari Ini dan Pemetaan Status (T3)", () => {
  describe("mapVisitStatus (Fungsi Murni)", () => {
    it("memetakan kunjungan belum dicatat (recorded_at null)", () => {
      const res = mapVisitStatus(null, null, null);
      expect(res.statusCode).toBe("unrecorded");
      expect(res.statusText).toBe("Belum dicatat");
      expect(res.iconName).toBe("FileEdit");
    });

    it("memetakan kunjungan menunggu konfirmasi (recorded_at ada, belum ada konfirmasi)", () => {
      const res = mapVisitStatus(new Date(), null, null);
      expect(res.statusCode).toBe("pending_confirmation");
      expect(res.statusText).toBe("Menunggu konfirmasi");
      expect(res.iconName).toBe("Clock");
    });

    it("memetakan konfirmasi terpenuhi oleh pasien", () => {
      const res = mapVisitStatus(new Date(), "terpenuhi", "patient");
      expect(res.statusCode).toBe("confirmed");
      expect(res.statusText).toBe("Dikonfirmasi: Terpenuhi (oleh pasien)");
      expect(res.iconName).toBe("CheckCheck");
    });

    it("memetakan konfirmasi sebagian oleh pendamping", () => {
      const res = mapVisitStatus(new Date(), "sebagian", "companion");
      expect(res.statusCode).toBe("confirmed");
      expect(res.statusText).toBe("Dikonfirmasi: Sebagian (oleh pendamping)");
      expect(res.iconName).toBe("CheckCheck");
    });

    it("memetakan konfirmasi belum di tempat", () => {
      const res = mapVisitStatus(new Date(), "belum", "on_site");
      expect(res.statusCode).toBe("confirmed");
      expect(res.statusText).toBe("Dikonfirmasi: Belum (di tempat)");
      expect(res.iconName).toBe("CheckCheck");
    });
  });

  describe("formatVisitTimeWIB", () => {
    it("memformat jam dalam zona waktu Asia/Jakarta (WIB)", () => {
      // 03:00 UTC = 10:00 WIB
      const d = new Date("2026-10-13T03:00:00Z");
      const formatted = formatVisitTimeWIB(d);
      expect(formatted).toBe("10.00 WIB");
    });
  });

  describe("listTodayVisits (Akses Database dan RLS)", () => {
    it("petugas fasilitas B tidak melihat kunjungan fasilitas A; hasil tidak memuat patient_id, nama panggilan, atau field profil; pemetaan status lengkap", async () => {
      const adminClient = new pg.Client({
        connectionString: getAdminTestDbUrl(),
      });
      await adminClient.connect();

      const uniqueSuffix = crypto.randomUUID().slice(0, 8);
      const visitAId = crypto.randomUUID();
      const visitBId = crypto.randomUUID();
      const clientIdA = `test-v-a-${uniqueSuffix}`;
      const clientIdB = `test-v-b-${uniqueSuffix}`;

      const now = new Date();

      try {
        // 1. Buat kunjungan di Fasilitas A oleh Petugas A
        await withContext(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          async (tx) => {
            await tx.query(
              `INSERT INTO visits (
                 id, patient_user_id, facility_id, staff_user_id, channel,
                 client_id, created_at, recorded_at
               ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, NULL);`,
              [visitAId, PATIENT_1, FACILITY_A, STAFF_A, clientIdA, now.toISOString()]
            );
          }
        );

        // 2. Buat kunjungan di Fasilitas B oleh Petugas B (dengan recorded_at dan konfirmasi)
        await withContext(
          { userId: STAFF_B, role: "staff", facilityId: FACILITY_B },
          async (tx) => {
            await tx.query(
              `INSERT INTO visits (
                 id, patient_user_id, facility_id, staff_user_id, channel,
                 client_id, created_at, recorded_at
               ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, $6);`,
              [visitBId, PATIENT_2, FACILITY_B, STAFF_B, clientIdB, now.toISOString()]
            );

            await tx.query(
              `INSERT INTO visit_confirmations (
                 visit_id, status, confirmed_by, confirmed_at
               ) VALUES ($1, 'terpenuhi', 'patient', $2);`,
              [visitBId, now.toISOString()]
            );
          }
        );

        // 3. Petugas Fasilitas B meminta daftar kunjungan hari ini
        const visitsForB = await listTodayVisits(
          { userId: STAFF_B, role: "staff", facilityId: FACILITY_B },
          { now }
        );

        // Petugas B HANYA melihat kunjungan Fasilitas B, sama sekali tidak melihat kunjungan Fasilitas A!
        expect(visitsForB.some((v) => v.id === visitAId)).toBe(false);
        const itemB = visitsForB.find((v) => v.id === visitBId);
        expect(itemB).toBeDefined();

        if (itemB) {
          // Rujukan pendek adalah 4 karakter akhir ID
          const expectedShortRef = visitBId.replace(/-/g, "").slice(-4).toUpperCase();
          expect(itemB.shortRef).toBe(expectedShortRef);
          expect(itemB.statusText).toBe("Dikonfirmasi: Terpenuhi (oleh pasien)");
          expect(itemB.statusCode).toBe("confirmed");
          expect(itemB.time).toContain("WIB");

          // Verifikasi integritas privasi: TIDAK ADA field profil atau pasien
          const itemKeys = Object.keys(itemB);
          expect(itemKeys).not.toContain("patient_id");
          expect(itemKeys).not.toContain("patient_user_id");
          expect(itemKeys).not.toContain("preferred_name");
          expect(itemKeys).not.toContain("preferredName");
          expect(itemKeys).not.toContain("namaPanggilan");
          expect(itemKeys).not.toContain("nama_panggilan");
          expect(itemKeys).not.toContain("diagnosis");
          expect(itemKeys).not.toContain("profile");
        }

        // 4. Petugas Fasilitas A meminta daftar kunjungan hari ini
        const visitsForA = await listTodayVisits(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          { now }
        );

        // Petugas A HANYA melihat kunjungan Fasilitas A, tidak melihat Fasilitas B
        expect(visitsForA.some((v) => v.id === visitBId)).toBe(false);
        const itemA = visitsForA.find((v) => v.id === visitAId);
        expect(itemA).toBeDefined();

        if (itemA) {
          expect(itemA.statusCode).toBe("unrecorded");
          expect(itemA.statusText).toBe("Belum dicatat");
          expect(itemA.iconName).toBe("FileEdit");

          const itemKeys = Object.keys(itemA);
          expect(itemKeys).not.toContain("patient_id");
          expect(itemKeys).not.toContain("patient_user_id");
          expect(itemKeys).not.toContain("namaPanggilan");
        }
      } finally {
        // Bersihkan data tes
        await adminClient.query(
          "DELETE FROM visits WHERE id IN ($1, $2);",
          [visitAId, visitBId]
        );
        await adminClient.end();
      }
    });

    it("mengembalikan array kosong jika peran bukan staff atau fasilitas kosong", async () => {
      const nonStaffRes = await listTodayVisits({
        userId: PATIENT_1,
        role: "patient",
        facilityId: FACILITY_A,
      });
      expect(nonStaffRes).toEqual([]);

      const noFacilityRes = await listTodayVisits({
        userId: STAFF_A,
        role: "staff",
        facilityId: null,
      });
      expect(noFacilityRes).toEqual([]);
    });
  });

  describe("recordAssistance (T8: Pencatatan Bantuan Petugas)", () => {
    const PUBLISHED_RULE_1 = "66666666-6666-4666-8666-666666666101";
    const DRAFT_RULE = "66666666-6666-4666-8666-666666666113";

    it("catatan melebihi batas (280 karakter) ditolak di server", async () => {
      const tooLongNote = "a".repeat(281);
      await expect(
        recordAssistance(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          {
            visitId: crypto.randomUUID(),
            ruleIds: [PUBLISHED_RULE_1],
            note: tooLongNote,
          }
        )
      ).rejects.toThrow("280 karakter");
    });

    it("ruleId yang tidak published ditolak", async () => {
      const adminClient = new pg.Client({
        connectionString: getAdminTestDbUrl(),
      });
      await adminClient.connect();

      const visitId = crypto.randomUUID();
      const clientId = `test-v-rule-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date();

      try {
        await withContext(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          async (tx) => {
            await tx.query(
              `INSERT INTO visits (
                 id, patient_user_id, facility_id, staff_user_id, channel,
                 client_id, created_at, recorded_at
               ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, NULL);`,
              [visitId, PATIENT_1, FACILITY_A, STAFF_A, clientId, now.toISOString()]
            );
          }
        );

        // Mengirim DRAFT_RULE harus ditolak
        await expect(
          recordAssistance(
            { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
            {
              visitId,
              ruleIds: [DRAFT_RULE],
            }
          )
        ).rejects.toThrow();
      } finally {
        await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
        await adminClient.end();
      }
    });

    it("petugas fasilitas lain ditolak", async () => {
      const adminClient = new pg.Client({
        connectionString: getAdminTestDbUrl(),
      });
      await adminClient.connect();

      const visitId = crypto.randomUUID();
      const clientId = `test-v-cross-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date();

      try {
        // Buat kunjungan di Fasilitas A
        await withContext(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          async (tx) => {
            await tx.query(
              `INSERT INTO visits (
                 id, patient_user_id, facility_id, staff_user_id, channel,
                 client_id, created_at, recorded_at
               ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, NULL);`,
              [visitId, PATIENT_1, FACILITY_A, STAFF_A, clientId, now.toISOString()]
            );
          }
        );

        // Petugas dari Fasilitas B mencoba mencatat kunjungan Fasilitas A -> DITOLAK
        await expect(
          recordAssistance(
            { userId: STAFF_B, role: "staff", facilityId: FACILITY_B },
            {
              visitId,
              ruleIds: [PUBLISHED_RULE_1],
              note: "Bantuan dari petugas lain",
            }
          )
        ).rejects.toThrow();
      } finally {
        await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
        await adminClient.end();
      }
    });

    it("simpan kedua menghasilkan 409 tanpa baris baru; audit visit_recorded memuat subject_ref dan tidak memuat catatan", async () => {
      const adminClient = new pg.Client({
        connectionString: getAdminTestDbUrl(),
      });
      await adminClient.connect();

      const visitId = crypto.randomUUID();
      const clientId = `test-v-double-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date();
      const secretNote = "SINTETIS_CATATAN_PETUGAS_987654";

      try {
        await withContext(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          async (tx) => {
            await tx.query(
              `INSERT INTO visits (
                 id, patient_user_id, facility_id, staff_user_id, channel,
                 client_id, created_at, recorded_at
               ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, NULL);`,
              [visitId, PATIENT_1, FACILITY_A, STAFF_A, clientId, now.toISOString()]
            );
          }
        );

        // Simpan pertama kali -> Berhasil
        const res = await recordAssistance(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          {
            visitId,
            ruleIds: [PUBLISHED_RULE_1],
            note: secretNote,
          },
          { now }
        );

        expect(res.ok).toBe(true);
        expect(res.visitId).toBe(visitId);

        // Hitung baris kunjungan di database: harus tetap tepat 1 baris
        const countRes = await adminClient.query(
          "SELECT count(*)::int AS cnt FROM visits WHERE id = $1;",
          [visitId]
        );
        expect(countRes.rows[0].cnt).toBe(1);

        // Simpan kedua kali -> 409 ALREADY_RECORDED
        await expect(
          recordAssistance(
            { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
            {
              visitId,
              ruleIds: [PUBLISHED_RULE_1],
              note: "Percobaan simpan kedua",
            }
          )
        ).rejects.toThrowError(/sudah dicatat/i);

        // Hitung baris kunjungan lagi: tidak ada baris baru
        const countRes2 = await adminClient.query(
          "SELECT count(*)::int AS cnt FROM visits WHERE id = $1;",
          [visitId]
        );
        expect(countRes2.rows[0].cnt).toBe(1);

        // Verifikasi audit_events:
        // 1. Ada event visit_recorded
        // 2. Memuat subject_ref pasien
        // 3. TIDAK memuat catatan petugas rahasia di mana pun
        const auditRes = await adminClient.query<{
          event_type: string;
          actor_id: string;
          subject_ref: string;
          facility_id: string;
          fields: string[];
        }>(
          `SELECT event_type, actor_id, subject_ref, facility_id, fields
           FROM audit_events
           WHERE event_type = 'visit_recorded' AND facility_id = $1
           ORDER BY id DESC LIMIT 1;`,
          [FACILITY_A]
        );

        expect(auditRes.rows.length).toBe(1);
        const auditRow = auditRes.rows[0];
        expect(auditRow.event_type).toBe("visit_recorded");
        expect(auditRow.actor_id).toBe(STAFF_A);
        expect(auditRow.facility_id).toBe(FACILITY_A);
        expect(auditRow.subject_ref).toBeDefined();
        expect(auditRow.subject_ref).not.toBeNull();

        // Verifikasi tidak ada kebocoran catatan petugas di audit_events
        const allAuditText = JSON.stringify(auditRow);
        expect(allAuditText).not.toContain(secretNote);
      } finally {
        await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
        await adminClient.end();
      }
    });
  });
});
