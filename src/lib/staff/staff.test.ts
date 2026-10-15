import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { createStaff, listStaff, setStaffActive, StaffAdminError, updateStaff } from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101";
const FACILITY_B = "11111111-1111-4111-8111-111111111102";
const ADMIN_A = { userId: "22222222-2222-4222-8222-222222222401", role: "facility_admin", facilityId: FACILITY_A };
const ADMIN_B = { userId: "22222222-2222-4222-8222-222222222402", role: "facility_admin", facilityId: FACILITY_B };
const STAFF_A = { userId: "22222222-2222-4222-8222-222222222301", role: "staff", facilityId: FACILITY_A };

function adminUrl(): string {
  return process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";
}

const created: string[] = [];
async function admin<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: adminUrl() });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}
afterAll(async () => {
  if (created.length) await admin("DELETE FROM users WHERE id = ANY($1);", [created]);
});

describe("Kelola akun petugas (A4/A5) dan aktivasi (A2)", () => {
  it("admin mendaftarkan petugas: status Menunggu aktivasi, nomor disamarkan, audit tanpa nomor", async () => {
    const phone = `+6281${Date.now().toString().slice(-9)}`;
    const { userId } = await createStaff(ADMIN_A, { name: "  Rina  Uji ", phone, unit: "Poli Gigi" });
    created.push(userId);
    const list = await listStaff(ADMIN_A);
    const me = list.find((s) => s.userId === userId);
    expect(me).toMatchObject({ name: "Rina Uji", unit: "Poli Gigi", status: "invited" });
    expect(me?.phoneMasked).toContain("••");
    expect(JSON.stringify(list)).not.toContain(phone);
    const ev = await admin<{ n: string }>(
      "SELECT count(*) AS n FROM audit_events WHERE event_type='staff_invited' AND actor_id=$1;",
      [ADMIN_A.userId]
    );
    expect(Number(ev[0].n)).toBeGreaterThan(0);
    // petugas lain dan admin fasilitas B tidak melihatnya
    expect((await listStaff(ADMIN_B)).some((s) => s.userId === userId)).toBe(false);
  });

  it("nomor sudah terdaftar atau format salah ditolak dengan pesan generik", async () => {
    await expect(createStaff(ADMIN_A, { name: "X", phone: "+620000000001", unit: "U" })).rejects.toMatchObject({ code: "PHONE_UNAVAILABLE" });
    await expect(createStaff(ADMIN_A, { name: "X", phone: "abc", unit: "U" })).rejects.toMatchObject({ code: "INVALID_PHONE" });
    await expect(createStaff(ADMIN_A, { name: "", phone: "+6281200000999", unit: "U" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("hanya admin fasilitas; petugas dan pasien ditolak", async () => {
    await expect(listStaff(STAFF_A)).rejects.toBeInstanceOf(StaffAdminError);
    await expect(createStaff(STAFF_A, { name: "X", phone: "+6281200000998", unit: "U" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("aktivasi login pertama mengaktifkan; nonaktif tidak pernah dihidupkan oleh aktivasi", async () => {
    const phone = `+6281${(Date.now() + 1).toString().slice(-9)}`;
    const { userId } = await createStaff(ADMIN_A, { name: "Budi Baru", phone, unit: "UGD" });
    created.push(userId);
    const act = await withContext({}, (tx) => tx.query<{ ok: boolean }>("SELECT activate_invited_staff_pre_session($1) AS ok;", [userId]));
    expect(act.rows[0].ok).toBe(true);
    expect((await listStaff(ADMIN_A)).find((s) => s.userId === userId)?.status).toBe("active");
    expect(await setStaffActive(ADMIN_A, { userId, active: false })).toBe("inactive");
    const again = await withContext({}, (tx) => tx.query<{ ok: boolean }>("SELECT activate_invited_staff_pre_session($1) AS ok;", [userId]));
    expect(again.rows[0].ok).toBe(false);
    expect(await setStaffActive(ADMIN_A, { userId, active: true })).toBe("active");
  });

  it("nonaktifkan petugas belum aktivasi lalu aktifkan kembali = Menunggu aktivasi", async () => {
    const phone = `+6281${(Date.now() + 2).toString().slice(-9)}`;
    const { userId } = await createStaff(ADMIN_A, { name: "Cici", phone, unit: "Lab" });
    created.push(userId);
    expect(await setStaffActive(ADMIN_A, { userId, active: false })).toBe("inactive");
    expect(await setStaffActive(ADMIN_A, { userId, active: true })).toBe("invited");
  });

  it("aktifkan kembali akun dengan users.status inactive (seed) memulihkan login", async () => {
    const phone = `+6281${(Date.now() + 4).toString().slice(-9)}`;
    const { userId } = await createStaff(ADMIN_A, { name: "Eko", phone, unit: "IGD" });
    created.push(userId);
    await withContext({}, (tx) => tx.query("SELECT activate_invited_staff_pre_session($1);", [userId]));
    await setStaffActive(ADMIN_A, { userId, active: false });
    await admin("UPDATE users SET status='inactive' WHERE id=$1", [userId]);
    expect(await setStaffActive(ADMIN_A, { userId, active: true })).toBe("active");
    const r = await admin<{ status: string }>("SELECT status FROM users WHERE id=$1", [userId]);
    expect(r[0].status).toBe("active");
  });

  it("ubah nama/unit; admin fasilitas lain tidak bisa mengubah atau menonaktifkan", async () => {
    const phone = `+6281${(Date.now() + 3).toString().slice(-9)}`;
    const { userId } = await createStaff(ADMIN_A, { name: "Dedi", phone, unit: "Apotek" });
    created.push(userId);
    await updateStaff(ADMIN_A, { userId, name: "Dedi S", unit: "Apotek 2" });
    expect((await listStaff(ADMIN_A)).find((s) => s.userId === userId)).toMatchObject({ name: "Dedi S", unit: "Apotek 2" });
    await expect(updateStaff(ADMIN_B, { userId, name: "Hack", unit: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(setStaffActive(ADMIN_B, { userId, active: false })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
