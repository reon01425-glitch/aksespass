/**
 * scripts/db-seed.mjs
 * Seed data sintetis deterministik dan idempoten untuk AKSESPASS.
 *
 * ============================================================================
 * DAFTAR AKUN & KREDENSIAL UJI SINTETIS (HANYA UNTUK LOKAL / PENGEMBANGAN)
 * ============================================================================
 * Seluruh data di bawah ini adalah data contoh sintetis dan bukan orang nyata.
 *
 * 1. Fasilitas:
 *    - Puskesmas Contoh A (id: 11111111-1111-4111-8111-111111111101)
 *    - Klinik Contoh B    (id: 11111111-1111-4111-8111-111111111102)
 *
 * 2. Pasien (login dengan nomor telepon contoh + OTP mode pengembangan):
 *    - Pasien Contoh 1 (Profil kebutuhan Tuli)
 *      phone: +620000000001 | user_id: 22222222-2222-4222-8222-222222222101
 *    - Pasien Contoh 2 (Profil kebutuhan autistik)
 *      phone: +620000000002 | user_id: 22222222-2222-4222-8222-222222222102
 *    - Pasien Contoh 3 (Profil kebutuhan low vision / tunanetra)
 *      phone: +620000000003 | user_id: 22222222-2222-4222-8222-222222222103
 *    - Pasien Contoh 4 (Profil kebutuhan mobilitas, tertaut pendamping aktif)
 *      phone: +620000000004 | user_id: 22222222-2222-4222-8222-222222222104
 *
 * 3. Pendamping (tertaut aktif ke Pasien Contoh 4):
 *    - Pendamping Contoh 1
 *      phone: +620000000005 | user_id: 22222222-2222-4222-8222-222222222201
 *
 * 4. Petugas & Admin Fasilitas:
 *    - Petugas Contoh Aktif A (Puskesmas Contoh A - aktif)
 *      email: petugas.aktif.a@contoh.lokal | phone: +620000000011
 *      user_id: 22222222-2222-4222-8222-222222222301
 *    - Petugas Contoh Nonaktif A (Puskesmas Contoh A - nonaktif, ditolak saat login/pindai)
 *      email: petugas.nonaktif.a@contoh.lokal | phone: +620000000012
 *      user_id: 22222222-2222-4222-8222-222222222302
 *    - Admin Fasilitas Contoh A (Puskesmas Contoh A - aktif)
 *      email: admin.a@contoh.lokal | phone: +620000000021
 *      user_id: 22222222-2222-4222-8222-222222222401
 *    - Petugas Contoh Aktif B (Klinik Contoh B - aktif)
 *      email: petugas.aktif.b@contoh.lokal | phone: +620000000013
 *      user_id: 22222222-2222-4222-8222-222222222303
 *    - Admin Fasilitas Contoh B (Klinik Contoh B - aktif)
 *      email: admin.b@contoh.lokal | phone: +620000000022
 *      user_id: 22222222-2222-4222-8222-222222222402
 *
 * 5. Kurator Aturan:
 *    - Kurator Contoh 1
 *      email: kurator@contoh.lokal | phone: +620000000031
 *      user_id: 22222222-2222-4222-8222-222222222501
 * ============================================================================
 */

import crypto from "node:crypto";
import pg from "pg";
import { resolveAdminDatabaseUrl } from "./db-reset.mjs";

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

const IDS = {
  facilities: {
    a: "11111111-1111-4111-8111-111111111101",
    b: "11111111-1111-4111-8111-111111111102",
  },
  users: {
    p1: "22222222-2222-4222-8222-222222222101",
    p2: "22222222-2222-4222-8222-222222222102",
    p3: "22222222-2222-4222-8222-222222222103",
    p4: "22222222-2222-4222-8222-222222222104",
    comp1: "22222222-2222-4222-8222-222222222201",
    staffA1: "22222222-2222-4222-8222-222222222301",
    staffA2Inactive: "22222222-2222-4222-8222-222222222302",
    staffB1: "22222222-2222-4222-8222-222222222303",
    adminA: "22222222-2222-4222-8222-222222222401",
    adminB: "22222222-2222-4222-8222-222222222402",
    curator1: "22222222-2222-4222-8222-222222222501",
  },
  auditSubjects: {
    p1: "aaaa1111-1111-4111-8111-111111111101",
    p2: "aaaa1111-1111-4111-8111-111111111102",
    p3: "aaaa1111-1111-4111-8111-111111111103",
    p4: "aaaa1111-1111-4111-8111-111111111104",
    comp1: "aaaa1111-1111-4111-8111-111111111201",
    staffA1: "aaaa1111-1111-4111-8111-111111111301",
    staffA2Inactive: "aaaa1111-1111-4111-8111-111111111302",
    staffB1: "aaaa1111-1111-4111-8111-111111111303",
    adminA: "aaaa1111-1111-4111-8111-111111111401",
    adminB: "aaaa1111-1111-4111-8111-111111111402",
    curator1: "aaaa1111-1111-4111-8111-111111111501",
  },
  profiles: {
    p1: "33333333-3333-4333-8333-333333333101",
    p2: "33333333-3333-4333-8333-333333333102",
    p3: "33333333-3333-4333-8333-333333333103",
    p4: "33333333-3333-4333-8333-333333333104",
  },
  consents: {
    c1: "44444444-4444-4444-8444-444444444101",
    c2: "44444444-4444-4444-8444-444444444102",
    c3: "44444444-4444-4444-8444-444444444103",
    c4: "44444444-4444-4444-8444-444444444104",
  },
};

async function main() {
  const { connectionString, dbName } = resolveAdminDatabaseUrl();
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      TRUNCATE TABLE
        audit_events,
        visit_confirmations,
        visits,
        companions,
        consent_qr,
        consents,
        accommodation_rules,
        patient_profile_needs,
        patient_profiles,
        needs_catalog,
        staff_memberships,
        users,
        facilities
      RESTART IDENTITY CASCADE;
    `);

    // 1. Facilities (2)
    await client.query(
      `
      INSERT INTO facilities (id, name, status, created_at, updated_at)
      VALUES
        ($1, 'Puskesmas Contoh A', 'active', '2026-07-01T08:00:00+07:00', '2026-07-01T08:00:00+07:00'),
        ($2, 'Klinik Contoh B', 'active', '2026-07-01T08:00:00+07:00', '2026-07-01T08:00:00+07:00');
      `,
      [IDS.facilities.a, IDS.facilities.b]
    );

    // 2. Users (11)
    const usersData = [
      [
        IDS.users.p1,
        "patient",
        "+620000000001",
        null,
        "Pasien Contoh 1",
        "active",
        true,
        IDS.auditSubjects.p1,
      ],
      [
        IDS.users.p2,
        "patient",
        "+620000000002",
        null,
        "Pasien Contoh 2",
        "active",
        true,
        IDS.auditSubjects.p2,
      ],
      [
        IDS.users.p3,
        "patient",
        "+620000000003",
        null,
        "Pasien Contoh 3",
        "active",
        true,
        IDS.auditSubjects.p3,
      ],
      [
        IDS.users.p4,
        "patient",
        "+620000000004",
        null,
        "Pasien Contoh 4",
        "active",
        false,
        IDS.auditSubjects.p4,
      ],
      [
        IDS.users.comp1,
        "companion",
        "+620000000005",
        null,
        "Pendamping Contoh 1",
        "active",
        false,
        IDS.auditSubjects.comp1,
      ],
      [
        IDS.users.staffA1,
        "staff",
        "+620000000011",
        "petugas.aktif.a@contoh.lokal",
        "Petugas Contoh Aktif A",
        "active",
        false,
        IDS.auditSubjects.staffA1,
      ],
      [
        IDS.users.staffA2Inactive,
        "staff",
        "+620000000012",
        "petugas.nonaktif.a@contoh.lokal",
        "Petugas Contoh Nonaktif A",
        "inactive",
        false,
        IDS.auditSubjects.staffA2Inactive,
      ],
      [
        IDS.users.staffB1,
        "staff",
        "+620000000013",
        "petugas.aktif.b@contoh.lokal",
        "Petugas Contoh Aktif B",
        "active",
        false,
        IDS.auditSubjects.staffB1,
      ],
      [
        IDS.users.adminA,
        "facility_admin",
        "+620000000021",
        "admin.a@contoh.lokal",
        "Admin Fasilitas Contoh A",
        "active",
        false,
        IDS.auditSubjects.adminA,
      ],
      [
        IDS.users.adminB,
        "facility_admin",
        "+620000000022",
        "admin.b@contoh.lokal",
        "Admin Fasilitas Contoh B",
        "active",
        false,
        IDS.auditSubjects.adminB,
      ],
      [
        IDS.users.curator1,
        "curator",
        "+620000000031",
        "kurator@contoh.lokal",
        "Kurator Contoh 1",
        "active",
        false,
        IDS.auditSubjects.curator1,
      ],
    ];

    for (const u of usersData) {
      await client.query(
        `
        INSERT INTO users (
          id, role, phone, email, display_name, status, stats_consent, audit_subject_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '2026-07-01T08:05:00+07:00', '2026-07-01T08:05:00+07:00');
        `,
        u
      );
    }

    // 3. Staff memberships (5)
    const membershipsData = [
      [
        "55555555-5555-4555-8555-555555555101",
        IDS.users.staffA1,
        IDS.facilities.a,
        "Loket Pendaftaran & Poli Umum",
        "active",
      ],
      [
        "55555555-5555-4555-8555-555555555102",
        IDS.users.staffA2Inactive,
        IDS.facilities.a,
        "Poli Umum",
        "inactive",
      ],
      [
        "55555555-5555-4555-8555-555555555103",
        IDS.users.adminA,
        IDS.facilities.a,
        "Manajemen Fasilitas",
        "active",
      ],
      [
        "55555555-5555-4555-8555-555555555104",
        IDS.users.staffB1,
        IDS.facilities.b,
        "Pendaftaran & Layanan Umum",
        "active",
      ],
      [
        "55555555-5555-4555-8555-555555555105",
        IDS.users.adminB,
        IDS.facilities.b,
        "Manajemen Klinik",
        "active",
      ],
    ];

    for (const m of membershipsData) {
      await client.query(
        `
        INSERT INTO staff_memberships (id, user_id, facility_id, unit, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, '2026-07-01T08:10:00+07:00', '2026-07-01T08:10:00+07:00');
        `,
        m
      );
    }

    // 4. Needs catalog (12 items across 6 categories)
    const catalogItems = [
      [
        "komunikasi_bisindo",
        "Komunikasi dengan BISINDO",
        "Hand",
        "komunikasi",
        1,
      ],
      [
        "komunikasi_tertulis",
        "Instruksi dan penjelasan tertulis",
        "FileText",
        "komunikasi",
        2,
      ],
      [
        "komunikasi_bicara_hadap",
        "Petugas menghadap pasien dan bicara jelas",
        "MessageSquare",
        "komunikasi",
        3,
      ],
      [
        "komunikasi_papan_gambar",
        "Bantuan papan komunikasi bergambar",
        "LayoutGrid",
        "komunikasi",
        4,
      ],
      [
        "antrean_visual_getar",
        "Panggilan giliran visual atau getar",
        "BellRing",
        "pendengaran",
        5,
      ],
      [
        "panduan_verbal",
        "Panduan lisan saat berpindah ruang",
        "Volume2",
        "penglihatan",
        6,
      ],
      [
        "teks_huruf_besar",
        "Informasi cetak atau layar berhuruf besar",
        "Type",
        "penglihatan",
        7,
      ],
      [
        "jalur_kursi_roda",
        "Jalur landai dan ruang periksa terjangkau kursi roda",
        "Accessibility",
        "mobilitas",
        8,
      ],
      [
        "bantuan_transfer",
        "Bantuan berpindah ke kursi atau meja periksa",
        "HeartHandshake",
        "mobilitas",
        9,
      ],
      [
        "lingkungan_tenang",
        "Area tunggu yang lebih tenang dan minim bising",
        "VolumeX",
        "sensorik_lingkungan",
        10,
      ],
      [
        "penjelasan_bertahap",
        "Penjelasan langkah tindakan secara bertahap dan waktu respons cukup",
        "ListChecks",
        "sensorik_lingkungan",
        11,
      ],
      [
        "pendamping_di_ruang",
        "Pendamping ikut masuk ke ruang layanan",
        "Users",
        "pendampingan",
        12,
      ],
    ];

    for (const item of catalogItems) {
      await client.query(
        `
        INSERT INTO needs_catalog (code, label, icon_name, category, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5, '2026-07-01T08:15:00+07:00');
        `,
        item
      );
    }

    // 5. Patient profiles (4) + patient_profile_needs (13)
    const profilesData = [
      [
        IDS.profiles.p1,
        IDS.users.p1,
        "Pasien Contoh 1",
        "Contoh catatan: mohon panggil giliran lewat tanda visual atau tepuk bahu pelan.",
        null,
        null,
      ],
      [
        IDS.profiles.p2,
        IDS.users.p2,
        "Pasien Contoh 2",
        "Contoh catatan: mohon beri jeda singkat sebelum pemeriksaan dimulai.",
        null,
        null,
      ],
      [
        IDS.profiles.p3,
        IDS.users.p3,
        "Pasien Contoh 3",
        "Contoh catatan: mohon sebutkan arah langkah dan posisi kursi sebelum duduk.",
        null,
        null,
      ],
      [
        IDS.profiles.p4,
        IDS.users.p4,
        "Pasien Contoh 4",
        "Contoh catatan: menggunakan kursi roda lipat, perlu ruang putar di dekat pintu.",
        IDS.users.comp1,
        "2026-09-10T10:00:00+07:00",
      ],
    ];

    for (const p of profilesData) {
      await client.query(
        `
        INSERT INTO patient_profiles (
          id, user_id, preferred_name, patient_note, last_updated_by_companion_id, last_updated_by_companion_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, '2026-07-02T09:00:00+07:00', '2026-09-10T10:00:00+07:00');
        `,
        p
      );
    }

    const profileNeedsData = [
      // Pasien Contoh 1 (Tuli)
      [IDS.profiles.p1, "komunikasi_bisindo"],
      [IDS.profiles.p1, "komunikasi_tertulis"],
      [IDS.profiles.p1, "komunikasi_bicara_hadap"],
      [IDS.profiles.p1, "antrean_visual_getar"],
      // Pasien Contoh 2 (Autistik)
      [IDS.profiles.p2, "lingkungan_tenang"],
      [IDS.profiles.p2, "penjelasan_bertahap"],
      [IDS.profiles.p2, "komunikasi_papan_gambar"],
      // Pasien Contoh 3 (Low vision / tunanetra)
      [IDS.profiles.p3, "panduan_verbal"],
      [IDS.profiles.p3, "teks_huruf_besar"],
      [IDS.profiles.p3, "pendamping_di_ruang"],
      // Pasien Contoh 4 (Mobilitas terbatas)
      [IDS.profiles.p4, "jalur_kursi_roda"],
      [IDS.profiles.p4, "bantuan_transfer"],
      [IDS.profiles.p4, "pendamping_di_ruang"],
    ];

    for (const [profileId, needCode] of profileNeedsData) {
      await client.query(
        `
        INSERT INTO patient_profile_needs (profile_id, need_code, created_at)
        VALUES ($1, $2, '2026-07-02T09:05:00+07:00');
        `,
        [profileId, needCode]
      );
    }

    // 6. Accommodation rules (12 published + 1 draft = 13)
    const rulesData = [
      [
        "66666666-6666-4666-8666-666666666101",
        "komunikasi_bisindo",
        "Gunakan frasa dasar BISINDO atau papan komunikasi; pastikan wajah dan tangan terlihat jelas.",
        "Hand",
        "Disusun bersama komunitas Tuli contoh dan tenaga kesehatan layanan primer.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666102",
        "komunikasi_tertulis",
        "Siapkan teks tertulis singkat untuk menjelaskan langkah pemeriksaan dan aturan pakai obat.",
        "FileText",
        "Mencegah salah paham instruksi layanan pada pasien yang mengutamakan teks.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666103",
        "komunikasi_bicara_hadap",
        "Hadap pasien langsung saat berbicara dan hindari berbicara sambil membelakangi pasien.",
        "MessageSquare",
        "Memudahkan pasien menangkap ekspresi wajah dan gerak bibir secara jelas.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666104",
        "komunikasi_papan_gambar",
        "Sediakan papan komunikasi bergambar agar pasien dapat menunjuk kebutuhan atau respons.",
        "LayoutGrid",
        "Mendukung komunikasi dua arah tanpa tekanan verbal.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Neurodivergen Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666105",
        "antrean_visual_getar",
        "Tampilkan nomor giliran secara visual atau hampiri pasien saat gilirannya tiba.",
        "BellRing",
        "Pasien tidak bergantung pada panggilan pengeras suara di ruang tunggu.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666106",
        "panduan_verbal",
        "Sapa pasien dengan menyebut nama dan peran Anda, lalu beri panduan lisan menuju ruang periksa.",
        "Volume2",
        "Memberikan orientasi ruang yang jelas dan aman bagi pasien low vision/tunanetra.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Tunanetra Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666107",
        "teks_huruf_besar",
        "Tunjukkan informasi dengan ukuran huruf besar dan bacakan poin utama secara jelas.",
        "Type",
        "Memudahkan keterbacaan materi informasi bagi pasien low vision.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Tunanetra Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666108",
        "jalur_kursi_roda",
        "Siapkan ruang periksa lantai dasar dengan jalur landai bebas hambatan.",
        "Accessibility",
        "Memastikan akses mandiri dan aman bagi pengguna kursi roda atau alat bantu jalan.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Mobilitas Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666109",
        "bantuan_transfer",
        "Tanyakan cara bantu yang diinginkan sebelum membantu pasien berpindah dari kursi roda.",
        "HeartHandshake",
        "Menjaga keamanan fisik dan menghormati kemandirian pasien saat berpindah posisi.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Mobilitas Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666110",
        "lingkungan_tenang",
        "Arahkan pasien ke area tunggu yang lebih tenang dan kurangi kebisingan mendadak.",
        "VolumeX",
        "Mengurangi beban sensorik berlebih selama menunggu giliran layanan.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Neurodivergen Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666111",
        "penjelasan_bertahap",
        "Jelaskan tahapan pemeriksaan satu per satu sebelum memulai dan beri waktu respons cukup.",
        "ListChecks",
        "Membantu pasien memahami urutan layanan dengan tenang tanpa terburu-buru.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Komunitas Neurodivergen Contoh & Tim Layanan Inklusif",
      ],
      [
        "66666666-6666-4666-8666-666666666112",
        "pendamping_di_ruang",
        "Izinkan pendamping resmi ikut mendampingi pasien di dalam ruang layanan.",
        "Users",
        "Mendukung kenyamanan dan kelancaran komunikasi sesuai pilihan pasien.",
        1,
        "published",
        "2026-07-01T12:00:00+07:00",
        "Tim Kurator Komunitas Contoh",
      ],
      // 1 aturan berstatus draft (tidak boleh tampil di layar petugas)
      [
        "66666666-6666-4666-8666-666666666113",
        "antrean_visual_getar",
        "Contoh aturan draft: sinkronisasi layar nomor antrean ruang tunggu otomatis (belum terbit).",
        "BellRing",
        "Draft usulan peningkatan layar antrean fasilitas.",
        2,
        "draft",
        null,
        null,
      ],
    ];

    for (const r of rulesData) {
      await client.query(
        `
        INSERT INTO accommodation_rules (
          id, trigger_need_code, action_text, icon_name, rationale, version, status, published_at, approved_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '2026-07-01T12:00:00+07:00', '2026-07-01T12:00:00+07:00');
        `,
        r
      );
    }

    // 7. Companions (1 active link: Pendamping Contoh 1 -> Pasien Contoh 4)
    await client.query(
      `
      INSERT INTO companions (
        id, patient_user_id, companion_user_id, status, requested_at, approved_at, revoked_at
      ) VALUES (
        '77777777-7777-4777-8777-777777777101',
        $1,
        $2,
        'active',
        '2026-07-05T09:00:00+07:00',
        '2026-07-05T09:15:00+07:00',
        NULL
      );
      `,
      [IDS.users.p4, IDS.users.comp1]
    );

    // 8. Consents (4) + Consent QR (4, hanya token_hash)
    const consentsData = [
      [
        IDS.consents.c1,
        IDS.users.p1,
        IDS.facilities.a,
        ["komunikasi", "pendengaran", "catatan_pasien"],
        "2026-10-13T08:00:00+07:00",
        "2026-10-14T08:00:00+07:00",
        IDS.users.p1,
      ],
      [
        IDS.consents.c2,
        IDS.users.p2,
        IDS.facilities.a,
        ["komunikasi", "sensorik_lingkungan", "catatan_pasien"],
        "2026-10-13T08:00:00+07:00",
        "2026-10-14T08:00:00+07:00",
        IDS.users.p2,
      ],
      [
        IDS.consents.c3,
        IDS.users.p3,
        IDS.facilities.b,
        ["penglihatan", "pendampingan"],
        "2026-10-13T08:00:00+07:00",
        "2026-10-14T08:00:00+07:00",
        IDS.users.p3,
      ],
      [
        IDS.consents.c4,
        IDS.users.p4,
        IDS.facilities.a,
        ["mobilitas", "pendampingan", "catatan_pasien"],
        "2026-10-13T08:00:00+07:00",
        "2026-10-14T08:00:00+07:00",
        IDS.users.comp1,
      ],
    ];

    for (const c of consentsData) {
      await client.query(
        `
        INSERT INTO consents (
          id, patient_user_id, facility_id, shared_fields, valid_from, valid_until, created_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $5);
        `,
        c
      );
    }

    const qrData = [
      [
        "88888888-8888-4888-8888-888888888101",
        IDS.consents.c1,
        sha256Hex("contoh-seed-qr-p1-aktif"),
        "2026-10-14T08:00:00+07:00",
        null,
      ],
      [
        "88888888-8888-4888-8888-888888888102",
        IDS.consents.c2,
        sha256Hex("contoh-seed-qr-p2-aktif"),
        "2026-10-14T08:00:00+07:00",
        null,
      ],
      [
        "88888888-8888-4888-8888-888888888103",
        IDS.consents.c3,
        sha256Hex("contoh-seed-qr-p3-aktif"),
        "2026-10-14T08:00:00+07:00",
        null,
      ],
      [
        "88888888-8888-4888-8888-888888888104",
        IDS.consents.c4,
        sha256Hex("contoh-seed-qr-p4-aktif"),
        "2026-10-14T08:00:00+07:00",
        null,
      ],
    ];

    for (const q of qrData) {
      await client.query(
        `
        INSERT INTO consent_qr (id, consent_id, token_hash, expires_at, revoked_at, created_at)
        VALUES ($1, $2, $3, $4, $5, '2026-10-13T08:00:00+07:00');
        `,
        q
      );
    }

    // 9. Visits (20 historical visits over the last 3 months) + Visit Confirmations (16)
    const visitsSeed = [
      // Bulan 1 (Juli–Agustus 2026)
      {
        idx: 1,
        patient: IDS.users.p1,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c1,
        channel: "qr",
        recorded: ["komunikasi_bisindo", "komunikasi_tertulis", "antrean_visual_getar"],
        note: "Contoh catatan petugas: komunikasi tertulis dan panggilan visual berjalan baik.",
        at: "2026-07-18T09:30:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "patient", byUser: IDS.users.p1 },
      },
      {
        idx: 2,
        patient: IDS.users.p2,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c2,
        channel: "qr",
        recorded: ["penjelasan_bertahap"],
        note: "Contoh catatan petugas: ruang tunggu sedang ramai.",
        at: "2026-07-22T10:15:00+07:00",
        conf: {
          status: "sebagian",
          unmet: ["lingkungan_tenang"],
          by: "patient",
          byUser: IDS.users.p2,
        },
      },
      {
        idx: 3,
        patient: IDS.users.p3,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: null,
        channel: "kartu",
        recorded: ["panduan_verbal", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: pasien dibantu panduan lisan dari loket.",
        at: "2026-07-28T11:00:00+07:00",
        conf: {
          status: "sebagian",
          unmet: ["teks_huruf_besar"],
          by: "on_site",
          byUser: IDS.users.p3,
        },
      },
      {
        idx: 4,
        patient: IDS.users.p4,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c4,
        channel: "qr",
        recorded: ["jalur_kursi_roda", "bantuan_transfer", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: ruang periksa lantai dasar siap.",
        at: "2026-08-03T09:20:00+07:00",
        conf: {
          status: "terpenuhi",
          unmet: [],
          by: "companion",
          byUser: IDS.users.comp1,
        },
      },
      {
        idx: 5,
        patient: IDS.users.p1,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c1,
        channel: "qr",
        recorded: ["komunikasi_bicara_hadap"],
        note: "Contoh catatan petugas: antrean dipanggil manual.",
        at: "2026-08-08T10:40:00+07:00",
        conf: {
          status: "belum",
          unmet: ["antrean_visual_getar", "komunikasi_tertulis"],
          by: "patient",
          byUser: IDS.users.p1,
        },
      },
      {
        idx: 6,
        patient: IDS.users.p2,
        facility: IDS.facilities.b,
        staff: IDS.users.staffB1,
        consent: null,
        channel: "qr",
        recorded: ["lingkungan_tenang", "penjelasan_bertahap", "komunikasi_papan_gambar"],
        note: "Contoh catatan petugas: diarahkan ke ruang tunggu tenang.",
        at: "2026-08-12T13:10:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "patient", byUser: IDS.users.p2 },
      },
      {
        idx: 7,
        patient: IDS.users.p3,
        facility: IDS.facilities.b,
        staff: IDS.users.staffB1,
        consent: IDS.consents.c3,
        channel: "qr",
        recorded: ["panduan_verbal", "teks_huruf_besar", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: panduan lisan diberikan sampai ruang layanan.",
        at: "2026-08-19T09:50:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "on_site", byUser: IDS.users.p3 },
      },
      // Bulan 2 (Akhir Agustus–September 2026)
      {
        idx: 8,
        patient: IDS.users.p4,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c4,
        channel: "qr",
        recorded: ["jalur_kursi_roda", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: bantuan pindah kursi belum sempat dicatat.",
        at: "2026-08-25T10:05:00+07:00",
        conf: {
          status: "sebagian",
          unmet: ["bantuan_transfer"],
          by: "companion",
          byUser: IDS.users.comp1,
        },
      },
      {
        idx: 9,
        patient: IDS.users.p1,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c1,
        channel: "qr",
        recorded: ["komunikasi_tertulis", "komunikasi_bicara_hadap", "antrean_visual_getar"],
        note: "Contoh catatan petugas: penjelasan tertulis diberikan di loket dan poli.",
        at: "2026-09-02T09:15:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "patient", byUser: IDS.users.p1 },
      },
      {
        idx: 10,
        patient: IDS.users.p2,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c2,
        channel: "qr",
        recorded: ["lingkungan_tenang", "penjelasan_bertahap"],
        note: "Contoh catatan petugas: penjelasan bertahap diterapkan.",
        at: "2026-09-06T11:20:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "patient", byUser: IDS.users.p2 },
      },
      {
        idx: 11,
        patient: IDS.users.p3,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: null,
        channel: "kartu",
        recorded: ["panduan_verbal"],
        note: "Contoh catatan petugas: cetakan huruf besar belum tersedia di loket.",
        at: "2026-09-11T14:00:00+07:00",
        conf: {
          status: "sebagian",
          unmet: ["teks_huruf_besar"],
          by: "on_site",
          byUser: IDS.users.p3,
        },
      },
      {
        idx: 12,
        patient: IDS.users.p4,
        facility: IDS.facilities.b,
        staff: IDS.users.staffB1,
        consent: null,
        channel: "qr",
        recorded: ["jalur_kursi_roda", "bantuan_transfer", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: akses kursi roda dan transfer dibantu.",
        at: "2026-09-15T10:30:00+07:00",
        conf: {
          status: "terpenuhi",
          unmet: [],
          by: "companion",
          byUser: IDS.users.comp1,
        },
      },
      {
        idx: 13,
        patient: IDS.users.p1,
        facility: IDS.facilities.b,
        staff: IDS.users.staffB1,
        consent: null,
        channel: "qr",
        recorded: ["komunikasi_tertulis"],
        note: "Contoh catatan petugas: layar antrean visual sedang perawatan.",
        at: "2026-09-20T09:45:00+07:00",
        conf: {
          status: "sebagian",
          unmet: ["antrean_visual_getar"],
          by: "patient",
          byUser: IDS.users.p1,
        },
      },
      {
        idx: 14,
        patient: IDS.users.p2,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c2,
        channel: "qr",
        recorded: ["penjelasan_bertahap"],
        note: "Contoh catatan petugas: kunjungan singkat.",
        at: "2026-09-25T13:30:00+07:00",
        conf: null, // Tanpa konfirmasi (tetap belum dikonfirmasi)
      },
      // Bulan 3 (Oktober 2026)
      {
        idx: 15,
        patient: IDS.users.p1,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c1,
        channel: "qr",
        recorded: ["komunikasi_bisindo", "komunikasi_tertulis", "antrean_visual_getar"],
        note: "Contoh catatan petugas: semua kebutuhan komunikasi disiapkan.",
        at: "2026-10-01T09:00:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "patient", byUser: IDS.users.p1 },
      },
      {
        idx: 16,
        patient: IDS.users.p3,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: null,
        channel: "qr",
        recorded: ["panduan_verbal", "teks_huruf_besar", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: lembar informasi huruf besar diberikan.",
        at: "2026-10-03T10:10:00+07:00",
        conf: { status: "terpenuhi", unmet: [], by: "patient", byUser: IDS.users.p3 },
      },
      {
        idx: 17,
        patient: IDS.users.p4,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c4,
        channel: "qr",
        recorded: ["jalur_kursi_roda", "bantuan_transfer", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: layanan poli lantai dasar.",
        at: "2026-10-06T11:00:00+07:00",
        conf: {
          status: "terpenuhi",
          unmet: [],
          by: "companion",
          byUser: IDS.users.comp1,
        },
      },
      {
        idx: 18,
        patient: IDS.users.p2,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c2,
        channel: "qr",
        recorded: ["komunikasi_papan_gambar"],
        note: "Contoh catatan petugas: antrean padat pagi hari.",
        at: "2026-10-08T09:40:00+07:00",
        conf: {
          status: "belum",
          unmet: ["lingkungan_tenang", "penjelasan_bertahap"],
          by: "patient",
          byUser: IDS.users.p2,
        },
      },
      {
        idx: 19,
        patient: IDS.users.p3,
        facility: IDS.facilities.b,
        staff: IDS.users.staffB1,
        consent: IDS.consents.c3,
        channel: "qr",
        recorded: ["panduan_verbal", "pendamping_di_ruang"],
        note: "Contoh catatan petugas: menunggu konfirmasi pasien.",
        at: "2026-10-10T14:20:00+07:00",
        conf: null, // Tanpa konfirmasi
      },
      {
        idx: 20,
        patient: IDS.users.p1,
        facility: IDS.facilities.a,
        staff: IDS.users.staffA1,
        consent: IDS.consents.c1,
        channel: "qr",
        recorded: ["komunikasi_tertulis", "antrean_visual_getar"],
        note: "Contoh catatan petugas: kunjungan contoh terbaru.",
        at: "2026-10-12T10:00:00+07:00",
        conf: null, // Tanpa konfirmasi
      },
    ];

    // Add one more confirmation to make exactly 16 confirmations out of 20 visits (4 unconfirmed)
    visitsSeed[13].conf = {
      status: "sebagian",
      unmet: ["lingkungan_tenang"],
      by: "on_site",
      byUser: IDS.users.p2,
    };
    // Let's keep visits 17, 19, 20 or let's make visits 14, 18, 19, 20 clearly accounted:
    // Currently visits with conf === null are idx 19 and idx 20; let's also set idx 11 and idx 13 or keep 4 unconfirmed visits:
    visitsSeed[10].conf = null;
    visitsSeed[12].conf = null;

    for (const v of visitsSeed) {
      const visitId = `99999999-9999-4999-8999-${String(999999999100 + v.idx)}`;
      const clientId = `seed-visit-client-${String(v.idx).padStart(2, "0")}`;

      await client.query(
        `
        INSERT INTO visits (
          id, patient_user_id, facility_id, staff_user_id, consent_id, channel,
          recorded_need_codes, staff_note, client_id, created_at, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10);
        `,
        [
          visitId,
          v.patient,
          v.facility,
          v.staff,
          v.consent,
          v.channel,
          v.recorded,
          v.note,
          clientId,
          v.at,
        ]
      );

      if (v.conf) {
        const confId = `aaaaaaaa-aaaa-4aaa-8aaa-${String(100000000100 + v.idx)}`;
        await client.query(
          `
          INSERT INTO visit_confirmations (
            id, visit_id, status, unmet_need_codes, confirmed_by, confirmed_by_user_id, confirmed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, ($7::timestamptz + interval '15 minutes'));
          `,
          [
            confId,
            visitId,
            v.conf.status,
            v.conf.unmet,
            v.conf.by,
            v.conf.byUser,
            v.at,
          ]
        );
      }
    }

    // 10. Audit events (10 contoh peristiwa deterministik, memakai audit_subject_id pasien)
    const auditSeed = [
      [
        "companion_link_requested",
        IDS.users.comp1,
        "companion",
        IDS.auditSubjects.p4,
        null,
        [],
        "2026-07-05T09:00:00+07:00",
      ],
      [
        "companion_linked",
        IDS.users.p4,
        "patient",
        IDS.auditSubjects.p4,
        null,
        [],
        "2026-07-05T09:15:00+07:00",
      ],
      [
        "profile_changed_by_companion",
        IDS.users.comp1,
        "companion",
        IDS.auditSubjects.p4,
        null,
        ["mobilitas", "pendampingan", "catatan_pasien"],
        "2026-09-10T10:00:00+07:00",
      ],
      [
        "qr_created",
        IDS.users.p1,
        "patient",
        IDS.auditSubjects.p1,
        IDS.facilities.a,
        ["komunikasi", "pendengaran", "catatan_pasien"],
        "2026-10-01T08:50:00+07:00",
      ],
      [
        "qr_scanned",
        IDS.users.staffA1,
        "staff",
        IDS.auditSubjects.p1,
        IDS.facilities.a,
        [],
        "2026-10-01T08:55:00+07:00",
      ],
      [
        "profile_read",
        IDS.users.staffA1,
        "staff",
        IDS.auditSubjects.p1,
        IDS.facilities.a,
        ["preferred_name", "komunikasi", "pendengaran", "catatan_pasien"],
        "2026-10-01T08:55:01+07:00",
      ],
      [
        "visit_recorded",
        IDS.users.staffA1,
        "staff",
        IDS.auditSubjects.p1,
        IDS.facilities.a,
        [],
        "2026-10-01T09:00:00+07:00",
      ],
      [
        "visit_confirmed",
        IDS.users.p1,
        "patient",
        IDS.auditSubjects.p1,
        IDS.facilities.a,
        [],
        "2026-10-01T09:15:00+07:00",
      ],
    ];

    for (const ev of auditSeed) {
      await client.query(
        `
        INSERT INTO audit_events (
          event_type, actor_id, actor_role, subject_ref, facility_id, fields, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
        `,
        ev
      );
    }

    await client.query("COMMIT");
    console.log(
      `[db:seed] (${dbName}) Seed sintetis berhasil dimasukkan secara deterministik.`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[db:seed] Gagal:", err.message || err);
  process.exit(1);
});
