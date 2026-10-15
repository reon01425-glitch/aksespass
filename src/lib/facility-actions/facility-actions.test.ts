import crypto from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withContext } from "../../db";
import { listOwnFollowUps, countOpenFollowUps } from "../careproof";
import {
  createFacilityAction,
  FacilityActionError,
  getUnmetNeeds,
  listFacilityActions,
  updateFacilityAction,
} from "./index";

const FACILITY_A = "11111111-1111-4111-8111-111111111101";
const FACILITY_B = "11111111-1111-4111-8111-111111111102";
const ADMIN_A = { userId: "22222222-2222-4222-8222-222222222401", role: "facility_admin", facilityId: FACILITY_A };
const ADMIN_B = { userId: "22222222-2222-4222-8222-222222222402", role: "facility_admin", facilityId: FACILITY_B };
const STAFF_A = { userId: "22222222-2222-4222-8222-222222222301", role: "staff", facilityId: FACILITY_A };
const PATIENT_1 = "22222222-2222-4222-8222-222222222101";
const PATIENT_2 = "22222222-2222-4222-8222-222222222102";

function adminUrl(): string {
  return process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";
}
async function sql<T>(q: string, p: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: adminUrl() });
  await c.connect();
  try {
    return (await c.query(q, p)).rows as T[];
  } finally {
    await c.end();
  }
}

let visitId = "";
let needCode = "";
let category = "";

beforeAll(async () => {
  await sql("DELETE FROM facility_actions;");
  const nc = await sql<{ code: string; category: string }>("SELECT code, category FROM needs_catalog ORDER BY sort_order LIMIT 1;");
  needCode = nc[0].code;
  category = nc[0].category;
  visitId = crypto.randomUUID();
  await withContext({ userId: STAFF_A.userId, role: "staff", facilityId: FACILITY_A }, async (tx) => {
    await tx.query(
      `INSERT INTO visits (id, patient_user_id, facility_id, staff_user_id, channel, client_id, recorded_at)
       VALUES ($1, $2, $3, $4, 'qr', $5, now());`,
      [visitId, PATIENT_1, FACILITY_A, STAFF_A.userId, `fa-${visitId}`]
    );
  });
  await sql("INSERT INTO follow_ups (visit_id, need_code) VALUES ($1, $2);", [visitId, needCode]);
});

afterAll(async () => {
  await sql("DELETE FROM visits WHERE id = $1;", [visitId]);
  await sql("DELETE FROM facility_actions;");
});

describe("Tindak lanjut fasilitas (A7/A8) dan ringkasan di P17", () => {
  it("admin membuat, hanya satu yang berjalan per kategori; admin fasilitas lain tidak melihat", async () => {
    const { id } = await createFacilityAction(ADMIN_A, { category });
    await expect(createFacilityAction(ADMIN_A, { category })).rejects.toMatchObject({ code: "ALREADY_OPEN", existingId: id });
    await expect(createFacilityAction(ADMIN_A, { category: "ngawur" })).rejects.toMatchObject({ code: "INVALID_CATEGORY" });
    expect((await listFacilityActions(ADMIN_A)).map((a) => a.id)).toContain(id);
    expect(await listFacilityActions(ADMIN_B)).toEqual([]);
    await expect(updateFacilityAction(ADMIN_B, { id, status: "selesai", stepNote: "x" })).rejects.toBeInstanceOf(FacilityActionError);
  });

  it("status dan catatan terlihat pasien pemilik laporan (P17), tidak oleh pasien lain", async () => {
    const [open] = (await listFacilityActions(ADMIN_A)).filter((a) => a.status !== "selesai");
    let items = await listOwnFollowUps({ userId: PATIENT_1, role: "patient" });
    expect(items.find((i) => i.visitId === visitId)?.status).toBe("diterima");

    await updateFacilityAction(ADMIN_A, { id: open.id, status: "dikerjakan", stepNote: "Menambah juru bahasa isyarat" });
    items = await listOwnFollowUps({ userId: PATIENT_1, role: "patient" });
    const mine = items.find((i) => i.visitId === visitId);
    expect(mine?.status).toBe("ditindaklanjuti");
    expect(mine?.stepNote).toBe("Menambah juru bahasa isyarat");
    expect(await countOpenFollowUps({ userId: PATIENT_1, role: "patient" })).toBeGreaterThan(0);

    expect(await listOwnFollowUps({ userId: PATIENT_2, role: "patient" })).toEqual([]);
    // pasien tidak bisa membaca tabel tindakan secara langsung untuk fasilitas/kategori yang tak terkait
    const direct = await withContext({ userId: PATIENT_2, role: "patient" }, (tx) => tx.query("SELECT id FROM facility_actions;"));
    expect(direct.rows).toHaveLength(0);

    await updateFacilityAction(ADMIN_A, { id: open.id, status: "selesai", stepNote: "Selesai dipasang" });
    items = await listOwnFollowUps({ userId: PATIENT_1, role: "patient" });
    expect(items.find((i) => i.visitId === visitId)?.status).toBe("selesai");
    const done = (await listFacilityActions(ADMIN_A)).find((a) => a.id === open.id);
    expect(done?.completedAt).not.toBeNull();
  });

  it("tindak lanjut selesai SEBELUM laporan dibuat tidak menutup laporan baru", async () => {
    const created = await sql<{ id: string }>(
      `INSERT INTO facility_actions (facility_id, need_category, status, completed_at, created_at, updated_at)
       VALUES ($1, $2, 'selesai', now() - interval '10 days', now() - interval '20 days', now() - interval '10 days') RETURNING id;`,
      [FACILITY_A, category === "komunikasi" ? "mobilitas" : "komunikasi"]
    );
    expect(created).toHaveLength(1);
    const items = await listOwnFollowUps({ userId: PATIENT_1, role: "patient" });
    expect(items.length).toBeGreaterThan(0);
  });

  it("hanya admin fasilitas; petugas ditolak", async () => {
    await expect(listFacilityActions(STAFF_A)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("getUnmetNeeds: enam kategori, terurut, tanpa identitas pasien", async () => {
    const r = await getUnmetNeeds(ADMIN_A);
    expect(r.rows).toHaveLength(6);
    expect(JSON.stringify(r)).not.toContain(PATIENT_1);
    const vals = r.rows.map((x) => (x.current.hidden ? -1 : x.current.value));
    expect([...vals].sort((a, b) => b - a)).toEqual(vals);
  });
});
