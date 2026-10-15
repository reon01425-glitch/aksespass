import crypto from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { changeOwnPhone, deleteOwnPatientAccount, getOwnPhone, maskPhone } from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101";
const STAFF_A = "22222222-2222-4222-8222-222222222301";

function adminUrl(): string {
  return process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";
}

let admin: pg.Client;
const created: string[] = [];

function randomPhone() {
  return `+62815${Math.floor(10000000 + Math.random() * 89999999)}`;
}

async function makePatient(opts: { stats: boolean }) {
  const id = crypto.randomUUID();
  const phone = randomPhone();
  await admin.query(
    `INSERT INTO users (id, phone, role, display_name, stats_consent)
     VALUES ($1, $2, 'patient', 'Pasien Uji Hapus', $3);`,
    [id, phone, opts.stats]
  );
  await admin.query(
    `INSERT INTO patient_profiles (user_id, preferred_name) VALUES ($1, 'Uji');`,
    [id]
  );
  const visitId = crypto.randomUUID();
  await admin.query(
    `INSERT INTO visits (id, patient_user_id, facility_id, staff_user_id, channel, client_id, recorded_at, staff_note)
     VALUES ($1, $2, $3, $4, 'qr', $5, now(), 'catatan rahasia');`,
    [visitId, id, FACILITY_A, STAFF_A, `acct-${visitId}`]
  );
  await admin.query(
    `INSERT INTO visit_confirmations (visit_id, status, confirmed_by, confirmed_by_user_id)
     VALUES ($1, 'terpenuhi', 'patient', $2);`,
    [visitId, id]
  );
  created.push(id);
  return { id, phone, visitId };
}

const ctx = (id: string) => ({ userId: id, role: "patient" });

beforeAll(async () => {
  admin = new pg.Client({ connectionString: adminUrl() });
  await admin.connect();
});

afterAll(async () => {
  for (const id of created) {
    await admin.query("DELETE FROM visits WHERE patient_user_id = $1;", [id]);
    await admin.query("DELETE FROM audit_events WHERE actor_id = $1;", [id]).catch(() => undefined);
  }
  await admin.end();
});

describe("akun pasien (P22/P23)", () => {
  it("maskPhone hanya menampilkan awalan dan 4 digit akhir", () => {
    expect(maskPhone("+6281234567890")).toBe("+62••••••7890");
    expect(maskPhone(null)).toBe("Belum ada nomor");
  });

  it("getOwnPhone dan changeOwnPhone bekerja untuk akun sendiri dan menolak nomor milik orang lain", async () => {
    const a = await makePatient({ stats: false });
    const b = await makePatient({ stats: false });
    expect(await getOwnPhone(ctx(a.id))).toBe(a.phone);

    expect(await changeOwnPhone(ctx(a.id), b.phone)).toBe(false);

    const newPhone = randomPhone();
    expect(await changeOwnPhone(ctx(a.id), newPhone)).toBe(true);
    expect(await getOwnPhone(ctx(a.id))).toBe(newPhone);
  });

  it("hapus akun tanpa persetujuan statistik: data pribadi, kunjungan, dan identitas hilang", async () => {
    const p = await makePatient({ stats: false });

    expect(await deleteOwnPatientAccount(ctx(p.id))).toBe(true);

    const user = (await admin.query("SELECT phone, email, display_name, status, deleted_at FROM users WHERE id = $1;", [p.id])).rows[0];
    expect(user.phone).toBeNull();
    expect(user.email).toBeNull();
    expect(user.display_name).toBe("Akun dihapus");
    expect(user.status).toBe("inactive");
    expect(user.deleted_at).not.toBeNull();

    expect((await admin.query("SELECT 1 FROM patient_profiles WHERE user_id = $1;", [p.id])).rowCount).toBe(0);
    expect((await admin.query("SELECT 1 FROM visits WHERE id = $1;", [p.visitId])).rowCount).toBe(0);

    const audit = await admin.query("SELECT event_type FROM audit_events WHERE actor_id = $1;", [p.id]);
    expect(audit.rows.map((r) => r.event_type)).toContain("account_deleted");
  });

  it("hapus akun dengan persetujuan statistik: kunjungan dipertahankan tanpa catatan pribadi", async () => {
    const p = await makePatient({ stats: true });

    expect(await deleteOwnPatientAccount(ctx(p.id))).toBe(true);

    const visit = (await admin.query("SELECT staff_note, consent_id FROM visits WHERE id = $1;", [p.visitId])).rows;
    expect(visit).toHaveLength(1);
    expect(visit[0].staff_note).toBeNull();
    expect(visit[0].consent_id).toBeNull();

    const conf = (await admin.query("SELECT confirmed_by_user_id FROM visit_confirmations WHERE visit_id = $1;", [p.visitId])).rows[0];
    expect(conf.confirmed_by_user_id).toBeNull();
  });

  it("hapus akun kedua kali ditolak, dan peran non-pasien tidak bisa menghapus", async () => {
    const p = await makePatient({ stats: false });
    expect(await deleteOwnPatientAccount(ctx(p.id))).toBe(true);
    expect(await deleteOwnPatientAccount(ctx(p.id))).toBe(false);

    const q = await makePatient({ stats: false });
    const asStaff = await withContext({ userId: q.id, role: "staff", facilityId: FACILITY_A }, async (tx) => {
      const res = await tx.query<{ ok: boolean }>("SELECT delete_own_patient_account() AS ok;");
      return res.rows[0].ok;
    });
    expect(asStaff).toBe(false);
  });

  it("nomor akun yang dihapus bisa dipakai lagi oleh akun baru", async () => {
    const p = await makePatient({ stats: false });
    const phone = p.phone;
    await deleteOwnPatientAccount(ctx(p.id));
    const id = crypto.randomUUID();
    await admin.query(`INSERT INTO users (id, phone, role, display_name) VALUES ($1, $2, 'patient', 'Baru');`, [id, phone]);
    created.push(id);
    expect((await admin.query("SELECT 1 FROM users WHERE phone = $1;", [phone])).rowCount).toBe(1);
  });
});
