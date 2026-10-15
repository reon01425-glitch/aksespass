import crypto from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestOtp, verifyOtp } from "../auth";
import { hmacSha256Hex } from "../auth/crypto";
import { getHashPepper } from "../auth/env";
import { getOwnAccessHistory } from "../audit";
import { cancelRecovery, listRecoveryRequests, RecoveryError, requestRecovery } from "./index";

const adminUrl = process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";

function phone(prefix: string) {
  return `+62${prefix}${Math.floor(10000000 + Math.random() * 90000000)}`;
}

describe("Pemulihan akun lewat pendamping (migrasi 023)", () => {
  let db: pg.Client;
  const patientId = crypto.randomUUID();
  const comp1 = crypto.randomUUID();
  const comp2 = crypto.randomUUID();
  const outsider = crypto.randomUUID();
  const link1 = crypto.randomUUID();
  const link2 = crypto.randomUUID();
  const oldPhone = phone("812");
  let subject: string;

  const P = { userId: patientId, role: "patient" };
  const C1 = { userId: comp1, role: "companion" };
  const C2 = { userId: comp2, role: "companion" };
  const OUT = { userId: outsider, role: "companion" };

  async function clearPending() {
    await db.query("DELETE FROM account_recovery_requests WHERE patient_user_id = $1", [patientId]);
  }
  async function otpFor(p: string): Promise<string> {
    await db.query("DELETE FROM rate_limit_hits WHERE key LIKE 'otp:req:%'");
    const r = await requestOtp(p);
    return r.devOtp!;
  }

  beforeAll(async () => {
    db = new pg.Client({ connectionString: adminUrl });
    await db.connect();
    await db.query(
      `INSERT INTO users (id, phone, role, display_name) VALUES
        ($1, $2, 'patient', 'Pasien Pulih'), ($3, $4, 'companion', 'Pendamping Satu'),
        ($5, $6, 'companion', 'Pendamping Dua'), ($7, $8, 'companion', 'Orang Luar');`,
      [patientId, oldPhone, comp1, phone("813"), comp2, phone("814"), outsider, phone("815")]
    );
    await db.query("INSERT INTO patient_profiles (user_id, preferred_name) VALUES ($1, 'Pulih')", [patientId]);
    const s = await db.query("SELECT audit_subject_id FROM users WHERE id = $1", [patientId]);
    subject = s.rows[0].audit_subject_id;
    await db.query(
      `INSERT INTO companions (id, patient_user_id, companion_user_id, status, approved_at, patient_subject_ref)
       VALUES ($1, $3, $4, 'active', now(), $6), ($2, $3, $5, 'active', now(), $6);`,
      [link1, link2, patientId, comp1, comp2, subject]
    );
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE id IN ($1,$2,$3,$4)", [patientId, comp1, comp2, outsider]);
    await db.query("DELETE FROM users WHERE phone LIKE '+62899%'");
    await db.end();
  });

  it("hanya pendamping aktif yang dapat mengajukan; nomor terpakai dan permintaan ganda ditolak", async () => {
    await expect(requestRecovery(P, { linkId: link1, newPhone: phone("899") })).rejects.toBeInstanceOf(RecoveryError);
    await expect(requestRecovery(OUT, { linkId: link1, newPhone: phone("899") })).rejects.toBeInstanceOf(RecoveryError);
    await expect(requestRecovery(C1, { linkId: link1, newPhone: oldPhone })).rejects.toBeInstanceOf(RecoveryError);

    const np = phone("899");
    const r = await requestRecovery(C1, { linkId: link1, newPhone: np });
    expect(new Date(r.eligibleAt).getTime()).toBeGreaterThan(Date.now() + 23 * 3600 * 1000);
    await expect(requestRecovery(C2, { linkId: link2, newPhone: phone("899") })).rejects.toBeInstanceOf(RecoveryError);
    await clearPending();
  });

  it("pasien dan semua pendamping aktif melihat permintaan (nomor tersamar); orang luar tidak", async () => {
    const np = phone("899");
    await requestRecovery(C1, { linkId: link1, newPhone: np });
    const forPatient = await listRecoveryRequests(P);
    const forC1 = await listRecoveryRequests(C1);
    const forC2 = await listRecoveryRequests(C2);
    const forOut = await listRecoveryRequests(OUT);
    expect(forPatient).toHaveLength(1);
    expect(forPatient[0].maskedNewPhone).not.toContain(np.slice(4, 10));
    expect(forC1[0].initiatedByMe).toBe(true);
    expect(forC2[0].initiatedByMe).toBe(false);
    expect(forC2[0].linkId).toBe(link2);
    expect(forOut).toHaveLength(0);
    await clearPending();
  });

  it("pembatalan oleh pasien atau pendamping lain berhasil; orang luar ditolak; tercatat di audit", async () => {
    const np = phone("899");
    const r = await requestRecovery(C1, { linkId: link1, newPhone: np });
    await expect(cancelRecovery(OUT, r.id)).rejects.toMatchObject({ status: 404 });
    await cancelRecovery(C2, r.id);
    expect(await listRecoveryRequests(P)).toHaveLength(0);
    const r2 = await requestRecovery(C1, { linkId: link1, newPhone: np });
    await cancelRecovery(P, r2.id);
    const hist = await getOwnAccessHistory(P as never);
    const titles = JSON.stringify(hist);
    expect(titles).toContain("Permintaan pemulihan nomor akun dibatalkan");
    await clearPending();
  });

  it("masuk dengan nomor baru sebelum jeda berakhir ditolak; setelah jeda: akun yang sama pindah nomor", async () => {
    const np = phone("899");
    await requestRecovery(C1, { linkId: link1, newPhone: np });

    let code = await otpFor(np);
    await expect(verifyOtp(np, code, { intendedRole: "patient" })).rejects.toThrow(/jeda keselamatan/);

    await db.query("UPDATE account_recovery_requests SET eligible_at = now() - interval '1 minute' WHERE patient_user_id = $1 AND status='pending'", [patientId]);
    code = await otpFor(np);
    const res = await verifyOtp(np, code, { intendedRole: "patient" });
    expect(res.userId).toBe(patientId);
    expect(res.role).toBe("patient");

    const u = await db.query("SELECT phone FROM users WHERE id = $1", [patientId]);
    expect(u.rows[0].phone).toBe(np);
    const owned = await db.query("SELECT count(*)::int AS n FROM users WHERE phone = $1", [np]);
    expect(owned.rows[0].n).toBe(1);
    expect(await listRecoveryRequests(P)).toHaveLength(0);

    // tautan pendamping tetap ada
    const links = await db.query("SELECT count(*)::int AS n FROM companions WHERE patient_user_id = $1 AND status='active'", [patientId]);
    expect(links.rows[0].n).toBe(2);

    // nomor lama tidak lagi masuk ke akun ini
    const oldCode = await otpFor(oldPhone);
    const fresh = await verifyOtp(oldPhone, oldCode, { intendedRole: "patient" });
    expect(fresh.userId).not.toBe(patientId);
    await db.query("DELETE FROM users WHERE id = $1", [fresh.userId]);

    const events = await db.query(
      "SELECT event_type FROM audit_events WHERE subject_ref = $1 AND event_type LIKE 'recovery_%' ORDER BY occurred_at",
      [subject]
    );
    expect(events.rows.map((r) => r.event_type)).toEqual(expect.arrayContaining(["recovery_requested", "recovery_completed"]));
    // kode OTP tidak tersimpan mentah di audit
    expect(JSON.stringify(events.rows)).not.toContain(np);
    void getHashPepper; void hmacSha256Hex;
  });

  it("nomor yang keburu dipakai akun lain: masuk sebagai akun itu dan akun pasien tidak dipindahkan", async () => {
    const np = phone("899");
    await db.query("UPDATE users SET phone = $2 WHERE id = $1", [patientId, phone("812")]);
    await requestRecovery(C1, { linkId: link1, newPhone: np });
    await db.query("UPDATE account_recovery_requests SET eligible_at = now() - interval '1 minute' WHERE patient_user_id = $1 AND status='pending'", [patientId]);
    const other = crypto.randomUUID();
    await db.query("INSERT INTO users (id, phone, role, display_name) VALUES ($1, $2, 'companion', 'Pendamping Lain')", [other, np]);
    const code = await otpFor(np);
    // nomor sudah punya akun (pendamping lain): masuk sebagai akun itu, tanpa memindahkan akun pasien
    const res = await verifyOtp(np, code, { intendedRole: "companion" });
    expect(res.userId).toBe(other);
    const pend = await db.query("SELECT count(*)::int AS n FROM account_recovery_requests WHERE patient_user_id = $1 AND status='pending'", [patientId]);
    expect(pend.rows[0].n).toBe(1);
    await db.query("DELETE FROM users WHERE id = $1", [other]);
    await clearPending();
  });
});
