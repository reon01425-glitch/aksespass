import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { type AllowedSharedField } from "../consent/constants";
import { type AuditEventType, recordAuditEvent } from "./index";

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

const IDS = {
  facilities: {
    a: "11111111-1111-4111-8111-111111111101",
  },
  users: {
    p1: "22222222-2222-4222-8222-222222222101",
    staffA1: "22222222-2222-4222-8222-222222222301",
  },
  auditSubjects: {
    p1: "aaaa1111-1111-4111-8111-111111111101",
  },
};

describe("src/lib/audit: Pencatatan Audit Log Append-Only dan Atomisitas", () => {
  let adminClient: pg.Client;

  beforeAll(async () => {
    adminClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
    await adminClient.connect();
  });

  afterAll(async () => {
    if (adminClient) {
      await adminClient.end();
    }
  });

  it("recordAuditEvent menolak nama event tak dikenal dan field di luar konstanta", async () => {
    await withContext(
      {
        userId: IDS.users.staffA1,
        role: "staff",
        facilityId: IDS.facilities.a,
      },
      async (tx) => {
        // 1. Nama event tak dikenal
        await expect(
          recordAuditEvent(tx, {
            eventType: "event_palsu_tak_dikenal" as AuditEventType,
            actorId: IDS.users.staffA1,
            actorRole: "staff",
          })
        ).rejects.toThrow(/Tipe event audit tidak dikenal/);

        // 2. Field di luar konstanta bersama (mis. diagnosis, telepon, token)
        await expect(
          recordAuditEvent(tx, {
            eventType: "profile_read",
            actorId: IDS.users.staffA1,
            actorRole: "staff",
            subjectRef: IDS.auditSubjects.p1,
            fields: ["diagnosis" as unknown as AllowedSharedField],
          })
        ).rejects.toThrow(/Field audit tidak diizinkan/);

        await expect(
          recordAuditEvent(tx, {
            eventType: "profile_read",
            actorId: IDS.users.staffA1,
            actorRole: "staff",
            subjectRef: IDS.auditSubjects.p1,
            fields: ["telepon" as unknown as AllowedSharedField],
          })
        ).rejects.toThrow(/Field audit tidak diizinkan/);

        await expect(
          recordAuditEvent(tx, {
            eventType: "profile_read",
            actorId: IDS.users.staffA1,
            actorRole: "staff",
            subjectRef: IDS.auditSubjects.p1,
            fields: ["data_asing" as unknown as AllowedSharedField],
          })
        ).rejects.toThrow(/Field audit tidak diizinkan/);

        // 3. Field sah (kategori kebutuhan, catatan_pasien, nama_panggilan) berhasil dicatat
        await expect(
          recordAuditEvent(tx, {
            eventType: "profile_read",
            actorId: IDS.users.staffA1,
            actorRole: "staff",
            subjectRef: IDS.auditSubjects.p1,
            facilityId: IDS.facilities.a,
            fields: ["komunikasi", "catatan_pasien", "nama_panggilan"],
          })
        ).resolves.toBeUndefined();
      }
    );
  });

  it("audit atomik: event dicatat lalu transaksi melempar error → tidak ada baris tersisa", async () => {
    const beforeCountRes = await adminClient.query(
      "SELECT count(*)::int as total FROM audit_events WHERE subject_ref = $1;",
      [IDS.auditSubjects.p1]
    );
    const beforeCount = beforeCountRes.rows[0].total;

    await expect(
      withContext(
        {
          userId: IDS.users.p1,
          role: "patient",
        },
        async (tx) => {
          await recordAuditEvent(tx, {
            eventType: "qr_created",
            actorId: IDS.users.p1,
            actorRole: "patient",
            subjectRef: IDS.auditSubjects.p1,
            facilityId: IDS.facilities.a,
            fields: ["komunikasi", "mobilitas"],
          });

          // Transaksi melempar error setelah event dicatat
          throw new Error("Simulasi kegagalan setelah recordAuditEvent");
        }
      )
    ).rejects.toThrow("Simulasi kegagalan setelah recordAuditEvent");

    const afterCountRes = await adminClient.query(
      "SELECT count(*)::int as total FROM audit_events WHERE subject_ref = $1;",
      [IDS.auditSubjects.p1]
    );
    const afterCount = afterCountRes.rows[0].total;

    // Transaksi di-rollback, tidak ada baris baru di audit_events
    expect(afterCount).toBe(beforeCount);
  });

  it("audit atomik: event tak dikenal di tengah transaksi → perubahan data di transaksi yang sama ikut batal", async () => {
    const testClientId = "client-atomic-rollback-test-01";

    await expect(
      withContext(
        {
          userId: IDS.users.staffA1,
          role: "staff",
          facilityId: IDS.facilities.a,
        },
        async (tx) => {
          // Lakukan mutasi bisnis
          await tx.query(
            `INSERT INTO visits (
              patient_user_id, facility_id, staff_user_id, channel, client_id
            ) VALUES ($1, $2, $3, 'qr', $4);`,
            [IDS.users.p1, IDS.facilities.a, IDS.users.staffA1, testClientId]
          );

          // Panggil recordAuditEvent dengan event tak dikenal yang gagal validasi
          await recordAuditEvent(tx, {
            eventType: "unknown_event_type_which_fails" as AuditEventType,
            actorId: IDS.users.staffA1,
            actorRole: "staff",
          });
        }
      )
    ).rejects.toThrow(/Tipe event audit tidak dikenal/);

    // Verifikasi bahwa baris visit juga ikut batal / ter-rollback
    const visitCheck = await adminClient.query(
      "SELECT count(*)::int as total FROM visits WHERE client_id = $1;",
      [testClientId]
    );
    expect(visitCheck.rows[0].total).toBe(0);
  });
});
