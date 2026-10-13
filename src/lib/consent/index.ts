import crypto from "node:crypto";
import { type AppDbRole, withContext } from "../../db";
import { mapAuditFieldsToHumanLabels, recordAuditEvent } from "../audit";
import {
  isConsentSharedField,
  NEED_CATEGORIES,
} from "./constants";
import { checkScanRateLimit } from "./rate-limit";
import {
  type ConsentDuration,
  formatRemainingTime,
  formatExpiryText,
} from "./time";
import {
  buildConsentQrUrl,
  generateConsentToken,
  hashConsentToken,
  normalizeToken,
} from "./token";

export * from "./constants";
export * from "./rate-limit";
export * from "./token";
export * from "./time";
export * from "./extract-token";

export interface ConsentActor {
  userId: string;
  role: AppDbRole;
  auditSubjectId?: string | null;
  facilityId?: string | null;
}

export interface CreateConsentInput {
  facilityId: string;
  sharedFields: readonly string[];
  duration: ConsentDuration;
}

export interface CreateConsentResult {
  ok: true;
  token: string;
  qrUrl: string;
  expiresAt: string;
  consentId: string;
  qrId: string;
}

/**
 * Menghitung waktu kedaluwarsa consent berdasarkan durasi yang dipilih:
 * - 1 jam: +1 jam dari now
 * - 24 jam: +24 jam dari now
 * - hari ini: berakhir tepat pada 23:59:59.999 WIB (UTC+7) hari yang bersangkutan
 */
export function calculateConsentExpiry(
  duration: ConsentDuration,
  now: Date = new Date()
): Date {
  const norm = duration.toLowerCase().trim();
  if (norm === "1 jam" || norm === "1_hour") {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }
  if (norm === "24 jam" || norm === "24_hours") {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  if (norm === "hari ini" || norm === "today") {
    // WIB adalah UTC+7 (25.200.000 ms)
    const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);
    const y = wibDate.getUTCFullYear();
    const m = wibDate.getUTCMonth();
    const d = wibDate.getUTCDate();
    // 23:59:59.999 WIB = 16:59:59.999 UTC
    return new Date(Date.UTC(y, m, d, 23 - 7, 59, 59, 999));
  }
  throw new Error(`Durasi consent tidak valid: ${duration}`);
}

/**
 * 3a. Membuat ConsentQR baru oleh pasien (atau pendamping resmi):
 * - Memvalidasi sharedFields (tidak kosong, ⊆ konstanta field).
 * - Memastikan pasien sudah memiliki paspor dengan minimal 1 kebutuhan (kalau belum: "Simpan paspor dulu").
 * - Menghasilkan token acak 128 bit, menyimpan hash SHA-256 di consent_qr.
 * - Mencatat kejadian audit qr_created secara atomik dalam satu transaksi.
 * - Mengembalikan token, URL QR, expiresAt — satu-satunya momen token asli tersedia.
 */
export async function createConsent(
  actor: ConsentActor,
  input: CreateConsentInput,
  options?: { now?: Date }
): Promise<CreateConsentResult> {
  const now = options?.now ?? new Date();

  if (!input.sharedFields || !Array.isArray(input.sharedFields) || input.sharedFields.length === 0) {
    throw new Error("sharedFields tidak boleh kosong.");
  }

  for (const field of input.sharedFields) {
    if (!isConsentSharedField(field)) {
      throw new Error(`Field consent tidak dikenal atau tidak diizinkan: ${field}`);
    }
  }

  const expiresAt = calculateConsentExpiry(input.duration, now);

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      // 1. Cek apakah profil paspor sudah ada dan memiliki minimal satu kebutuhan
      const profileRes = await tx.query<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM patient_profiles WHERE user_id = $1;",
        [actor.userId]
      );

      if (profileRes.rows.length === 0) {
        throw new Error("Simpan paspor dulu");
      }

      const profileId = profileRes.rows[0].id;
      const needsCountRes = await tx.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM patient_profile_needs WHERE profile_id = $1;",
        [profileId]
      );

      if (needsCountRes.rows[0].count === 0) {
        throw new Error("Simpan paspor dulu");
      }

      // 2. Ambil audit_subject_id pasien untuk disimpan sebagai subject_ref
      let subjectRef = actor.auditSubjectId;
      if (!subjectRef) {
        const userRes = await tx.query<{ audit_subject_id: string }>(
          "SELECT audit_subject_id FROM users WHERE id = $1;",
          [actor.userId]
        );
        if (userRes.rows.length > 0) {
          subjectRef = userRes.rows[0].audit_subject_id;
        }
      }

      if (!subjectRef) {
        throw new Error("Gagal mengambil subjek audit pasien.");
      }

      // 3. Buat token 128 bit & hash SHA-256
      const token = generateConsentToken();
      const tokenHash = hashConsentToken(token);

      const consentId = crypto.randomUUID();
      const qrId = crypto.randomUUID();

      // 4. Simpan consents + consent_qr dalam transaksi yang sama
      await tx.query(
        `INSERT INTO consents (
           id, patient_user_id, facility_id, shared_fields, valid_from, valid_until,
           created_by_user_id, created_at, subject_ref
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $5, $8);`,
        [
          consentId,
          actor.userId,
          input.facilityId,
          [...input.sharedFields],
          now.toISOString(),
          expiresAt.toISOString(),
          actor.userId,
          subjectRef,
        ]
      );

      await tx.query(
        `INSERT INTO consent_qr (
           id, consent_id, token_hash, expires_at, created_at
         ) VALUES ($1, $2, $3, $4, $5);`,
        [qrId, consentId, tokenHash, expiresAt.toISOString(), now.toISOString()]
      );

      // 5. Catat audit qr_created
      await recordAuditEvent(tx, {
        eventType: "qr_created",
        actorId: actor.userId,
        actorRole: actor.role,
        subjectRef,
        facilityId: input.facilityId,
        occurredAt: now,
      });

      const qrUrl = buildConsentQrUrl(token);

      return {
        ok: true,
        token,
        qrUrl,
        expiresAt: expiresAt.toISOString(),
        consentId,
        qrId,
      };
    }
  );
}

/**
 * 3b. Mencabut satu ConsentQR tertentu milik pasien.
 * Hanya pemilik QR (dibatasi RLS) yang dapat mencabut.
 */
export async function revokeQr(
  actor: ConsentActor,
  qrId: string,
  options?: { now?: Date }
): Promise<{ ok: boolean; count: number }> {
  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      const updateRes = await tx.query<{
        id: string;
        consent_id: string;
      }>(
        `UPDATE consent_qr
         SET revoked_at = $1
         WHERE id = $2 AND revoked_at IS NULL
         RETURNING id, consent_id;`,
        [now.toISOString(), qrId]
      );

      if (updateRes.rows.length === 0) {
        return { ok: false, count: 0 };
      }

      const row = updateRes.rows[0];
      const consentRes = await tx.query<{
        subject_ref: string;
        facility_id: string;
      }>(
        "SELECT subject_ref, facility_id FROM consents WHERE id = $1;",
        [row.consent_id]
      );

      if (consentRes.rows.length > 0) {
        const cRow = consentRes.rows[0];
        await recordAuditEvent(tx, {
          eventType: "qr_revoked",
          actorId: actor.userId,
          actorRole: actor.role,
          subjectRef: cRow.subject_ref,
          facilityId: cRow.facility_id,
          occurredAt: now,
        });
      }

      return { ok: true, count: 1 };
    }
  );
}

/**
 * 3b. Mencabut SEMUA ConsentQR aktif milik pasien (P20).
 */
export async function revokeAllActive(
  actor: ConsentActor,
  options?: { now?: Date }
): Promise<{ ok: boolean; count: number }> {
  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      // Cari semua consent_qr aktif yang dimiliki pasien
      const activeQrRes = await tx.query<{
        qr_id: string;
        consent_id: string;
        subject_ref: string;
        facility_id: string;
      }>(
        `SELECT
           cq.id AS qr_id,
           cq.consent_id,
           c.subject_ref,
           c.facility_id
         FROM consent_qr cq
         JOIN consents c ON c.id = cq.consent_id
         WHERE c.patient_user_id = $1
           AND cq.revoked_at IS NULL
           AND cq.expires_at > $2;`,
        [actor.userId, now.toISOString()]
      );

      if (activeQrRes.rows.length === 0) {
        return { ok: true, count: 0 };
      }

      const qrIds = activeQrRes.rows.map((r) => r.qr_id);

      await tx.query(
        "UPDATE consent_qr SET revoked_at = $1 WHERE id = ANY($2);",
        [now.toISOString(), qrIds]
      );

      // Catat audit qr_revoked per QR
      for (const row of activeQrRes.rows) {
        await recordAuditEvent(tx, {
          eventType: "qr_revoked",
          actorId: actor.userId,
          actorRole: actor.role,
          subjectRef: row.subject_ref,
          facilityId: row.facility_id,
          occurredAt: now,
        });
      }

      return { ok: true, count: activeQrRes.rows.length };
    }
  );
}

export interface ScanMetadata {
  ip?: string | null;
  userAgent?: string | null;
}

export interface NeedItem {
  kode: string;
  label: string;
  ikon: string;
  kategori: string;
}

export type ScanSuccessBody = {
  ok: true;
  visitId: string;
  namaPanggilan: string;
  preferredName: string;
  kebutuhan: NeedItem[];
  catatanPasien?: string | null;
  expiresAt: string;
  expiresSoon: boolean;
};

export type ScanFailureBody = {
  ok: false;
  code: "QR_UNUSABLE";
  title: "QR Tidak Dapat Dipakai";
  message: "Minta pasien membuat ConsentQR baru.";
};

export type ScanRateLimitedBody = {
  ok: false;
  error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
};

export type ScanTokenResponse =
  | { status: 200; body: ScanSuccessBody }
  | { status: 422; body: ScanFailureBody }
  | { status: 429; body: ScanRateLimitedBody };

/**
 * Mencatat kejadian qr_scan_rejected ketika sesi petugas ditolak oleh requireSession
 * karena keanggotaan faskes atau akun petugas berstatus tidak aktif.
 */
export async function recordScanRejectedForInactiveStaff(
  claims: { userId: string; role: AppDbRole; facilityId: string | null },
  options?: { now?: Date }
): Promise<void> {
  const now = options?.now ?? new Date();
  await withContext(
    {
      userId: claims.userId,
      role: claims.role,
      facilityId: claims.facilityId,
    },
    async (tx) => {
      await recordAuditEvent(tx, {
        eventType: "qr_scan_rejected",
        actorId: claims.userId,
        actorRole: claims.role,
        subjectRef: null,
        facilityId: claims.facilityId,
        occurredAt: now,
      });
    }
  );
}

/**
 * 3c. scanToken(session petugas, rawToken, meta):
 * 1) Rate limit per petugas dan per HMAC(IP) di Postgres sebelum apa pun. Melebihi -> 429.
 * 2) Normalisasi + hash; withContext({petugas, facilityId, scanTokenHash}).
 * 3) Cek berurutan sesuai §7: QR ada, belum dicabut, belum kedaluwarsa, dalam masa berlaku, consent untuk fasilitas petugas.
 * 4) Gagal -> audit qr_scan_rejected -> SATU respons generik (422 QR_UNUSABLE).
 * 5) Lolos -> baca profil terkini, filter field dicentang, buka/reuse kunjungan, tulis qr_scanned dan profile_read.
 * Commit dulu, baru kembalikan respons. Audit gagal -> rollback transaksi, respons tanpa data profil.
 */
export async function scanToken(
  actor: ConsentActor,
  rawToken: string,
  meta?: ScanMetadata,
  options?: { now?: Date }
): Promise<ScanTokenResponse> {
  const now = options?.now ?? new Date();

  // 1. Rate limiting di Postgres
  const ip = meta?.ip?.trim() || "127.0.0.1";
  const rateLimit = await checkScanRateLimit(actor.userId, ip, { now });
  if (!rateLimit.allowed) {
    return {
      status: 429,
      body: {
        ok: false,
        error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
      },
    };
  }

  // 2. Normalisasi token
  const normalized = normalizeToken(rawToken);
  const isFormatValid = normalized !== null;

  // Jika token salah format, gunakan hash acak 64 karakter agar withContext tetap valid
  // dan jalur gagal melakukan pekerjaan setara (lookup yang menghasilkan 0 baris + audit)
  const tokenHash = isFormatValid
    ? hashConsentToken(normalized)
    : crypto.createHash("sha256").update(`invalid-token:${crypto.randomUUID()}`).digest("hex");

  // 3. withContext dengan konteks transaksi petugas
  return await withContext(
    {
      userId: actor.userId,
      role: "staff",
      facilityId: actor.facilityId,
      scanTokenHash: tokenHash,
    },
    async (tx): Promise<ScanTokenResponse> => {
      // Lookup QR dan Consent
      const qrRes = await tx.query<{
        qr_id: string;
        expires_at: Date;
        revoked_at: Date | null;
        consent_id: string;
        patient_user_id: string;
        facility_id: string;
        valid_from: Date;
        valid_until: Date;
        shared_fields: string[];
        subject_ref: string;
      }>(
        `SELECT
           cq.id AS qr_id,
           cq.expires_at,
           cq.revoked_at,
           c.id AS consent_id,
           c.patient_user_id,
           c.facility_id,
           c.valid_from,
           c.valid_until,
           c.shared_fields,
           c.subject_ref
         FROM consent_qr cq
         JOIN consents c ON c.id = cq.consent_id
         WHERE cq.token_hash = $1;`,
        [tokenHash]
      );

      const qrRow = qrRes.rows[0];
      const qrExists = Boolean(qrRow && isFormatValid);

      const isNotRevoked = qrExists && qrRow.revoked_at === null;
      const isNotExpired =
        qrExists && now.getTime() < new Date(qrRow.expires_at).getTime();
      const isInWindow =
        qrExists &&
        now.getTime() >= new Date(qrRow.valid_from).getTime() &&
        now.getTime() < new Date(qrRow.valid_until).getTime();
      const isFacilityMatch = qrExists && qrRow.facility_id === actor.facilityId;

      const isValid =
        qrExists && isNotRevoked && isNotExpired && isInWindow && isFacilityMatch;

      // 4. Jalur Gagal
      if (!isValid) {
        await recordAuditEvent(tx, {
          eventType: "qr_scan_rejected",
          actorId: actor.userId,
          actorRole: "staff",
          subjectRef: qrRow?.subject_ref ?? null,
          facilityId: actor.facilityId,
          occurredAt: now,
        });

        return {
          status: 422,
          body: {
            ok: false,
            code: "QR_UNUSABLE",
            title: "QR Tidak Dapat Dipakai",
            message: "Minta pasien membuat ConsentQR baru.",
          },
        };
      }

      // 5. Jalur Lolos
      // a. Baca profil terkini pasien
      const profileRes = await tx.query<{
        preferred_name: string;
        patient_note: string | null;
      }>(
        `SELECT preferred_name, patient_note
         FROM patient_profiles
         WHERE user_id = $1;`,
        [qrRow.patient_user_id]
      );

      if (profileRes.rows.length === 0) {
        await recordAuditEvent(tx, {
          eventType: "qr_scan_rejected",
          actorId: actor.userId,
          actorRole: "staff",
          subjectRef: qrRow.subject_ref,
          facilityId: actor.facilityId,
          occurredAt: now,
        });

        return {
          status: 422,
          body: {
            ok: false,
            code: "QR_UNUSABLE",
            title: "QR Tidak Dapat Dipakai",
            message: "Minta pasien membuat ConsentQR baru.",
          },
        };
      }

      const profileRow = profileRes.rows[0];

      // Baca kebutuhan profil
      const needsRes = await tx.query<{
        code: string;
        label: string;
        icon_name: string;
        category: string;
      }>(
        `SELECT
           nc.code,
           nc.label,
           nc.icon_name,
           nc.category
         FROM patient_profile_needs ppn
         JOIN needs_catalog nc ON nc.code = ppn.need_code
         JOIN patient_profiles pp ON pp.id = ppn.profile_id
         WHERE pp.user_id = $1
         ORDER BY nc.sort_order;`,
        [qrRow.patient_user_id]
      );

      const sharedFieldsSet = new Set(qrRow.shared_fields);

      const filteredNeeds = needsRes.rows
        .filter((n) => sharedFieldsSet.has(n.category))
        .map((n) => ({
          kode: n.code,
          label: n.label,
          ikon: n.icon_name,
          kategori: n.category,
        }));

      const includeNote = sharedFieldsSet.has("catatan_pasien");
      const patientNote = includeNote
        ? profileRow.patient_note ?? null
        : undefined;

      // b. Buka kunjungan atau gunakan kunjungan terbuka hari ini
      const existingVisitRes = await tx.query<{ id: string }>(
        `SELECT id
         FROM visits
         WHERE consent_id = $1
           AND facility_id = $2
           AND recorded_at IS NULL
           AND DATE(created_at AT TIME ZONE 'Asia/Jakarta') = DATE($3::timestamptz AT TIME ZONE 'Asia/Jakarta')
         ORDER BY created_at DESC
         LIMIT 1;`,
        [qrRow.consent_id, actor.facilityId, now.toISOString()]
      );

      let visitId: string;
      if (existingVisitRes.rows.length > 0) {
        visitId = existingVisitRes.rows[0].id;
      } else {
        const serverClientId = `srv-scan-${crypto.randomUUID()}`;
        const newVisitRes = await tx.query<{ id: string }>(
          `INSERT INTO visits (
             patient_user_id, facility_id, staff_user_id, consent_id, channel,
             client_id, created_at, recorded_at, subject_ref
           ) VALUES (
             $1, $2, $3, $4, 'qr',
             $5, $6, NULL, $7
           ) RETURNING id;`,
          [
            qrRow.patient_user_id,
            actor.facilityId,
            actor.userId,
            qrRow.consent_id,
            serverClientId,
            now.toISOString(),
            qrRow.subject_ref,
          ]
        );
        visitId = newVisitRes.rows[0].id;
      }

      // c. Catat audit qr_scanned
      await recordAuditEvent(tx, {
        eventType: "qr_scanned",
        actorId: actor.userId,
        actorRole: "staff",
        subjectRef: qrRow.subject_ref,
        facilityId: actor.facilityId,
        occurredAt: now,
      });

      // Fields yang benar-benar dikirimkan untuk dicatat di profile_read
      const deliveredAuditFields: Array<
        | "preferred_name"
        | "komunikasi"
        | "penglihatan"
        | "pendengaran"
        | "mobilitas"
        | "sensorik_lingkungan"
        | "pendampingan"
        | "catatan_pasien"
      > = ["preferred_name"];

      for (const cat of NEED_CATEGORIES) {
        if (sharedFieldsSet.has(cat)) {
          deliveredAuditFields.push(cat);
        }
      }
      if (includeNote) {
        deliveredAuditFields.push("catatan_pasien");
      }

      // Catat audit profile_read
      await recordAuditEvent(tx, {
        eventType: "profile_read",
        actorId: actor.userId,
        actorRole: "staff",
        subjectRef: qrRow.subject_ref,
        facilityId: actor.facilityId,
        fields: deliveredAuditFields,
        occurredAt: now,
      });

      // d. expiresSoon: sisa waktu < 15 menit
      const expiresAt = new Date(qrRow.expires_at);
      const expiresSoon = expiresAt.getTime() - now.getTime() < 15 * 60 * 1000;

      return {
        status: 200,
        body: {
          ok: true,
          visitId,
          namaPanggilan: profileRow.preferred_name,
          preferredName: profileRow.preferred_name,
          kebutuhan: filteredNeeds,
          ...(patientNote !== undefined ? { catatanPasien: patientNote } : {}),
          expiresAt: expiresAt.toISOString(),
          expiresSoon,
        },
      };
    }
  );
}

export type ConsentQrStatusResult =
  | { status: "not_found" }
  | {
      status: "aktif" | "dipindai" | "kedaluwarsa" | "dicabut";
      facilityName: string;
      facilityId: string;
      expiresAt: string;
      scannedAt?: string;
    };

/**
 * 3d. Mengambil status ConsentQR milik pasien:
 * Mengembalikan:
 * - not_found (bila QR tidak ada atau bukan milik pasien - dijaga RLS)
 * - dicabut (bila revoked_at tidak null)
 * - kedaluwarsa (bila waktu kedaluwarsa telah lewat)
 * - dipindai (bila terdapat baris kunjungan yang dibuka untuk consent ini)
 * - aktif (bila masih berlaku dan belum dipindai)
 */
export async function getConsentQrStatus(
  actor: ConsentActor,
  qrId: string,
  options?: { now?: Date }
): Promise<ConsentQrStatusResult> {
  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      // Lookup consent_qr JOIN consents JOIN facilities
      // Dibatasi oleh RLS app_can_manage_consent(consent_id)
      const qrRes = await tx.query<{
        qr_id: string;
        consent_id: string;
        expires_at: Date;
        revoked_at: Date | null;
        facility_id: string;
        facility_name: string;
      }>(
        `SELECT
           cq.id AS qr_id,
           cq.consent_id,
           cq.expires_at,
           cq.revoked_at,
           c.facility_id,
           f.name AS facility_name
         FROM consent_qr cq
         JOIN consents c ON c.id = cq.consent_id
         JOIN facilities f ON f.id = c.facility_id
         WHERE cq.id = $1;`,
        [qrId]
      );

      if (qrRes.rows.length === 0) {
        return { status: "not_found" };
      }

      const row = qrRes.rows[0];
      const expiresAtDate = new Date(row.expires_at);

      if (row.revoked_at !== null) {
        return {
          status: "dicabut",
          facilityName: row.facility_name,
          facilityId: row.facility_id,
          expiresAt: expiresAtDate.toISOString(),
        };
      }

      if (now.getTime() >= expiresAtDate.getTime()) {
        return {
          status: "kedaluwarsa",
          facilityName: row.facility_name,
          facilityId: row.facility_id,
          expiresAt: expiresAtDate.toISOString(),
        };
      }

      // Periksa apakah kunjungan telah dibuka oleh petugas untuk consent ini
      // Diturunkan dari kunjungan yang dibuka Prompt 7 untuk consent itu
      const visitRes = await tx.query<{
        id: string;
        created_at: Date;
      }>(
        `SELECT id, created_at
         FROM visits
         WHERE consent_id = $1
         ORDER BY created_at DESC
         LIMIT 1;`,
        [row.consent_id]
      );

      if (visitRes.rows.length > 0) {
        return {
          status: "dipindai",
          facilityName: row.facility_name,
          facilityId: row.facility_id,
          expiresAt: expiresAtDate.toISOString(),
          scannedAt: new Date(visitRes.rows[0].created_at).toISOString(),
        };
      }

      return {
        status: "aktif",
        facilityName: row.facility_name,
        facilityId: row.facility_id,
        expiresAt: expiresAtDate.toISOString(),
      };
    }
  );
}

/**
 * Mengambil shared_fields dari consent terakhir yang dibuat pasien.
 * Mengembalikan null jika pasien belum pernah membuat consent sebelumnya.
 */
export async function getLastConsentSharedFields(
  actor: ConsentActor
): Promise<string[] | null> {
  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      const res = await tx.query<{ shared_fields: string[] }>(
        `SELECT shared_fields
         FROM consents
         WHERE patient_user_id = $1
         ORDER BY created_at DESC
         LIMIT 1;`,
        [actor.userId]
      );
      return res.rows[0]?.shared_fields ?? null;
    }
  );
}

/**
 * Menghitung jumlah ConsentQR aktif milik pasien (belum dicabut dan belum kedaluwarsa).
 */
export async function countActiveConsents(
  actor: ConsentActor,
  options?: { now?: Date }
): Promise<number> {
  const now = options?.now ?? new Date();
  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      const res = await tx.query<{ count: number }>(
        `SELECT count(*)::int AS count
         FROM consent_qr cq
         JOIN consents c ON c.id = cq.consent_id
         WHERE c.patient_user_id = $1
           AND cq.revoked_at IS NULL
           AND cq.expires_at > $2;`,
        [actor.userId, now.toISOString()]
      );
      return res.rows[0]?.count ?? 0;
    }
  );
}

export interface ActiveQrItem {
  id: string;
  consentId: string;
  facilityId: string;
  facilityName: string;
  expiresAt: string;
  remainingTimeText: string;
  expiryText: string;
  sharedFields: string[];
  sharedFieldLabels: string[];
  createdAt: string;
}

/**
 * Mengambil daftar seluruh ConsentQR aktif milik pasien (P20):
 * Hanya menyertakan QR yang belum kedaluwarsa dan belum dicabut.
 */
export async function listOwnActiveQrs(
  actor: ConsentActor,
  options?: { now?: Date }
): Promise<ActiveQrItem[]> {
  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role,
    },
    async (tx) => {
      const res = await tx.query<{
        qr_id: string;
        consent_id: string;
        facility_id: string;
        facility_name: string;
        expires_at: Date;
        created_at: Date;
        shared_fields: string[];
      }>(
        `SELECT
           cq.id AS qr_id,
           cq.consent_id,
           c.facility_id,
           f.name AS facility_name,
           cq.expires_at,
           cq.created_at,
           c.shared_fields
         FROM consent_qr cq
         JOIN consents c ON c.id = cq.consent_id
         JOIN facilities f ON f.id = c.facility_id
         WHERE c.patient_user_id = $1
           AND cq.revoked_at IS NULL
           AND cq.expires_at > $2
         ORDER BY cq.created_at DESC;`,
        [actor.userId, now.toISOString()]
      );

      return res.rows.map((row) => {
        const expiresAtDate = new Date(row.expires_at);
        return {
          id: row.qr_id,
          consentId: row.consent_id,
          facilityId: row.facility_id,
          facilityName: row.facility_name,
          expiresAt: expiresAtDate.toISOString(),
          remainingTimeText: formatRemainingTime(expiresAtDate, now),
          expiryText: formatExpiryText(expiresAtDate, now),
          sharedFields: row.shared_fields || [],
          sharedFieldLabels: mapAuditFieldsToHumanLabels([
            "preferred_name",
            ...(row.shared_fields || []),
          ]),
          createdAt: new Date(row.created_at).toISOString(),
        };
      });
    }
  );
}

