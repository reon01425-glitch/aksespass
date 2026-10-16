/**
 * scripts/db-seed-dummy.mjs
 * Menambah data kunjungan SINTETIS dalam jumlah besar agar dashboard admin terisi.
 *
 * - Hanya menambah data; seed utama (pnpm db:seed) tidak diubah dan tidak dihapus.
 * - Idempoten: data dummy lama (pasien dengan nomor +6200010xxxxx) dihapus lebih dulu, lalu dibuat ulang.
 * - Wajib dijalankan SETELAH pnpm db:seed (memakai fasilitas, petugas, dan katalog kebutuhan dari seed utama).
 * - Semua pasien dummy menyetujui statistik agar lolos ambang kelompok kecil dashboard.
 * - Data deterministik (generator acak berbenih tetap) dan bukan orang nyata.
 */
import pg from "pg";
import { resolveAdminDatabaseUrl } from "./db-reset.mjs";

const FACILITY_A = "11111111-1111-4111-8111-111111111101";
const FACILITY_B = "11111111-1111-4111-8111-111111111102";
const STAFF_A = "22222222-2222-4222-8222-222222222301";
const STAFF_B = "22222222-2222-4222-8222-222222222303";

const PATIENT_COUNT = 48;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (n, w) => n.toString(16).padStart(w, "0");
const patientId = (i) => `22222222-2222-4222-8222-${hex(900000 + i, 12)}`;
const auditId = (i) => `aaaa1111-1111-4111-8111-${hex(900000 + i, 12)}`;
const visitId = (i) => `99999999-9999-4999-8999-${hex(800000 + i, 12)}`;
const confId = (i) => `aaaaaaaa-aaaa-4aaa-8aaa-${hex(800000 + i, 12)}`;
const pad = (n) => String(n).padStart(2, "0");

// Rencana per bulan: [tahun, bulan, hari terakhir, jumlah kunjungan, peluang terpenuhi]
const MONTHS = [
  [2026, 6, 30, 60, 0.38],
  [2026, 7, 31, 90, 0.46],
  [2026, 8, 31, 130, 0.56],
  [2026, 9, 30, 170, 0.64],
  [2026, 10, 15, 140, 0.72],
];

async function main() {
  const { connectionString, dbName } = resolveAdminDatabaseUrl({ allowRemote: true });
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const stf = await client.query("SELECT count(*)::int AS n FROM users WHERE id = $1", [STAFF_A]);
    if (stf.rows[0].n === 0) {
      throw new Error("Seed utama belum dijalankan. Jalankan pnpm db:seed lebih dulu.");
    }
    const codes = (await client.query("SELECT code FROM needs_catalog ORDER BY sort_order, code")).rows.map((r) => r.code);
    if (codes.length < 6) throw new Error("Katalog kebutuhan kosong. Jalankan pnpm db:seed lebih dulu.");

    await client.query("BEGIN");
    // Hapus dummy lama; kunjungan ikut terhapus lewat ON DELETE CASCADE.
    await client.query("DELETE FROM visits WHERE client_id LIKE 'dummy-visit-%'");
    await client.query("DELETE FROM users WHERE phone LIKE '+6200010%'");

    for (let i = 1; i <= PATIENT_COUNT; i++) {
      await client.query(
        `INSERT INTO users (id, role, phone, email, display_name, status, stats_consent, audit_subject_id, created_at, updated_at)
         VALUES ($1, 'patient', $2, NULL, $3, 'active', true, $4, '2026-06-01T08:00:00+07:00', '2026-06-01T08:00:00+07:00')`,
        [patientId(i), `+6200010${String(i).padStart(5, "0")}`, `Pasien Dummy ${i}`, auditId(i)]
      );
    }

    const rand = rng(20261016);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    let idx = 0;

    for (const [year, month, lastDay, count, pOk] of MONTHS) {
      for (let k = 0; k < count; k++) {
        idx++;
        const day = 1 + Math.floor(rand() * lastDay);
        const hour = 8 + Math.floor(rand() * 8);
        const minute = Math.floor(rand() * 60);
        const at = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+07:00`;
        const patient = patientId(1 + Math.floor(rand() * PATIENT_COUNT));
        const facility = rand() < 0.85 ? FACILITY_A : FACILITY_B;
        const staff = facility === FACILITY_A ? STAFF_A : STAFF_B;
        const channel = rand() < 0.8 ? "qr" : "kartu";
        const nRecorded = 1 + Math.floor(rand() * 3);
        const recorded = [...new Set(Array.from({ length: nRecorded }, () => pick(codes)))];

        await client.query(
          `INSERT INTO visits (id, patient_user_id, facility_id, staff_user_id, consent_id, channel,
             recorded_need_codes, staff_note, client_id, created_at, synced_at, recorded_at)
           VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$9,$9)`,
          [visitId(idx), patient, facility, staff, channel, recorded, "Contoh catatan dummy.", `dummy-visit-${idx}`, at]
        );

        const r = rand();
        if (r < 0.07) continue; // belum dikonfirmasi
        let status;
        if (r < 0.07 + pOk * 0.93) status = "terpenuhi";
        else status = rand() < 0.65 ? "sebagian" : "belum";
        const unmet = status === "terpenuhi" ? [] : [...new Set([pick(codes), pick(codes)])];
        const by = pick(["patient", "patient", "patient", "companion", "on_site"]);
        await client.query(
          `INSERT INTO visit_confirmations (id, visit_id, status, unmet_need_codes, confirmed_by, confirmed_by_user_id, confirmed_at)
           VALUES ($1,$2,$3,$4,$5,$6,($7::timestamptz + interval '15 minutes'))`,
          [confId(idx), visitId(idx), status, unmet, by, by === "patient" ? patient : null, at]
        );
      }
    }

    await client.query(`
      UPDATE visits v
      SET recorded_rule_ids = ARRAY(
        SELECT ar.id FROM accommodation_rules ar
        WHERE ar.trigger_need_code = ANY(v.recorded_need_codes) AND ar.status = 'published')
      WHERE v.client_id LIKE 'dummy-visit-%';
    `);

    await client.query("COMMIT");
    console.log(`[db:seed:dummy] ${PATIENT_COUNT} pasien dan ${idx} kunjungan dummy ditambahkan ke ${dbName}.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[db:seed:dummy] Gagal:", err.message || err);
  process.exit(1);
});
