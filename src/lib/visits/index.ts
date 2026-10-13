import { withContext } from "../../db";
import type { SessionClaims } from "../auth";

export * from "./format";
import { formatVisitTimeWIB, mapVisitStatus, type TodayVisit } from "./format";

export interface VisitSessionParam {
  userId: string;
  role: string;
  facilityId?: string | null;
}

/**
 * Mengambil daftar kunjungan fasilitas tempat petugas bertugas hari ini (WIB),
 * diurutkan terbaru di atas.
 *
 * Batasan privasi & arsitektur:
 * 1. Tidak memuat patient_user_id, nomor telepon, nama panggilan, atau nilai profil apapun.
 * 2. Hanya membaca kunjungan pada fasilitas petugas yang cocok (terisolasi via RLS & klausa WHERE).
 */
export async function listTodayVisits(
  session: VisitSessionParam | SessionClaims,
  options?: { now?: Date }
): Promise<TodayVisit[]> {
  if (session.role !== "staff" || !session.facilityId) {
    return [];
  }

  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: session.userId,
      role: "staff",
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{
        id: string;
        created_at: string;
        recorded_at: string | null;
        confirmation_status: "terpenuhi" | "sebagian" | "belum" | null;
        confirmed_by: "patient" | "companion" | "on_site" | null;
      }>(
        `SELECT
           v.id,
           v.created_at,
           v.recorded_at,
           vc.status AS confirmation_status,
           vc.confirmed_by
         FROM visits v
         LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
         WHERE v.facility_id = $1
           AND DATE(v.created_at AT TIME ZONE 'Asia/Jakarta') = DATE($2::timestamptz AT TIME ZONE 'Asia/Jakarta')
         ORDER BY v.created_at DESC;`,
        [session.facilityId, now.toISOString()]
      );

      return res.rows.map((row) => {
        const createdAt = new Date(row.created_at);
        const time = formatVisitTimeWIB(createdAt);
        const shortRef = row.id.replace(/-/g, "").slice(-4).toUpperCase();
        const mapped = mapVisitStatus(
          row.recorded_at,
          row.confirmation_status,
          row.confirmed_by
        );

        return {
          id: row.id,
          shortRef,
          time,
          statusCode: mapped.statusCode,
          statusText: mapped.statusText,
          iconName: mapped.iconName,
          ...(row.confirmation_status && row.confirmed_by
            ? {
                confirmation: {
                  status: row.confirmation_status,
                  confirmedBy: row.confirmed_by,
                },
              }
            : {}),
        };
      });
    }
  );
}

export class VisitActionError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 400, code: string = "BAD_REQUEST") {
    super(message);
    this.name = "VisitActionError";
    this.status = status;
    this.code = code;
  }
}

export interface RecordAssistanceInput {
  visitId: string;
  ruleIds: string[];
  note?: string | null;
}

export interface RecordAssistanceResult {
  ok: true;
  visitId: string;
  recordedAt: string;
}

/**
 * Mencatat bantuan yang diberikan oleh petugas pada kunjungan (T8):
 * - Kunjungan harus milik fasilitas petugas (terisolasi via RLS & WHERE facility_id).
 * - Kunjungan belum dicatat; jika sudah dicatat -> 409 "Kunjungan ini sudah dicatat".
 * - ruleIds harus merupakan aturan yang berstatus 'published'.
 * - Catatan opsional divalidasi batas panjang STAFF_NOTE_MAX_LENGTH (280 karakter); melebihi -> ditolak.
 * - Mengupdate baris kunjungan yang sama (idempoten / no duplicate).
 * - Menulis audit event 'visit_recorded' (pelaku petugas, subject_ref dari visits, fasilitas; tanpa catatan).
 */
export async function recordAssistance(
  session: VisitSessionParam | SessionClaims,
  input: RecordAssistanceInput,
  options?: { now?: Date }
): Promise<RecordAssistanceResult> {
  if (session.role !== "staff" || !session.facilityId) {
    throw new VisitActionError(
      "Hanya petugas fasilitas yang dapat mencatat bantuan",
      403,
      "FORBIDDEN"
    );
  }

  const trimmedNote =
    input.note !== undefined && input.note !== null ? input.note.trim() : null;

  // Batas panjang CHECK di DB
  if (trimmedNote && trimmedNote.length > 280) {
    throw new VisitActionError(
      "Catatan petugas melebihi batas maksimum 280 karakter",
      400,
      "NOTE_TOO_LONG"
    );
  }

  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: session.userId,
      role: "staff",
      facilityId: session.facilityId,
    },
    async (tx) => {
      // 1. Periksa kunjungan di fasilitas petugas
      const visitRes = await tx.query<{
        id: string;
        facility_id: string;
        recorded_at: string | null;
        subject_ref: string;
      }>(
        `SELECT id, facility_id, recorded_at, subject_ref
         FROM visits
         WHERE id = $1 AND facility_id = $2;`,
        [input.visitId, session.facilityId]
      );

      if (visitRes.rows.length === 0) {
        throw new VisitActionError(
          "Kunjungan tidak ditemukan pada fasilitas Anda",
          404,
          "NOT_FOUND"
        );
      }

      const visitRow = visitRes.rows[0];
      if (visitRow.recorded_at !== null) {
        throw new VisitActionError(
          "Kunjungan ini sudah dicatat",
          409,
          "ALREADY_RECORDED"
        );
      }

      // 2. Validasi ruleIds: seluruh ruleId harus berstatus 'published'
      const distinctRuleIds = Array.from(new Set(input.ruleIds.filter(Boolean)));
      if (distinctRuleIds.length > 0) {
        const rulesCheckRes = await tx.query<{ id: string }>(
          `SELECT id FROM accommodation_rules WHERE id = ANY($1) AND status = 'published';`,
          [distinctRuleIds]
        );
        if (rulesCheckRes.rows.length !== distinctRuleIds.length) {
          throw new VisitActionError(
            "Sebagian atau seluruh aturan tidak valid atau belum diterbitkan",
            400,
            "INVALID_RULES"
          );
        }
      }

      // 3. Update kunjungan dalam transaksi
      const updateRes = await tx.query<{ id: string; recorded_at: string }>(
        `UPDATE visits
         SET recorded_at = $1,
             recorded_rule_ids = $2,
             staff_note = $3
         WHERE id = $4 AND facility_id = $5 AND recorded_at IS NULL
         RETURNING id, recorded_at;`,
        [
          now.toISOString(),
          distinctRuleIds,
          trimmedNote || null,
          input.visitId,
          session.facilityId,
        ]
      );

      if (updateRes.rows.length === 0) {
        throw new VisitActionError(
          "Kunjungan ini sudah dicatat",
          409,
          "ALREADY_RECORDED"
        );
      }

      // 4. Catat kejadian audit visit_recorded (tanpa catatan petugas)
      const { recordAuditEvent } = await import("../audit");
      await recordAuditEvent(tx, {
        eventType: "visit_recorded",
        actorId: session.userId,
        actorRole: "staff",
        subjectRef: visitRow.subject_ref,
        facilityId: session.facilityId,
        occurredAt: now,
      });

      return {
        ok: true,
        visitId: input.visitId,
        recordedAt: now.toISOString(),
      };
    }
  );
}

