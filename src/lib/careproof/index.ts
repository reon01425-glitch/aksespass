import { withContext, type AppDbRole } from "../../db";
import { recordAuditEvent } from "../audit";

export type CareProofStatus = "terpenuhi" | "sebagian" | "belum";
export type CareProofConfirmedBy = "patient" | "companion" | "on_site";

export interface ConfirmVisitActor {
  userId: string;
  role: "patient" | "companion" | "staff";
  facilityId?: string | null;
}

export interface ConfirmVisitInput {
  status: CareProofStatus;
  unmetNeedCodes?: string[];
}

export interface ConfirmVisitResult {
  ok: true;
  visitId: string;
  status: CareProofStatus;
  confirmedBy: CareProofConfirmedBy;
  confirmedAt: string;
}

export class CareProofError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 400, code: string = "BAD_REQUEST") {
    super(message);
    this.name = "CareProofError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Konfirmasi pelayanan CareProof (P16, D8, T9):
 * Digunakan oleh Pasien, Pendamping resmi, maupun Konfirmasi di Tempat oleh petugas.
 *
 * Aturan Domain & Arsitektur §9:
 * 1. Status harus bernilai 'terpenuhi', 'sebagian', atau 'belum'.
 * 2. Kunjungan harus sudah dicatat bantuannya (recorded_at IS NOT NULL); belum dicatat -> ditolak.
 * 3. unmetNeedCodes harus merupakan subset dari katalog kebutuhan yang sah. Jika terpenuhi, wajib kosong.
 * 4. confirmed_by mengikuti actor:
 *    - staff -> 'on_site'
 *    - companion -> 'companion'
 *    - patient -> 'patient'
 * 5. Resolusi Kepemilikan: Jawaban pasien adalah penentu utama (single source of truth).
 *    - Pasien boleh menimpa jawaban pendamping maupun jawaban di tempat.
 *    - Pendamping atau petugas di tempat TIDAK boleh menimpa jawaban yang sudah dikonfirmasi oleh pasien -> 409 "Pasien sudah mengonfirmasi".
 * 6. Menulis audit event 'visit_confirmed' (pelaku, confirmed_by via actorRole, subject_ref dari visits, fasilitas; tanpa isi jawaban/kebutuhan).
 */
export async function confirmVisit(
  actor: ConfirmVisitActor,
  visitId: string,
  input: ConfirmVisitInput,
  options?: { now?: Date }
): Promise<ConfirmVisitResult> {
  const allowedStatuses: CareProofStatus[] = ["terpenuhi", "sebagian", "belum"];
  if (!allowedStatuses.includes(input.status)) {
    throw new CareProofError(
      `Status konfirmasi tidak valid: ${input.status}`,
      400,
      "INVALID_STATUS"
    );
  }

  // Tentukan confirmed_by berdasarkan peran aktor pemanggil
  let confirmedBy: CareProofConfirmedBy;
  if (actor.role === "staff") {
    confirmedBy = "on_site";
  } else if (actor.role === "companion") {
    confirmedBy = "companion";
  } else if (actor.role === "patient") {
    confirmedBy = "patient";
  } else {
    throw new CareProofError("Peran tidak diizinkan untuk mengonfirmasi kunjungan", 403, "FORBIDDEN");
  }

  // Validasi unmetNeedCodes
  let unmetNeedCodes: string[] = [];
  if (input.status === "terpenuhi") {
    unmetNeedCodes = [];
  } else if (Array.isArray(input.unmetNeedCodes)) {
    unmetNeedCodes = Array.from(
      new Set(
        input.unmetNeedCodes.filter(
          (c): c is string => typeof c === "string" && Boolean(c.trim())
        )
      )
    );
  }

  const now = options?.now ?? new Date();

  return await withContext(
    {
      userId: actor.userId,
      role: actor.role as AppDbRole,
      facilityId: actor.facilityId ?? undefined,
    },
    async (tx) => {
      // 1. Ambil data kunjungan dan konfirmasi yang sudah ada (bila ada)
      const visitRes = await tx.query<{
        id: string;
        facility_id: string;
        patient_user_id: string;
        recorded_at: string | null;
        subject_ref: string;
        confirmation_id: string | null;
        existing_confirmed_by: CareProofConfirmedBy | null;
      }>(
        `SELECT
           v.id,
           v.facility_id,
           v.patient_user_id,
           v.recorded_at,
           v.subject_ref,
           vc.id AS confirmation_id,
           vc.confirmed_by AS existing_confirmed_by
         FROM visits v
         LEFT JOIN visit_confirmations vc ON vc.visit_id = v.id
         WHERE v.id = $1;`,
        [visitId]
      );

      if (visitRes.rows.length === 0) {
        throw new CareProofError("Kunjungan tidak ditemukan", 404, "NOT_FOUND");
      }

      const visitRow = visitRes.rows[0];

      // Kunjungan harus sudah dicatat bantuannya (recorded_at IS NOT NULL)
      if (visitRow.recorded_at === null) {
        throw new CareProofError(
          "Kunjungan belum dicatat bantuannya oleh petugas",
          400,
          "VISIT_NOT_RECORDED"
        );
      }

      // Validasi unmetNeedCodes terhadap needs_catalog jika ada
      if (unmetNeedCodes.length > 0) {
        const catRes = await tx.query<{ code: string }>(
          `SELECT code FROM needs_catalog WHERE code = ANY($1);`,
          [unmetNeedCodes]
        );
        if (catRes.rows.length !== unmetNeedCodes.length) {
          throw new CareProofError(
            "Sebagian kode kebutuhan yang belum terpenuhi tidak terdaftar di katalog",
            400,
            "INVALID_UNMET_NEEDS"
          );
        }
      }

      // 2. Aturan §9: Resolusi Kepemilikan Konfirmasi
      // Jika pasien sudah mengonfirmasi sendiri, pendamping atau petugas di tempat TIDAK BOLEH menimpa
      if (
        visitRow.existing_confirmed_by === "patient" &&
        confirmedBy !== "patient"
      ) {
        throw new CareProofError(
          "Pasien sudah mengonfirmasi",
          409,
          "PATIENT_ALREADY_CONFIRMED"
        );
      }

      // 3. Simpan atau perbarui konfirmasi kunjungan
      if (visitRow.confirmation_id) {
        await tx.query(
          `UPDATE visit_confirmations
           SET status = $1,
               unmet_need_codes = $2,
               confirmed_by = $3,
               confirmed_by_user_id = $4,
               confirmed_at = $5
           WHERE visit_id = $6;`,
          [
            input.status,
            unmetNeedCodes,
            confirmedBy,
            actor.userId,
            now.toISOString(),
            visitId,
          ]
        );
      } else {
        await tx.query(
          `INSERT INTO visit_confirmations (
             id, visit_id, status, unmet_need_codes, confirmed_by,
             confirmed_by_user_id, confirmed_at
           ) VALUES (
             gen_random_uuid(), $1, $2, $3, $4, $5, $6
           );`,
          [
            visitId,
            input.status,
            unmetNeedCodes,
            confirmedBy,
            actor.userId,
            now.toISOString(),
          ]
        );
      }

      // 4. Catat kejadian audit visit_confirmed (tanpa isi jawaban/kebutuhan)
      await recordAuditEvent(tx, {
        eventType: "visit_confirmed",
        actorId: actor.userId,
        actorRole: actor.role as AppDbRole,
        subjectRef: visitRow.subject_ref,
        facilityId: visitRow.facility_id,
        occurredAt: now,
      });

      return {
        ok: true,
        visitId,
        status: input.status,
        confirmedBy,
        confirmedAt: now.toISOString(),
      };
    }
  );
}
