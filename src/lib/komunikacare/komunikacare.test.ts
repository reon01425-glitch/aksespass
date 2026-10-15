import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { completeVisit } from "../visits";
import { KomunikaError, listMessages, sendMessage } from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101";
const STAFF_A = "22222222-2222-4222-8222-222222222301";
const STAFF_B = "22222222-2222-4222-8222-222222222303";
const FACILITY_B = "11111111-1111-4111-8111-111111111102";
const PATIENT_1 = "22222222-2222-4222-8222-222222222101";
const PATIENT_2 = "22222222-2222-4222-8222-222222222102";

const staffA = { userId: STAFF_A, role: "staff", facilityId: FACILITY_A };
const staffB = { userId: STAFF_B, role: "staff", facilityId: FACILITY_B };
const p1 = { userId: PATIENT_1, role: "patient" };
const p2 = { userId: PATIENT_2, role: "patient" };

function adminUrl(): string {
  return process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";
}

async function insertVisit() {
  const id = crypto.randomUUID();
  await withContext({ userId: STAFF_A, role: "staff", facilityId: FACILITY_A }, async (tx) => {
    await tx.query(
      `INSERT INTO visits (id, patient_user_id, facility_id, staff_user_id, channel, client_id, recorded_at)
       VALUES ($1, $2, $3, $4, 'qr', $5, now());`,
      [id, PATIENT_1, FACILITY_A, STAFF_A, `kc-${id}`]
    );
  });
  return id;
}

async function admin<T>(sql: string, params: unknown[]): Promise<T[]> {
  const c = new pg.Client({ connectionString: adminUrl() });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

describe("KomunikaCare dua perangkat (P15 <-> T7)", () => {
  it("pasien dan petugas saling melihat pesan; pihak luar tidak", async () => {
    const id = await insertVisit();
    try {
      await sendMessage(p1, { visitId: id, kind: "icon", body: "nyeri" });
      await sendMessage(staffA, { visitId: id, kind: "text", body: "  Sebelah mana? " });
      await sendMessage(p1, { visitId: id, kind: "text", body: "Perut" });

      const forStaff = await listMessages(staffA, id);
      expect(forStaff?.ended).toBe(false);
      expect(forStaff?.messages.map((m) => [m.sender, m.kind, m.body])).toEqual([
        ["patient", "icon", "nyeri"],
        ["staff", "text", "Sebelah mana?"],
        ["patient", "text", "Perut"],
      ]);
      expect((await listMessages(p1, id))?.messages).toHaveLength(3);

      expect(await listMessages(p2, id)).toBeNull();
      expect(await listMessages(staffB, id)).toBeNull();
      await expect(
        sendMessage(p2, { visitId: id, kind: "text", body: "x" })
      ).rejects.toBeInstanceOf(KomunikaError);
      await expect(
        sendMessage(staffB, { visitId: id, kind: "text", body: "x" })
      ).rejects.toBeInstanceOf(KomunikaError);
    } finally {
      await admin("DELETE FROM visits WHERE id = $1;", [id]);
    }
  });

  it("validasi: gambar hanya dari pasien dan id dikenal; teks 1–300", async () => {
    const id = await insertVisit();
    try {
      await expect(sendMessage(staffA, { visitId: id, kind: "icon", body: "nyeri" })).rejects.toMatchObject({ code: "INVALID" });
      await expect(sendMessage(p1, { visitId: id, kind: "icon", body: "ngawur" })).rejects.toMatchObject({ code: "INVALID" });
      await expect(sendMessage(p1, { visitId: id, kind: "text", body: "   " })).rejects.toMatchObject({ code: "INVALID" });
      await expect(sendMessage(p1, { visitId: id, kind: "text", body: "a".repeat(301) })).rejects.toMatchObject({ code: "INVALID" });
      await sendMessage(p1, { visitId: id, kind: "text", body: "a".repeat(300) });
    } finally {
      await admin("DELETE FROM visits WHERE id = $1;", [id]);
    }
  });

  it("selesai: pesan dihapus, percakapan ditutup, kirim baru ditolak", async () => {
    const id = await insertVisit();
    try {
      await sendMessage(p1, { visitId: id, kind: "text", body: "halo" });
      await completeVisit(staffA, { visitId: id });
      const rows = await admin<{ n: string }>(
        "SELECT count(*) AS n FROM komunikacare_messages WHERE visit_id = $1;",
        [id]
      );
      expect(Number(rows[0].n)).toBe(0);
      const list = await listMessages(p1, id);
      expect(list?.ended).toBe(true);
      expect(list?.messages).toEqual([]);
      await expect(
        sendMessage(p1, { visitId: id, kind: "text", body: "lagi" })
      ).rejects.toMatchObject({ code: "NOT_FOUND_OR_ENDED" });
    } finally {
      await admin("DELETE FROM visits WHERE id = $1;", [id]);
    }
  });

  it("isi pesan tidak masuk audit_events", async () => {
    const id = await insertVisit();
    try {
      await sendMessage(p1, { visitId: id, kind: "text", body: "rahasia-kc-xyz" });
      const rows = await admin<{ n: string }>(
        "SELECT count(*) AS n FROM audit_events a WHERE a::text LIKE '%rahasia-kc-xyz%';",
        []
      );
      expect(Number(rows[0].n)).toBe(0);
    } finally {
      await admin("DELETE FROM visits WHERE id = $1;", [id]);
    }
  });
});
