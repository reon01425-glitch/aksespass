import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { POST as konfirmasiRouteHandler } from "./route";
import { createSessionCookieValue } from "@/lib/auth/session";
import { withContext } from "@/db";
import { getHashPepper } from "@/lib/auth/env";
import { hmacSha256Hex } from "@/lib/auth/crypto";

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

describe("Route Handler Konfirmasi Kunjungan Pasien (POST /api/pasien/kunjungan/konfirmasi)", () => {
  const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
  const TEST_PATIENT_USER_ID = "22222222-2222-4222-8222-222222222101"; // Pasien Contoh 1
  const FACILITY_A = "11111111-1111-4111-8111-111111111101";
  const STAFF_A = "22222222-2222-4222-8222-222222222301";

  async function createPatientCookie(): Promise<string> {
    const pepper = getHashPepper();
    const sessionId = crypto.randomUUID();
    const sessHash = hmacSha256Hex(pepper, sessionId);

    await withContext(
      { userId: TEST_PATIENT_USER_ID, role: "patient" },
      async (tx) => {
        await tx.query(
          `INSERT INTO sessions (user_id, role, session_id_hash, expires_at)
           VALUES ($1, 'patient', $2, now() + interval '7 days');`,
          [TEST_PATIENT_USER_ID, sessHash]
        );
      }
    );

    const cookieValue = await createSessionCookieValue({
      sessionId,
      userId: TEST_PATIENT_USER_ID,
      role: "patient",
      facilityId: null,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      version: 1,
    });

    return `aksespass_session=${cookieValue}`;
  }

  it("permintaan tanpa Origin atau Origin asing ditolak dengan status 403", async () => {
    const reqNoOrigin = new Request(
      "http://localhost:3000/api/pasien/kunjungan/konfirmasi",
      {
        method: "POST",
        body: JSON.stringify({ visitId: crypto.randomUUID(), status: "terpenuhi" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const resNoOrigin = await konfirmasiRouteHandler(reqNoOrigin);
    expect(resNoOrigin.status).toBe(403);

    const reqForeign = new Request(
      "http://localhost:3000/api/pasien/kunjungan/konfirmasi",
      {
        method: "POST",
        body: JSON.stringify({ visitId: crypto.randomUUID(), status: "terpenuhi" }),
        headers: {
          "Content-Type": "application/json",
          origin: "https://evil.attacker.example",
        },
      }
    );
    const resForeign = await konfirmasiRouteHandler(reqForeign);
    expect(resForeign.status).toBe(403);
  });

  it("permintaan tanpa sesi yang valid ditolak dengan status 401", async () => {
    const req = new Request(
      "http://localhost:3000/api/pasien/kunjungan/konfirmasi",
      {
        method: "POST",
        body: JSON.stringify({
          visitId: crypto.randomUUID(),
          status: "terpenuhi",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: APP_ORIGIN,
        },
      }
    );

    const res = await konfirmasiRouteHandler(req);
    expect(res.status).toBe(401);
  });

  it("masukan tanpa visitId atau status tidak valid ditolak dengan status 400", async () => {
    const cookieHeader = await createPatientCookie();

    // 1. Tanpa visitId
    const reqNoVisit = new Request(
      "http://localhost:3000/api/pasien/kunjungan/konfirmasi",
      {
        method: "POST",
        body: JSON.stringify({ status: "terpenuhi" }),
        headers: {
          "Content-Type": "application/json",
          origin: APP_ORIGIN,
          cookie: cookieHeader,
        },
      }
    );
    const resNoVisit = await konfirmasiRouteHandler(reqNoVisit);
    expect(resNoVisit.status).toBe(400);

    // 2. Status tidak valid
    const reqInvalidStatus = new Request(
      "http://localhost:3000/api/pasien/kunjungan/konfirmasi",
      {
        method: "POST",
        body: JSON.stringify({
          visitId: crypto.randomUUID(),
          status: "invalid_status",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: APP_ORIGIN,
          cookie: cookieHeader,
        },
      }
    );
    const resInvalidStatus = await konfirmasiRouteHandler(reqInvalidStatus);
    expect(resInvalidStatus.status).toBe(400);
  });

  it("konfirmasi kunjungan valid oleh pasien mengembalikan status 200 dan data tersimpan", async () => {
    const adminClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
    await adminClient.connect();

    const visitId = crypto.randomUUID();
    const now = new Date();

    try {
      // Buat kunjungan yang sudah dicatat untuk TEST_PATIENT_USER_ID
      await adminClient.query(
        `INSERT INTO visits (
           id, patient_user_id, facility_id, staff_user_id, channel,
           client_id, created_at, recorded_at
         ) VALUES ($1, $2, $3, $4, 'kartu', $5, $6, $6);`,
        [
          visitId,
          TEST_PATIENT_USER_ID,
          FACILITY_A,
          STAFF_A,
          `route-test-v-${visitId}`,
          now.toISOString(),
        ]
      );

      const cookieHeader = await createPatientCookie();
      const req = new Request(
        "http://localhost:3000/api/pasien/kunjungan/konfirmasi",
        {
          method: "POST",
          body: JSON.stringify({
            visitId,
            status: "sebagian",
            unmetNeedCodes: ["komunikasi_bisindo"],
          }),
          headers: {
            "Content-Type": "application/json",
            origin: APP_ORIGIN,
            cookie: cookieHeader,
          },
        }
      );

      const res = await konfirmasiRouteHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.visitId).toBe(visitId);
      expect(json.status).toBe("sebagian");
      expect(json.confirmedBy).toBe("patient");

      // Verifikasi di DB
      const confRes = await adminClient.query<{
        status: string;
        confirmed_by: string;
        unmet_need_codes: string[];
      }>(
        `SELECT status, confirmed_by, unmet_need_codes
         FROM visit_confirmations WHERE visit_id = $1;`,
        [visitId]
      );
      expect(confRes.rows.length).toBe(1);
      expect(confRes.rows[0].status).toBe("sebagian");
      expect(confRes.rows[0].confirmed_by).toBe("patient");
      expect(confRes.rows[0].unmet_need_codes).toEqual(["komunikasi_bisindo"]);
    } finally {
      await adminClient.query(
        "DELETE FROM visit_confirmations WHERE visit_id = $1;",
        [visitId]
      );
      await adminClient.query("DELETE FROM visits WHERE id = $1;", [visitId]);
      await adminClient.end();
    }
  });
});
