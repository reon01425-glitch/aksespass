import crypto from "node:crypto";
import { withContext, type TransactionClient } from "../../db";
import { recordAuditEvent } from "../audit";
import { hmacSha256Hex } from "../auth/crypto";
import { getHashPepper } from "../auth/env";
import { getOwnPassportStatus } from "../passport";
import {
  countPendingConfirmationsForPatient,
  listConfirmableVisitsForPatient,
  type CompanionConfirmableVisitItem,
} from "../careproof";

export interface CompanionActor {
  userId: string;
  role: string;
  sessionId?: string;
  facilityId?: string | null;
}

export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const LINK_CODE_LENGTH = 8;
export const LINK_CODE_VALID_MS = 10 * 60 * 1000; // 10 menit
export const COMPANION_REDEEM_RATE_MAX = 5; // 5 percobaan per 10 menit
export const COMPANION_REDEEM_WINDOW_MS = 10 * 60 * 1000;

export class CompanionError extends Error {
  status: number;
  code: string;

  constructor(
    message: string,
    status: number = 400,
    code: string = "BAD_REQUEST"
  ) {
    super(message);
    this.name = "CompanionError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Memformat kode 8 karakter Crockford Base32 menjadi kelompok 4-4 (misal XXXX-XXXX).
 */
export function formatLinkCode(code: string): string {
  const clean = code.trim();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

/**
 * Menormalkan input kode tautan dari ketikan:
 * 1. Huruf besar
 * 2. Hapus spasi dan tanda hubung
 * 3. Normalisasi karakter ambigu: O -> 0, I -> 1, L -> 1
 * 4. Validasi tepat 8 karakter alfabet Crockford
 */
export function normalizeLinkCode(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let clean = raw.trim().toUpperCase();
  clean = clean.replace(/[\s\-]/g, "");
  clean = clean.replace(/O/g, "0").replace(/[IL]/g, "1");

  if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/.test(clean)) {
    return null;
  }
  return clean;
}

/**
 * Menghasilkan kode tautan acak 8 karakter Crockford Base32.
 */
export function generateLinkCode(): string {
  let result = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    const idx = crypto.randomInt(0, CROCKFORD_ALPHABET.length);
    result += CROCKFORD_ALPHABET[idx];
  }
  return result;
}

/**
 * Menghasilkan HMAC-SHA256 dari kode tautan dengan HASH_PEPPER.
 */
export function hashLinkCode(code: string): string {
  const pepper = getHashPepper();
  return hmacSha256Hex(pepper, code);
}

export interface LinkCodeResult {
  code: string;
  formattedCode: string;
  expiresAt: string;
}

/**
 * 1. Membuat kode tautan baru oleh pasien (P21):
 * - Berlaku 10 menit.
 * - Disimpan sebagai HMAC dengan HASH_PEPPER di companion_link_codes.
 * - Kode hanya dikembalikan sekali; tidak disimpan dalam bentuk asli dan tidak dicatat di log.
 */
export async function createLinkCode(
  session: CompanionActor,
  options?: { now?: Date }
): Promise<LinkCodeResult> {
  if (session.role !== "patient") {
    throw new CompanionError(
      "Hanya pasien yang dapat membuat kode tautan.",
      403,
      "FORBIDDEN"
    );
  }

  const now = options?.now ?? new Date();
  const expiresAt = new Date(now.getTime() + LINK_CODE_VALID_MS);
  const code = generateLinkCode();
  const codeHash = hashLinkCode(code);

  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      await tx.query(
        `INSERT INTO companion_link_codes (
           patient_user_id,
           code_hash,
           expires_at,
           created_at
         ) VALUES ($1, $2, $3, $4);`,
        [session.userId, codeHash, expiresAt.toISOString(), now.toISOString()]
      );

      return {
        code,
        formattedCode: formatLinkCode(code),
        expiresAt: expiresAt.toISOString(),
      };
    }
  );
}

/**
 * Memeriksa dan mencatat rate limit percobaan penukaran kode tautan di PostgreSQL.
 */
async function checkRedeemRateLimit(
  companionUserId: string,
  clientIp?: string,
  options?: { now?: Date }
): Promise<{ allowed: boolean }> {
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();
  const pepper = getHashPepper();

  const ipHash = hmacSha256Hex(pepper, (clientIp || "unknown").trim());
  const userRateKey = `companion_redeem:user:${companionUserId}`;
  const ipRateKey = `companion_redeem:ip:${ipHash}`;

  const windowStart = new Date(
    Math.floor(nowMs / COMPANION_REDEEM_WINDOW_MS) * COMPANION_REDEEM_WINDOW_MS
  ).toISOString();

  return await withContext({}, async (tx: TransactionClient) => {
    // 1. Cek per user
    const userRes = await tx.query<{ count: number }>(
      `INSERT INTO rate_limit_hits (key, window_start, count)
       VALUES ($1, $2::timestamptz, 1)
       ON CONFLICT (key, window_start)
       DO UPDATE SET count = rate_limit_hits.count + 1
       RETURNING count;`,
      [userRateKey, windowStart]
    );

    if (userRes.rows[0].count > COMPANION_REDEEM_RATE_MAX) {
      return { allowed: false };
    }

    // 2. Cek per IP
    const ipRes = await tx.query<{ count: number }>(
      `INSERT INTO rate_limit_hits (key, window_start, count)
       VALUES ($1, $2::timestamptz, 1)
       ON CONFLICT (key, window_start)
       DO UPDATE SET count = rate_limit_hits.count + 1
       RETURNING count;`,
      [ipRateKey, windowStart]
    );

    if (ipRes.rows[0].count > COMPANION_REDEEM_RATE_MAX * 3) {
      return { allowed: false };
    }

    return { allowed: true };
  });
}

export interface RedeemLinkCodeResult {
  ok: true;
  linkId: string;
}

const GENERIC_REDEEM_ERROR =
  "Kode tidak dapat dipakai. Minta kode baru ke pasien.";

/**
 * 2. Menukar kode tautan oleh pendamping (D3):
 * - Rate limit per pendamping dan per IP di Postgres.
 * - Pesan galat generik: tidak membocorkan apakah kode pernah ada.
 * - Memanggil fungsi SECURITY DEFINER redeem_companion_link_code.
 */
export async function redeemLinkCode(
  session: CompanionActor,
  rawCode: string,
  options?: { clientIp?: string; now?: Date }
): Promise<RedeemLinkCodeResult> {
  if (session.role !== "companion") {
    throw new CompanionError(
      "Hanya pendamping yang dapat menukar kode tautan.",
      403,
      "FORBIDDEN"
    );
  }

  // 1. Rate limit check
  const rateLimit = await checkRedeemRateLimit(
    session.userId,
    options?.clientIp,
    options
  );
  if (!rateLimit.allowed) {
    throw new CompanionError(
      "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
      429,
      "RATE_LIMITED"
    );
  }

  // 2. Normalisasi format kode
  const normalized = normalizeLinkCode(rawCode);
  if (!normalized) {
    throw new CompanionError(GENERIC_REDEEM_ERROR, 400, "INVALID_CODE");
  }

  const codeHash = hashLinkCode(normalized);

  // 3. Panggil fungsi SECURITY DEFINER di database
  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      let res;
      try {
        res = await tx.query<{ redeem_companion_link_code: string | null }>(
          "SELECT redeem_companion_link_code($1) AS redeem_companion_link_code;",
          [codeHash]
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("ALREADY_LINKED_ACTIVE")) {
          throw new CompanionError(
            "Anda sudah tertaut dengan pasien ini.",
            409,
            "ALREADY_LINKED"
          );
        }
        if (message.includes("ALREADY_LINKED_PENDING")) {
          throw new CompanionError(
            "Permintaan tautan ke pasien ini masih menunggu persetujuan.",
            409,
            "ALREADY_LINKED"
          );
        }
        throw err;
      }

      const linkId = res.rows[0]?.redeem_companion_link_code;
      if (!linkId) {
        throw new CompanionError(GENERIC_REDEEM_ERROR, 400, "INVALID_CODE");
      }

      return {
        ok: true,
        linkId,
      };
    }
  );
}

export interface PatientCompanionItem {
  id: string;
  companionUserId: string;
  displayName: string;
  status: "pending" | "active" | "revoked";
  requestedAt: string;
  approvedAt: string | null;
  revokedAt: string | null;
}

/**
 * 3. Membaca daftar pendamping milik pasien sendiri (P21):
 * - Mengembalikan id, display_name, status, waktu — tanpa telepon / email.
 */
export async function listOwnCompanions(
  session: CompanionActor
): Promise<PatientCompanionItem[]> {
  if (session.role !== "patient") {
    return [];
  }

  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{
        id: string;
        companion_user_id: string;
        display_name: string;
        status: "pending" | "active" | "revoked";
        requested_at: string;
        approved_at: string | null;
        revoked_at: string | null;
      }>("SELECT * FROM get_patient_companions();");

      return res.rows.map((r) => ({
        id: r.id,
        companionUserId: r.companion_user_id,
        displayName: r.display_name,
        status: r.status,
        requestedAt: new Date(r.requested_at).toISOString(),
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
        revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : null,
      }));
    }
  );
}

/**
 * 4a. Pasien menyetujui permintaan tautan pendamping (P21):
 * - status -> active + approved_at
 * - audit companion_linked
 */
export async function approveCompanionLink(
  session: CompanionActor,
  linkId: string,
  options?: { now?: Date }
): Promise<{ ok: true; status: "active" }> {
  if (session.role !== "patient") {
    throw new CompanionError(
      "Hanya pasien yang dapat menyetujui tautan pendamping.",
      403,
      "FORBIDDEN"
    );
  }

  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const updateRes = await tx.query<{
        companion_user_id: string;
        patient_subject_ref: string;
      }>(
        `UPDATE companions
         SET status = 'active',
             approved_at = $1,
             revoked_at = NULL
         WHERE id = $2 AND patient_user_id = $3 AND status = 'pending'
         RETURNING companion_user_id, patient_subject_ref;`,
        [now.toISOString(), linkId, session.userId]
      );

      if (updateRes.rows.length === 0) {
        throw new CompanionError("Tidak ada permintaan tautan yang menunggu persetujuan.", 404, "NOT_FOUND");
      }

      const row = updateRes.rows[0];

      await recordAuditEvent(tx, {
        eventType: "companion_linked",
        actorId: row.companion_user_id,
        actorRole: "companion",
        subjectRef: row.patient_subject_ref,
        occurredAt: now,
      });

      return { ok: true, status: "active" as const };
    }
  );
}

/**
 * 4b. Pasien menolak permintaan tautan pendamping (P21):
 * - status -> revoked + revoked_at
 * - audit companion_unlinked
 */
export async function rejectCompanionLink(
  session: CompanionActor,
  linkId: string,
  options?: { now?: Date }
): Promise<{ ok: true; status: "revoked" }> {
  if (session.role !== "patient") {
    throw new CompanionError(
      "Hanya pasien yang dapat menolak tautan pendamping.",
      403,
      "FORBIDDEN"
    );
  }

  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const updateRes = await tx.query<{
        companion_user_id: string;
        patient_subject_ref: string;
      }>(
        `UPDATE companions
         SET status = 'revoked',
             revoked_at = $1
         WHERE id = $2 AND patient_user_id = $3
         RETURNING companion_user_id, patient_subject_ref;`,
        [now.toISOString(), linkId, session.userId]
      );

      if (updateRes.rows.length === 0) {
        throw new CompanionError("Tautan tidak ditemukan.", 404, "NOT_FOUND");
      }

      const row = updateRes.rows[0];

      await recordAuditEvent(tx, {
        eventType: "companion_unlinked",
        actorId: row.companion_user_id,
        actorRole: "companion",
        subjectRef: row.patient_subject_ref,
        occurredAt: now,
      });

      return { ok: true, status: "revoked" as const };
    }
  );
}

/**
 * 4c. Pasien mencabut tautan pendamping aktif (P21):
 * - status -> revoked + revoked_at
 * - audit companion_unlinked
 */
export async function revokeCompanionLink(
  session: CompanionActor,
  linkId: string,
  options?: { now?: Date }
): Promise<{ ok: true; status: "revoked" }> {
  return await rejectCompanionLink(session, linkId, options);
}

export interface ActivePatientLinkItem {
  linkId: string;
  patientUserId: string;
  preferredName: string;
  passportStatus: "complete" | "empty";
  needCount: number;
  pendingConfirmationsCount: number;
}

export interface ListLinkedPatientsResult {
  activePatients: ActivePatientLinkItem[];
  /** Tautan berakhir yang belum pernah dilihat pendamping (banner tampil sekali). */
  revokedCount: number;
  /** Permintaan tautan yang masih menunggu persetujuan pasien (tanpa identitas pasien). */
  pendingCount: number;
}

/**
 * 5. Membaca daftar pasien tertaut oleh pendamping (D4):
 * - Aktif: nama panggilan, status paspor, jumlah konfirmasi menunggu.
 * - Dicabut: jumlah tautan berakhir (tanpa data pasien).
 */
export async function listLinkedPatients(
  session: CompanionActor
): Promise<ListLinkedPatientsResult> {
  if (session.role !== "companion") {
    return { activePatients: [], revokedCount: 0, pendingCount: 0 };
  }

  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      // 1. Ambil baris companions milik pendamping ini
      const companionsRes = await tx.query<{
        id: string;
        patient_user_id: string;
        status: "pending" | "active" | "revoked";
        unseen_revoked: boolean;
      }>(
        `SELECT id, patient_user_id, status,
                (status = 'revoked'
                 AND (companion_seen_revoked_at IS NULL
                      OR revoked_at > companion_seen_revoked_at)) AS unseen_revoked
         FROM companions
         WHERE companion_user_id = $1
         ORDER BY requested_at DESC;`,
        [session.userId]
      );

      let revokedCount = 0;
      let pendingCount = 0;
      const activeLinks = companionsRes.rows.filter((r) => {
        if (r.status === "revoked") {
          if (r.unseen_revoked) revokedCount += 1;
          return false;
        }
        if (r.status === "pending") pendingCount += 1;
        return r.status === "active";
      });

      if (activeLinks.length === 0) {
        return { activePatients: [], revokedCount, pendingCount };
      }

      const activePatients: ActivePatientLinkItem[] = [];

      for (const link of activeLinks) {
        const [passport, pendingConfirmationsCount] = await Promise.all([
          getOwnPassportStatus(session, link.patient_user_id),
          countPendingConfirmationsForPatient(session, link.patient_user_id),
        ]);

        activePatients.push({
          linkId: link.id,
          patientUserId: link.patient_user_id,
          preferredName: passport?.preferredName || "Pasien",
          passportStatus: passport?.status || "empty",
          needCount: passport?.needCount || 0,
          pendingConfirmationsCount,
        });
      }

      return {
        activePatients,
        revokedCount,
        pendingCount,
      };
    }
  );
}

export interface LinkedPatientDetail {
  linkId: string;
  patientUserId: string;
  preferredName: string;
  patientSubjectRef: string;
}

/**
 * 6. Mengambil detail pasien tertaut berdasarkan ID tautan (untuk rute per pasien D5/D6/D8).
 */
export async function getLinkedPatientByLinkId(
  session: CompanionActor,
  linkId: string
): Promise<LinkedPatientDetail> {
  if (session.role !== "companion") {
    throw new CompanionError(
      "Hanya pendamping yang dapat membuka tautan ini.",
      403,
      "FORBIDDEN"
    );
  }

  const link = await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const linkRes = await tx.query<{
        id: string;
        patient_user_id: string;
        status: string;
        patient_subject_ref: string;
      }>(
        `SELECT id, patient_user_id, status, patient_subject_ref
         FROM companions
         WHERE id = $1 AND companion_user_id = $2;`,
        [linkId, session.userId]
      );

      if (linkRes.rows.length === 0 || linkRes.rows[0].status !== "active") {
        throw new CompanionError(
          "Tautan pendamping tidak ditemukan atau sudah berakhir.",
          404,
          "NOT_FOUND"
        );
      }

      return linkRes.rows[0];
    }
  );

  const passport = await getOwnPassportStatus(session, link.patient_user_id);
  const preferredName = passport?.preferredName || "Pasien";

  return {
    linkId: link.id,
    patientUserId: link.patient_user_id,
    preferredName,
    patientSubjectRef: link.patient_subject_ref,
  };
}

export type { CompanionConfirmableVisitItem };

/**
 * 7. Membaca daftar kunjungan pasien tertaut untuk konfirmasi CareProof pendamping (D8).
 */
export async function listPatientConfirmationsForCompanion(
  session: CompanionActor,
  linkId: string
): Promise<{
  patient: LinkedPatientDetail;
  visits: CompanionConfirmableVisitItem[];
}> {
  const patient = await getLinkedPatientByLinkId(session, linkId);
  const visits = await listConfirmableVisitsForPatient(
    session,
    patient.patientUserId
  );
  return { patient, visits };
}

/**
 * 8. Mengambil satu kunjungan pasien tertaut untuk konfirmasi oleh pendamping.
 */
export async function getPatientConfirmableVisitForCompanion(
  session: CompanionActor,
  linkId: string,
  visitId: string
): Promise<{
  patient: LinkedPatientDetail;
  visit: CompanionConfirmableVisitItem;
}> {
  const { patient, visits } = await listPatientConfirmationsForCompanion(
    session,
    linkId
  );
  const found = visits.find((v) => v.visitId === visitId);
  if (!found) {
    throw new CompanionError("Kunjungan tidak ditemukan.", 404, "NOT_FOUND");
  }
  return { patient, visit: found };
}

/** Menandai tautan berakhir sebagai sudah dilihat pendamping, agar banner D4 tidak muncul lagi. */
export async function markRevokedLinksSeen(
  session: CompanionActor
): Promise<number> {
  if (session.role !== "companion") return 0;
  return await withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{ n: number }>(
        "SELECT mark_revoked_links_seen() AS n;"
      );
      return res.rows[0]?.n ?? 0;
    }
  );
}
