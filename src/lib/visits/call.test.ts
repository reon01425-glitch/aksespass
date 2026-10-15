import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { confirmVisit, listOwnFollowUps, countOpenFollowUps } from "../careproof";
import { callPatient, completeVisit, getOwnWaitingState, VisitActionError } from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101";
const STAFF_A = "22222222-2222-4222-8222-222222222301";
const STAFF_B = "22222222-2222-4222-8222-222222222303";
const FACILITY_B = "11111111-1111-4111-8111-111111111102";
const PATIENT_1 = "22222222-2222-4222-8222-222222222101";
const PATIENT_2 = "22222222-2222-4222-8222-222222222102";

function adminUrl(): string {
  return process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";
}

async function insertVisit(opts: { recorded: boolean; patient?: string }) {
  const id = crypto.randomUUID();
  await withContext(
    { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
    async (tx) => {
      await tx.query(
        `INSERT INTO visits (id, patient_user_id, facility_id, staff_user_id, channel, client_id, recorded_at)
         VALUES ($1, $2, $3, $4, 'qr', $5, ${opts.recorded ? "now()" : "NULL"});`,
        [id, opts.patient ?? PATIENT_1, FACILITY_A, STAFF_A, `call-${id}`]
      );
    }
  );
  return id;
}

async function cleanup(ids: string[]) {
  const admin = new pg.Client({ connectionString: adminUrl() });
  await admin.connect();
  try {
    await admin.query("DELETE FROM visits WHERE id = ANY($1);", [ids]);
  } finally {
    await admin.end();
  }
}

describe("Panggilan pasien (P13/P14) dan tindak lanjut (P17)", () => {
  it("petugas memanggil; pasien melihat menunggu -> dipanggil -> dilayani; pasien lain tidak melihat", async () => {
    const id = await insertVisit({ recorded: false });
    try {
      const patient = { userId: PATIENT_1, role: "patient" };
      expect((await getOwnWaitingState(patient, id))?.phase).toBe("menunggu");

      const res = await callPatient(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        { visitId: id, room: "  Ruang Periksa 2 " }
      );
      expect(res.room).toBe("Ruang Periksa 2");

      const called = await getOwnWaitingState(patient, id);
      expect(called?.phase).toBe("dipanggil");
      expect(called?.room).toBe("Ruang Periksa 2");

      // pasien lain tidak melihat kunjungan ini
      expect(await getOwnWaitingState({ userId: PATIENT_2, role: "patient" }, id)).toBeNull();
      expect(await getOwnWaitingState({ userId: STAFF_A, role: "staff" }, id)).toBeNull();
      // id bukan UUID ditolak tanpa mengenai database
      expect(await getOwnWaitingState(patient, "bukan-uuid")).toBeNull();

      // Bantuan dicatat saja belum cukup; pasien baru dialihkan setelah petugas menekan Selesai.
      await withContext(
        { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
        async (tx) => {
          await tx.query("UPDATE visits SET recorded_at = now() WHERE id = $1;", [id]);
        }
      );
      expect((await getOwnWaitingState(patient, id))?.phase).toBe("dipanggil");

      const staffA = { userId: STAFF_A, role: "staff", facilityId: FACILITY_A };
      const done = await completeVisit(staffA, { visitId: id });
      expect((await getOwnWaitingState(patient, id))?.phase).toBe("dilayani");
      // idempoten: waktu selesai pertama dipertahankan
      const again = await completeVisit(staffA, { visitId: id }, { now: new Date(Date.now() + 60000) });
      expect(again.completedAt).toBe(done.completedAt);
    } finally {
      await cleanup([id]);
    }
  });

  it("selesai ditolak bila bantuan belum dicatat, untuk fasilitas lain, atau oleh pasien", async () => {
    const id = await insertVisit({ recorded: false });
    try {
      await expect(
        completeVisit({ userId: STAFF_A, role: "staff", facilityId: FACILITY_A }, { visitId: id })
      ).rejects.toMatchObject({ status: 404 });
      await withContext({ userId: STAFF_A, role: "staff", facilityId: FACILITY_A }, async (tx) => {
        await tx.query("UPDATE visits SET recorded_at = now() WHERE id = $1;", [id]);
      });
      await expect(
        completeVisit({ userId: STAFF_B, role: "staff", facilityId: FACILITY_B }, { visitId: id })
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        completeVisit({ userId: PATIENT_1, role: "patient" }, { visitId: id })
      ).rejects.toMatchObject({ status: 403 });
    } finally {
      await cleanup([id]);
    }
  });

  it("petugas fasilitas lain dan pasien tidak bisa memanggil; ruangan terlalu panjang ditolak", async () => {
    const id = await insertVisit({ recorded: false });
    try {
      await expect(
        callPatient({ userId: STAFF_B, role: "staff", facilityId: FACILITY_B }, { visitId: id })
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        callPatient({ userId: PATIENT_1, role: "patient" }, { visitId: id })
      ).rejects.toBeInstanceOf(VisitActionError);
      await expect(
        callPatient(
          { userId: STAFF_A, role: "staff", facilityId: FACILITY_A },
          { visitId: id, room: "x".repeat(41) }
        )
      ).rejects.toMatchObject({ code: "ROOM_TOO_LONG" });
    } finally {
      await cleanup([id]);
    }
  });

  it("konfirmasi sebagian/belum membuat tindak lanjut 'diterima'; mengubah jawaban menyinkronkan; terpenuhi menghapus", async () => {
    const id = await insertVisit({ recorded: true });
    const admin = new pg.Client({ connectionString: adminUrl() });
    await admin.connect();
    try {
      const codes = (
        await admin.query<{ code: string }>("SELECT code FROM needs_catalog ORDER BY sort_order LIMIT 3;")
      ).rows.map((r) => r.code);
      const patient = { userId: PATIENT_1, role: "patient" as const };

      await confirmVisit(patient, id, { status: "belum", unmetNeedCodes: [codes[0], codes[1]] });
      let items = await listOwnFollowUps(patient, { visitId: id });
      expect(items.map((i) => i.needCode).sort()).toEqual([codes[0], codes[1]].sort());
      expect(items.every((i) => i.status === "diterima")).toBe(true);
      expect(await countOpenFollowUps(patient)).toBeGreaterThanOrEqual(2);

      // jawaban diubah: satu kebutuhan lepas, satu baru
      await confirmVisit(patient, id, { status: "sebagian", unmetNeedCodes: [codes[1], codes[2]] });
      items = await listOwnFollowUps(patient, { visitId: id });
      expect(items.map((i) => i.needCode).sort()).toEqual([codes[1], codes[2]].sort());

      // status lain (diubah di luar aplikasi) tidak dihapus oleh jawaban berikutnya
      await admin.query(
        "UPDATE follow_ups SET status = 'ditindaklanjuti', updated_at = now() WHERE visit_id = $1 AND need_code = $2;",
        [id, codes[1]]
      );
      await confirmVisit(patient, id, { status: "terpenuhi" });
      items = await listOwnFollowUps(patient, { visitId: id });
      expect(items.map((i) => [i.needCode, i.status])).toEqual([[codes[1], "ditindaklanjuti"]]);

      // pasien lain tidak melihat tindak lanjut ini
      expect(await listOwnFollowUps({ userId: PATIENT_2, role: "patient" }, { visitId: id })).toEqual([]);
    } finally {
      await admin.end();
      await cleanup([id]);
    }
  });

  it("aplikasi tidak boleh mengubah status tindak lanjut (tanpa grant UPDATE)", async () => {
    const id = await insertVisit({ recorded: true });
    const admin = new pg.Client({ connectionString: adminUrl() });
    await admin.connect();
    try {
      const code = (await admin.query<{ code: string }>("SELECT code FROM needs_catalog LIMIT 1;")).rows[0].code;
      await confirmVisit({ userId: PATIENT_1, role: "patient" }, id, { status: "belum", unmetNeedCodes: [code] });
      await expect(
        withContext({ userId: PATIENT_1, role: "patient" }, async (tx) => {
          await tx.query("UPDATE follow_ups SET status = 'selesai' WHERE visit_id = $1;", [id]);
        })
      ).rejects.toThrow();
    } finally {
      await admin.end();
      await cleanup([id]);
    }
  });
});
