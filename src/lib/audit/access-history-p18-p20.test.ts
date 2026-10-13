import crypto from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { type AppDbRole, withContext } from "../../db";
import { hmacSha256Hex } from "../auth/crypto";
import { getHashPepper } from "../auth/env";
import { createSessionCookieValue } from "../auth/session";
import {
  createConsent,
  listOwnActiveQrs,
  revokeAllActive,
  revokeQr,
  scanToken,
} from "../consent";
import {
  getOwnAccessHistory,
  mapAuditEventToDisplayEntry,
  mapAuditFieldsToHumanLabels,
} from "./index";
import { GET as historyRouteGet } from "../../app/api/pasien/akses/riwayat/route";
import { GET as activeQrsRouteGet } from "../../app/api/pasien/akses/qr/route";
import { POST as revokeQrRoutePost } from "../../app/api/pasien/qr/[qrId]/revoke/route";

const PATIENT_1_ID = "22222222-2222-4222-8222-222222222101"; // Pasien Contoh 1
const PATIENT_2_ID = "22222222-2222-4222-8222-222222222102"; // Pasien Contoh 2
const STAFF_A_ID = "22222222-2222-4222-8222-222222222301"; // Petugas Aktif A
const FACILITY_A_ID = "11111111-1111-4111-8111-111111111101"; // Puskesmas Contoh A

function getAdminTestDbUrl(): string {
  return (
    process.env.DATABASE_ADMIN_URL_TEST ??
    "postgresql://localhost:5432/aksespass_test"
  );
}

async function createCookieForUser(
  userId: string,
  role: "patient" | "staff" | "companion" | "facility_admin",
  facilityId: string | null = null
): Promise<string> {
  const pepper = getHashPepper();
  const sessionId = crypto.randomUUID();
  const sessHash = hmacSha256Hex(pepper, sessionId);

  await withContext({ userId, role, facilityId }, async (tx) => {
    await tx.query(
      `INSERT INTO sessions (user_id, role, session_id_hash, expires_at)
       VALUES ($1, $2, $3, now() + interval '7 days');`,
      [userId, role, sessHash]
    );
  });

  const cookieVal = await createSessionCookieValue({
    sessionId,
    userId,
    role,
    facilityId,
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    version: 1,
  });

  return `aksespass_session=${cookieVal}`;
}

describe("Prompt 12: Riwayat Akses, QR Aktif, dan Cabut (P18–P20)", () => {
  it("proacl hanya memberi EXECUTE ke aksespass_app dan pemilik; proconfig memuat search_path", async () => {
    const adminClient = new pg.Client({ connectionString: getAdminTestDbUrl() });
    await adminClient.connect();

    try {
      const res = await adminClient.query<{
        proname: string;
        prosecdef: boolean;
        proconfig: string[] | null;
        proacl: string[] | null;
      }>(`
        SELECT
          p.proname,
          p.prosecdef,
          p.proconfig,
          p.proacl::text[] AS proacl
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'get_patient_access_history';
      `);

      expect(res.rows.length).toBe(1);
      const row = res.rows[0];

      expect(row.prosecdef, "Fungsi harus SECURITY DEFINER").toBe(true);
      expect(row.proconfig, "Fungsi harus mengatur search_path eksplisit").toEqual([
        "search_path=public, pg_temp",
      ]);

      expect(row.proacl).not.toBeNull();
      const aclString = row.proacl!.join(",");
      // Hanya aksespass_app dan pemilik yang memiliki EXECUTE
      expect(aclString).toContain("aksespass_app=X");
      // Tidak boleh ada izin publik
      expect(aclString).not.toMatch(/(?:^|,)=X\//);
    } finally {
      await adminClient.end();
    }
  });

  it("pemetaan entri riwayat: tiap jenis event menghasilkan teks yang benar dan field tak dikenal tidak dicetak mentah", () => {
    // 1. qr_scanned tidak ditampilkan terpisah (menghasilkan null)
    const scannedEntry = mapAuditEventToDisplayEntry({
      occurred_at: "2026-10-13T07:35:00.000Z",
      event_type: "qr_scanned",
      actor_label: "Petugas Contoh A",
      facility_name: "Puskesmas Contoh A",
      fields: [],
    });
    expect(scannedEntry).toBeNull();

    // 2. profile_read: memuat petugas, fasilitas, dan label field manusiawi
    const profileReadEntry = mapAuditEventToDisplayEntry({
      occurred_at: "2026-10-13T07:35:00.000Z",
      event_type: "profile_read",
      actor_label: "dr. Siti",
      facility_name: "Puskesmas Contoh A",
      fields: [
        "preferred_name",
        "komunikasi",
        "mobilitas",
        "catatan_pasien",
        "field_rahasia_tak_dikenal",
      ],
    });
    expect(profileReadEntry).not.toBeNull();
    expect(profileReadEntry?.title).toBe(
      "Data dibuka oleh dr. Siti — Puskesmas Contoh A"
    );
    expect(profileReadEntry?.timeTextWib).toBe("13 Okt 2026, 14:35 WIB");
    expect(profileReadEntry?.fieldLabels).toEqual([
      "Nama panggilan",
      "Komunikasi",
      "Mobilitas",
      "Catatan",
    ]);
    // Field tak dikenal tidak boleh masuk
    expect(profileReadEntry?.fieldLabels).not.toContain("field_rahasia_tak_dikenal");

    // 3. qr_scan_rejected
    const rejectedEntry = mapAuditEventToDisplayEntry({
      occurred_at: "2026-10-13T08:00:00.000Z",
      event_type: "qr_scan_rejected",
      actor_label: "Petugas",
      facility_name: "Puskesmas Contoh A",
      fields: [],
    });
    expect(rejectedEntry?.title).toBe(
      "Percobaan pindai ditolak — Puskesmas Contoh A"
    );
    expect(rejectedEntry?.fieldLabels).toEqual([]);

    // 4. qr_created dan qr_revoked
    const createdEntry = mapAuditEventToDisplayEntry({
      occurred_at: "2026-10-13T07:00:00.000Z",
      event_type: "qr_created",
      actor_label: "Anda",
      facility_name: "Puskesmas Contoh A",
      fields: [],
    });
    expect(createdEntry?.title).toBe("Anda membuat QR untuk Puskesmas Contoh A");

    const revokedEntry = mapAuditEventToDisplayEntry({
      occurred_at: "2026-10-13T07:10:00.000Z",
      event_type: "qr_revoked",
      actor_label: "Anda",
      facility_name: "Puskesmas Contoh A",
      fields: [],
    });
    expect(revokedEntry?.title).toBe("Anda mencabut QR untuk Puskesmas Contoh A");

    // 5. Event lain menghasilkan label umum tanpa detail
    const visitConfirmedEntry = mapAuditEventToDisplayEntry({
      occurred_at: "2026-10-13T09:00:00.000Z",
      event_type: "visit_confirmed",
      actor_label: "Anda",
      facility_name: "Puskesmas Contoh A",
      fields: [],
    });
    expect(visitConfirmedEntry?.title).toBe("Konfirmasi kunjungan dikirim");
  });

  it("mapAuditFieldsToHumanLabels mengabaikan field yang tidak dikenal", () => {
    const raw = ["komunikasi", "DIAGNOSIS_UNKNOWN", "pendampingan", "secret"];
    const labels = mapAuditFieldsToHumanLabels(raw);
    expect(labels).toEqual(["Komunikasi", "Pendampingan"]);
  });

  it("isolasi riwayat: pasien A hanya melihat miliknya, pasien B tidak melihat A, non-pasien mengembalikan 0 baris", async () => {
    // 1. Buat ConsentQR untuk Pasien 1 lalu pindai sebagai Petugas A
    const created = await createConsent(
      { userId: PATIENT_1_ID, role: "patient" },
      {
        facilityId: FACILITY_A_ID,
        duration: "1 jam",
        sharedFields: ["komunikasi", "mobilitas"],
      }
    );
    expect(created.ok).toBe(true);

    const scanRes = await scanToken(
      { userId: STAFF_A_ID, role: "staff", facilityId: FACILITY_A_ID },
      created.token,
      { ip: "127.0.0.1" }
    );
    expect(scanRes.status).toBe(200);

    // 2. Pasien 1 memeriksa riwayat akses miliknya
    const p1History = await getOwnAccessHistory({
      userId: PATIENT_1_ID,
      role: "patient",
    });
    expect(p1History.length).toBeGreaterThan(0);

    const profileRead = p1History.find((e) => e.eventType === "profile_read");
    expect(profileRead).toBeDefined();
    expect(profileRead?.title).toContain("Puskesmas Contoh A");
    expect(profileRead?.fieldLabels).toContain("Komunikasi");
    expect(profileRead?.fieldLabels).toContain("Mobilitas");
    expect(profileRead?.fieldLabels).toContain("Nama panggilan");

    // Pastikan TIDAK ADA token atau nilai profil pasien pada hasil riwayat
    for (const entry of p1History) {
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain(created.token);
      expect(serialized).not.toContain("Budi"); // nilai nama panggilan
      expect(serialized).not.toContain("0812"); // nomor telepon
    }

    // 3. Pasien 2 memeriksa riwayat aksesnya sendiri -> tidak melihat event Pasien 1
    const p2History = await getOwnAccessHistory({
      userId: PATIENT_2_ID,
      role: "patient",
    });
    for (const entry of p2History) {
      expect(entry.id).not.toBe(profileRead?.id);
    }

    // 4. Konteks non-pasien (petugas, admin, pendamping) -> mengembalikan 0 baris ([])
    const staffHistory = await getOwnAccessHistory({
      userId: STAFF_A_ID,
      role: "staff" as AppDbRole,
    });
    expect(staffHistory).toEqual([]);

    const compHistory = await getOwnAccessHistory({
      userId: "22222222-2222-4222-8222-222222222201",
      role: "companion" as AppDbRole,
    });
    expect(compHistory).toEqual([]);
  });

  it("listOwnActiveQrs: tidak memuat QR kedaluwarsa, dicabut, atau milik pasien lain", async () => {
    // 1. Buat 1 QR baru untuk Pasien 1
    const qr1 = await createConsent(
      { userId: PATIENT_1_ID, role: "patient" },
      {
        facilityId: FACILITY_A_ID,
        duration: "1 jam",
        sharedFields: ["komunikasi"],
      }
    );
    expect(qr1.ok).toBe(true);

    // 2. Ambil list active QRs untuk Pasien 1
    const activeListP1 = await listOwnActiveQrs({
      userId: PATIENT_1_ID,
      role: "patient",
    });
    const foundQr1 = activeListP1.find((q) => q.id === qr1.qrId);
    expect(foundQr1).toBeDefined();
    expect(foundQr1?.facilityName).toBe("Puskesmas Contoh A");
    expect(foundQr1?.sharedFieldLabels).toContain("Komunikasi");

    // 3. Pasien 2 memeriksa QR aktif miliknya -> QR Pasien 1 tidak ada
    const activeListP2 = await listOwnActiveQrs({
      userId: PATIENT_2_ID,
      role: "patient",
    });
    const foundInP2 = activeListP2.find((q) => q.id === qr1.qrId);
    expect(foundInP2).toBeUndefined();

    // 4. Cabut qr1
    const revokeRes = await revokeQr(
      { userId: PATIENT_1_ID, role: "patient" },
      qr1.qrId
    );
    expect(revokeRes.ok).toBe(true);

    // 5. Setelah dicabut, qr1 tidak lagi muncul di listOwnActiveQrs
    const activeListAfterRevoke = await listOwnActiveQrs({
      userId: PATIENT_1_ID,
      role: "patient",
    });
    expect(activeListAfterRevoke.find((q) => q.id === qr1.qrId)).toBeUndefined();

    // 6. Non-pasien (petugas) memanggil listOwnActiveQrs -> 0 baris
    const staffList = await listOwnActiveQrs({
      userId: STAFF_A_ID,
      role: "staff" as AppDbRole,
    });
    expect(staffList).toEqual([]);
  });

  it("revokeQr dan revokeAllActive -> scanToken berikutnya ditolak (422) dan qr_revoked muncul di riwayat", async () => {
    // 1. Buat 2 ConsentQR aktif untuk Pasien 1
    const c1 = await createConsent(
      { userId: PATIENT_1_ID, role: "patient" },
      {
        facilityId: FACILITY_A_ID,
        duration: "1 jam",
        sharedFields: ["komunikasi"],
      }
    );
    const c2 = await createConsent(
      { userId: PATIENT_1_ID, role: "patient" },
      {
        facilityId: FACILITY_A_ID,
        duration: "1 jam",
        sharedFields: ["mobilitas"],
      }
    );

    // 2. Cabut semua QR aktif melalui revokeAllActive
    const revokeAllRes = await revokeAllActive({
      userId: PATIENT_1_ID,
      role: "patient",
    });
    expect(revokeAllRes.ok).toBe(true);
    expect(revokeAllRes.count).toBeGreaterThanOrEqual(2);

    // 3. Percobaan pindai berikutnya terhadap token c1 dan c2 harus ditolak (422 QR_UNUSABLE)
    const scan1 = await scanToken(
      { userId: STAFF_A_ID, role: "staff", facilityId: FACILITY_A_ID },
      c1.token,
      { ip: "127.0.0.1" }
    );
    expect(scan1.status).toBe(422);

    const scan2 = await scanToken(
      { userId: STAFF_A_ID, role: "staff", facilityId: FACILITY_A_ID },
      c2.token,
      { ip: "127.0.0.1" }
    );
    expect(scan2.status).toBe(422);

    // 4. Periksa riwayat akses Pasien 1: kejadian qr_revoked dan qr_scan_rejected harus tercatat
    const history = await getOwnAccessHistory({
      userId: PATIENT_1_ID,
      role: "patient",
    });
    const revokedEvents = history.filter((e) => e.eventType === "qr_revoked");
    expect(revokedEvents.length).toBeGreaterThanOrEqual(2);
    expect(revokedEvents[0].title).toBe("Anda mencabut QR untuk Puskesmas Contoh A");

    const rejectedEvents = history.filter((e) => e.eventType === "qr_scan_rejected");
    expect(rejectedEvents.length).toBeGreaterThanOrEqual(2);
    expect(rejectedEvents[0].title).toBe("Percobaan pindai ditolak — Puskesmas Contoh A");
  });

  it("akses silang via API: sesi Pasien 2 tidak dapat melihat atau mencabut QR Pasien 1", async () => {
    // 1. Buat ConsentQR untuk Pasien 1
    const c1 = await createConsent(
      { userId: PATIENT_1_ID, role: "patient" },
      {
        facilityId: FACILITY_A_ID,
        duration: "1 jam",
        sharedFields: ["komunikasi"],
      }
    );

    // 2. Buat sesi untuk Pasien 2
    const p2Cookie = await createCookieForUser(PATIENT_2_ID, "patient");

    // 3. Panggil GET /api/pasien/akses/qr dengan sesi Pasien 2
    const qrReq = new Request("http://localhost:3000/api/pasien/akses/qr", {
      headers: { Cookie: p2Cookie },
    });
    const qrRes = await activeQrsRouteGet(qrReq);
    expect(qrRes.status).toBe(200);
    const qrJson = await qrRes.json();
    expect(qrJson.ok).toBe(true);
    const p2QrList = qrJson.data as Array<{ id: string }>;
    expect(p2QrList.find((item) => item.id === c1.qrId)).toBeUndefined();

    // 4. Panggil GET /api/pasien/akses/riwayat dengan sesi Pasien 2
    const histReq = new Request(
      "http://localhost:3000/api/pasien/akses/riwayat",
      {
        headers: { Cookie: p2Cookie },
      }
    );
    const histRes = await historyRouteGet(histReq);
    expect(histRes.status).toBe(200);
    const histJson = await histRes.json();
    expect(histJson.ok).toBe(true);

    // 5. Coba cabut QR Pasien 1 menggunakan sesi Pasien 2 -> ditolak 404 tanpa kebocoran
    const revokeReq = new Request(
      `http://localhost:3000/api/pasien/qr/${c1.qrId}/revoke`,
      {
        method: "POST",
        headers: {
          Cookie: p2Cookie,
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
      }
    );
    const revokeRes = await revokeQrRoutePost(revokeReq, {
      params: Promise.resolve({ qrId: c1.qrId }),
    });
    expect(revokeRes.status).toBe(404);
  });
});
