import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { confirmVisit } from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101"; // Puskesmas Contoh A
const STAFF_A = "22222222-2222-4222-8222-222222222301"; // Petugas Faskes A
const PATIENT_1 = "22222222-2222-4222-8222-222222222101"; // Pasien Contoh 1
const PATIENT_4 = "22222222-2222-4222-8222-222222222104"; // Pasien Contoh 4 (tertaut aktif dengan COMP_1)
const COMP_1 = "22222222-2222-4222-8222-222222222201"; // Pendamping Contoh 1

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

describe("src/lib/careproof: Konfirmasi Pelayanan CareProof & Resolusi §9", () => {
  it("kunjungan belum dicatat -> konfirmasi ditolak", async () => {
    const adminClient = new pg.Client({
      connectionString: getAdminTestDbUrl(),
    });
    await adminClient.connect();

    const visitId = crypto.randomUUID();
    const clientId = `test-v-unrecorded-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    try {
      // Buat kunjungan terbuka tetapi belum dicatat (recorded_at = NULL)
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

      // Percobaan konfirmasi harus ditolak karena belum dicatat
      await expect(
        confirmVisit(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          visitId,
          { status: "terpenuhi" }
        )
      ).rejects.toThrowError(/belum dicatat/i);
    } finally {
      await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
      await adminClient.end();
    }
  });

  it("on_site tersimpan dengan confirmed_by on_site dan audit visit_confirmed tercatat", async () => {
    const adminClient = new pg.Client({
      connectionString: getAdminTestDbUrl(),
    });
    await adminClient.connect();

    const visitId = crypto.randomUUID();
    const clientId = `test-v-onsite-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    try {
      // 1. Buat kunjungan yang sudah dicatat bantuannya
      await withContext(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        async (tx) => {
          await tx.query(
            `INSERT INTO visits (
               id, patient_user_id, facility_id, staff_user_id, channel,
               client_id, created_at, recorded_at
             ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, $6);`,
            [visitId, PATIENT_1, FACILITY_A, STAFF_A, clientId, now.toISOString()]
          );
        }
      );

      // 2. Petugas melakukan konfirmasi di tempat (on_site) dengan status "sebagian"
      const res = await confirmVisit(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        visitId,
        {
          status: "sebagian",
          unmetNeedCodes: ["komunikasi_tertulis"],
        },
        { now }
      );

      expect(res.ok).toBe(true);
      expect(res.visitId).toBe(visitId);
      expect(res.status).toBe("sebagian");
      expect(res.confirmedBy).toBe("on_site");

      // Verifikasi di database: baris visit_confirmations
      const dbConf = await adminClient.query<{
        status: string;
        confirmed_by: string;
        unmet_need_codes: string[];
      }>("SELECT status, confirmed_by, unmet_need_codes FROM visit_confirmations WHERE visit_id = $1;", [
        visitId,
      ]);

      expect(dbConf.rows.length).toBe(1);
      expect(dbConf.rows[0].status).toBe("sebagian");
      expect(dbConf.rows[0].confirmed_by).toBe("on_site");
      expect(dbConf.rows[0].unmet_need_codes).toEqual(["komunikasi_tertulis"]);

      // Verifikasi audit_events:
      const auditRes = await adminClient.query<{
        event_type: string;
        actor_id: string;
        actor_role: string;
        facility_id: string;
        fields: string[];
      }>(
        `SELECT event_type, actor_id, actor_role, facility_id, fields
         FROM audit_events
         WHERE event_type = 'visit_confirmed' AND facility_id = $1
         ORDER BY id DESC LIMIT 1;`,
        [FACILITY_A]
      );

      expect(auditRes.rows.length).toBe(1);
      expect(auditRes.rows[0].event_type).toBe("visit_confirmed");
      expect(auditRes.rows[0].actor_id).toBe(STAFF_A);
      expect(auditRes.rows[0].fields).toEqual([]);
    } finally {
      await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
      await adminClient.end();
    }
  });

  it("pasien menimpa konfirmasi on_site -> berhasil; on_site atau pendamping setelah pasien -> 409", async () => {
    const adminClient = new pg.Client({
      connectionString: getAdminTestDbUrl(),
    });
    await adminClient.connect();

    const visitId = crypto.randomUUID();
    const clientId = `test-v-overwrite-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    try {
      // 1. Buat kunjungan yang sudah dicatat untuk PATIENT_4 (yang didampingi COMP_1)
      await withContext(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        async (tx) => {
          await tx.query(
            `INSERT INTO visits (
               id, patient_user_id, facility_id, staff_user_id, channel,
               client_id, created_at, recorded_at
             ) VALUES ($1, $2, $3, $4, 'qr', $5, $6, $6);`,
            [visitId, PATIENT_4, FACILITY_A, STAFF_A, clientId, now.toISOString()]
          );
        }
      );

      // 2. Petugas mengonfirmasi di tempat lebih dulu: "sebagian"
      const onSiteRes = await confirmVisit(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        visitId,
        {
          status: "sebagian",
          unmetNeedCodes: ["komunikasi_tertulis"],
        }
      );
      expect(onSiteRes.confirmedBy).toBe("on_site");

      // 3. Pasien mengonfirmasi sendiri (misal "terpenuhi"): Pasien menimpa on_site -> BERHASIL!
      const patientRes = await confirmVisit(
        { userId: PATIENT_4, role: "patient" },
        visitId,
        { status: "terpenuhi" }
      );
      expect(patientRes.ok).toBe(true);
      expect(patientRes.status).toBe("terpenuhi");
      expect(patientRes.confirmedBy).toBe("patient");

      // Periksa database: status terupdate ke 'patient' dan 'terpenuhi'
      const dbConf = await adminClient.query<{
        status: string;
        confirmed_by: string;
      }>("SELECT status, confirmed_by FROM visit_confirmations WHERE visit_id = $1;", [
        visitId,
      ]);
      expect(dbConf.rows[0].status).toBe("terpenuhi");
      expect(dbConf.rows[0].confirmed_by).toBe("patient");

      // 4. Setelah pasien mengonfirmasi, on_site mencoba mengubah lagi -> 409 "Pasien sudah mengonfirmasi"
      await expect(
        confirmVisit(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          visitId,
          { status: "belum", unmetNeedCodes: ["komunikasi_bisindo"] }
        )
      ).rejects.toThrowError(/Pasien sudah mengonfirmasi/i);

      // 5. Setelah pasien mengonfirmasi, pendamping mencoba mengubah -> 409 "Pasien sudah mengonfirmasi"
      await expect(
        confirmVisit(
          { userId: COMP_1, role: "companion" },
          visitId,
          { status: "sebagian", unmetNeedCodes: ["komunikasi_bisindo"] }
        )
      ).rejects.toThrowError(/Pasien sudah mengonfirmasi/i);
    } finally {
      await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
      await adminClient.end();
    }
  });
});
