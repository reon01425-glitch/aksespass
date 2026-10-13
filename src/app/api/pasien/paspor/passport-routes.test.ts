import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { POST as passportRouteHandler } from "./route";
import { createSessionCookieValue } from "../../../../lib/auth/session";
import { withContext } from "../../../../db";
import { getHashPepper } from "../../../../lib/auth/env";
import { hmacSha256Hex } from "../../../../lib/auth/crypto";

describe("Route Handler Paspor Pasien (POST /api/pasien/paspor)", () => {
  const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:3000";
  const TEST_PATIENT_USER_ID = "22222222-2222-4222-8222-222222222103";

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
    // 1. Tanpa Origin
    const reqNoOrigin = new Request("http://localhost:3000/api/pasien/paspor", {
      method: "POST",
      body: JSON.stringify({ preferredName: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const resNoOrigin = await passportRouteHandler(reqNoOrigin);
    expect(resNoOrigin.status).toBe(403);

    // 2. Origin asing
    const reqForeign = new Request("http://localhost:3000/api/pasien/paspor", {
      method: "POST",
      body: JSON.stringify({ preferredName: "Test" }),
      headers: {
        "Content-Type": "application/json",
        origin: "https://evil.attacker.example",
      },
    });
    const resForeign = await passportRouteHandler(reqForeign);
    expect(resForeign.status).toBe(403);
  });

  it("permintaan tanpa sesi yang valid ditolak dengan status 401", async () => {
    const req = new Request("http://localhost:3000/api/pasien/paspor", {
      method: "POST",
      body: JSON.stringify({
        preferredName: "Budi",
        needCodes: ["komunikasi_bisindo"],
      }),
      headers: {
        "Content-Type": "application/json",
        origin: APP_ORIGIN,
      },
    });

    const res = await passportRouteHandler(req);
    expect(res.status).toBe(401);
  });

  it("simpan paspor valid dengan Origin dan sesi pasien berhasil (200 OK + no-store)", async () => {
    const cookieHeader = await createPatientCookie();

    const req = new Request("http://localhost:3000/api/pasien/paspor", {
      method: "POST",
      body: JSON.stringify({
        preferredName: "Panggilan Pasien Rute",
        needCodes: ["komunikasi_bisindo", "panduan_verbal"],
        patientNote: "Catatan lewat route handler",
      }),
      headers: {
        "Content-Type": "application/json",
        origin: APP_ORIGIN,
        cookie: cookieHeader,
      },
    });

    const res = await passportRouteHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.passport.preferredName).toBe("Panggilan Pasien Rute");
    expect(data.passport.needCodes).toContain("komunikasi_bisindo");
    expect(data.passport.needCodes).toContain("panduan_verbal");
  });

  it("masukan tidak valid (kunci tak dikenal / diagnosis) ditolak dengan status 422", async () => {
    const cookieHeader = await createPatientCookie();

    const req = new Request("http://localhost:3000/api/pasien/paspor", {
      method: "POST",
      body: JSON.stringify({
        preferredName: "Panggilan",
        needCodes: ["komunikasi_bisindo"],
        diagnosis: "gangguan telinga",
      }),
      headers: {
        "Content-Type": "application/json",
        origin: APP_ORIGIN,
        cookie: cookieHeader,
      },
    });

    const res = await passportRouteHandler(req);
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBeTruthy();
  });
});
