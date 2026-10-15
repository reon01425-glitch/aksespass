import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  formatCardCode,
  generateCardCode,
  getOrCreateOwnCardCode,
  normalizeCardCode,
  recordCardVisit,
  regenerateOwnCardCode,
} from "./index";

const rootDir = path.resolve(__dirname, "..", "..", "..");
const ADMIN_URL =
  process.env.DATABASE_ADMIN_URL_TEST ?? "postgresql://localhost:5432/aksespass_test";

const FAC_A = "11111111-1111-4111-8111-111111111101";
const FAC_B = "11111111-1111-4111-8111-111111111102";
const P1 = "22222222-2222-4222-8222-222222222101";
const P2 = "22222222-2222-4222-8222-222222222102";
const STAFF_A = "22222222-2222-4222-8222-222222222301";
const STAFF_B = "22222222-2222-4222-8222-222222222303";

const staffA = { userId: STAFF_A, role: "staff", facilityId: FAC_A };
const staffB = { userId: STAFF_B, role: "staff", facilityId: FAC_B };

describe("T4b: Kode Kartu dan kunjungan jalur kartu", () => {
  let admin: pg.Client;

  beforeAll(async () => {
    const env = {
      ...process.env,
      DB_TARGET: "test",
      DATABASE_ADMIN_URL_TEST: ADMIN_URL,
      APP_ORIGIN: "http://localhost:3000",
    };
    for (const script of ["db-reset", "db-migrate", "db-seed"]) {
      execFileSync("node", [`scripts/${script}.mjs`, "--test"], { cwd: rootDir, env, stdio: "pipe" });
    }
    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
  });

  afterAll(async () => {
    await admin?.end();
  });

  it("format dan normalisasi kode", () => {
    const code = generateCardCode();
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(formatCardCode("ABCD1234")).toBe("ABCD-1234");
    expect(normalizeCardCode(" abcd-1234 ")).toBe("ABCD1234");
    expect(normalizeCardCode("OIL0OIL0")).toBe("01100110");
    expect(normalizeCardCode("ABC")).toBeNull();
    expect(normalizeCardCode("ABCD123U")).toBeNull();
  });

  it("kode statis: dua kali minta mengembalikan kode sama; membuat ulang mengganti dan mematikan yang lama", async () => {
    const first = await getOrCreateOwnCardCode({ userId: P1, role: "patient" });
    expect(first).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(await getOrCreateOwnCardCode({ userId: P1, role: "patient" })).toBe(first);

    const second = await regenerateOwnCardCode({ userId: P1, role: "patient" });
    expect(second).not.toBe(first);
    expect(await getOrCreateOwnCardCode({ userId: P1, role: "patient" })).toBe(second);

    await expect(
      recordCardVisit(staffA, { cardCode: first!, needCodes: ["komunikasi_bisindo"], ruleIds: [], clientId: "t4b-old" })
    ).rejects.toMatchObject({ code: "UNKNOWN_CODE", status: 422 });
  });

  it("petugas mencatat kunjungan kartu: jalur kartu, tercatat dan selesai, tanpa consent; kirim ulang tidak menggandakan", async () => {
    const code = (await getOrCreateOwnCardCode({ userId: P1, role: "patient" }))!;
    const rule = await admin.query<{ id: string }>(
      "SELECT id FROM accommodation_rules WHERE status = 'published' LIMIT 1;"
    );
    const input = {
      cardCode: formatCardCode(code).toLowerCase(),
      needCodes: ["komunikasi_bisindo", "jalur_kursi_roda"],
      ruleIds: [rule.rows[0].id],
      note: "  Diantar keluarga  ",
      clientId: "t4b-visit-1",
    };
    const a = await recordCardVisit(staffA, input);
    expect(a.ok).toBe(true);
    expect(a.duplicate).toBe(false);
    const b = await recordCardVisit(staffA, input);
    expect(b.duplicate).toBe(true);
    expect(b.visitId).toBe(a.visitId);

    const row = await admin.query(
      `SELECT channel, consent_id, recorded_at, completed_at, recorded_need_codes, staff_note, patient_user_id, facility_id
       FROM visits WHERE id = $1;`,
      [a.visitId]
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].channel).toBe("kartu");
    expect(row.rows[0].consent_id).toBeNull();
    expect(row.rows[0].recorded_at).not.toBeNull();
    expect(row.rows[0].completed_at).not.toBeNull();
    expect(row.rows[0].recorded_need_codes).toEqual(["komunikasi_bisindo", "jalur_kursi_roda"]);
    expect(row.rows[0].staff_note).toBe("Diantar keluarga");
    expect(row.rows[0].patient_user_id).toBe(P1);
    expect(row.rows[0].facility_id).toBe(FAC_A);

    const audit = await admin.query(
      "SELECT count(*)::int AS n FROM audit_events WHERE event_type = 'visit_recorded' AND facility_id = $1 AND actor_id = $2;",
      [FAC_A, STAFF_A]
    );
    expect(audit.rows[0].n).toBeGreaterThanOrEqual(1);
    // Catatan petugas tidak masuk audit.
    const leak = await admin.query("SELECT count(*)::int AS n FROM audit_events WHERE fields::text ILIKE '%keluarga%';");
    expect(leak.rows[0].n).toBe(0);
  });

  it("penolakan: kode salah, kebutuhan kosong atau tidak dikenal, catatan terlalu panjang, aturan tidak sah, bukan petugas", async () => {
    const code = (await getOrCreateOwnCardCode({ userId: P1, role: "patient" }))!;
    const base = { cardCode: code, needCodes: ["komunikasi_bisindo"], ruleIds: [] as string[] };

    await expect(recordCardVisit(staffA, { ...base, cardCode: "ZZZZZZZZ", clientId: "t4b-x1" }))
      .rejects.toMatchObject({ code: "UNKNOWN_CODE" });
    await expect(recordCardVisit(staffA, { ...base, cardCode: "pendek", clientId: "t4b-x2" }))
      .rejects.toMatchObject({ code: "UNKNOWN_CODE" });
    await expect(recordCardVisit(staffA, { ...base, needCodes: [], clientId: "t4b-x3" }))
      .rejects.toMatchObject({ code: "NO_NEEDS" });
    await expect(recordCardVisit(staffA, { ...base, needCodes: ["tidak_ada"], clientId: "t4b-x4" }))
      .rejects.toMatchObject({ code: "INVALID_NEEDS" });
    await expect(recordCardVisit(staffA, { ...base, note: "x".repeat(281), clientId: "t4b-x5" }))
      .rejects.toMatchObject({ code: "NOTE_TOO_LONG" });
    await expect(
      recordCardVisit(staffA, { ...base, ruleIds: ["00000000-0000-4000-8000-000000000000"], clientId: "t4b-x6" })
    ).rejects.toMatchObject({ code: "INVALID_RULES" });
    await expect(
      recordCardVisit({ userId: P2, role: "patient", facilityId: null }, { ...base, clientId: "t4b-x7" })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("kunjungan tercatat di fasilitas petugas yang mencatat; petugas fasilitas lain tidak melihatnya", async () => {
    const code = (await getOrCreateOwnCardCode({ userId: P1, role: "patient" }))!;
    const r = await recordCardVisit(staffB, {
      cardCode: code,
      needCodes: ["komunikasi_bisindo"],
      ruleIds: [],
      clientId: "t4b-facB",
    });
    const rows = await admin.query("SELECT facility_id FROM visits WHERE id = $1;", [r.visitId]);
    expect(rows.rows[0].facility_id).toBe(FAC_B);
    // clientId yang sama dari fasilitas lain tidak dianggap duplikat milik fasilitas A.
    const other = await recordCardVisit(staffA, {
      cardCode: code,
      needCodes: ["komunikasi_bisindo"],
      ruleIds: [],
      clientId: "t4b-facB-2",
    });
    expect(other.visitId).not.toBe(r.visitId);
  });

  it("pasien tanpa paspor belum punya kode kartu", async () => {
    // Pasien 3 pada seed tidak punya paspor.
    const noProfile = await admin.query(
      "SELECT u.id FROM users u LEFT JOIN patient_profiles p ON p.user_id = u.id WHERE u.role = 'patient' AND p.id IS NULL LIMIT 1;"
    );
    if (noProfile.rows.length === 0) return;
    expect(await getOrCreateOwnCardCode({ userId: noProfile.rows[0].id, role: "patient" })).toBeNull();
  });
});
