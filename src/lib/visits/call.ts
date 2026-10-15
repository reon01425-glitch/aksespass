import { withContext } from "../../db";
import { VisitActionError, type VisitSessionParam } from "./index";

export const CALL_ROOM_MAX_LENGTH = 40;

export interface CallPatientResult {
  ok: true;
  visitId: string;
  calledAt: string;
  room: string | null;
}

/**
 * Petugas memanggil pasien (T6 -> P14). Hanya menyimpan waktu dan label ruangan;
 * tidak memuat data pasien. Dibatasi RLS ke kunjungan fasilitas petugas.
 * Memanggil ulang memperbarui waktu panggilan agar pasien kembali diberi tahu.
 */
export async function callPatient(
  session: VisitSessionParam,
  input: { visitId: string; room?: string | null },
  options?: { now?: Date }
): Promise<CallPatientResult> {
  if (session.role !== "staff" || !session.facilityId) {
    throw new VisitActionError(
      "Hanya petugas fasilitas yang dapat memanggil pasien",
      403,
      "FORBIDDEN"
    );
  }

  const room = typeof input.room === "string" ? input.room.trim() : "";
  if (room.length > CALL_ROOM_MAX_LENGTH) {
    throw new VisitActionError(
      `Nama ruangan maksimal ${CALL_ROOM_MAX_LENGTH} karakter`,
      400,
      "ROOM_TOO_LONG"
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
      const res = await tx.query<{ id: string }>(
        `UPDATE visits
         SET called_at = $2, call_room = $3
         WHERE id = $1 AND facility_id = $4
         RETURNING id;`,
        [input.visitId, now.toISOString(), room || null, session.facilityId]
      );
      if (res.rows.length === 0) {
        throw new VisitActionError("Kunjungan tidak ditemukan", 404, "NOT_FOUND");
      }
      return {
        ok: true,
        visitId: input.visitId,
        calledAt: now.toISOString(),
        room: room || null,
      };
    }
  );
}

export interface CompleteVisitResult {
  ok: true;
  visitId: string;
  completedAt: string;
}

/**
 * Petugas menandai pelayanan selesai ("Selesai dan Kembali ke Beranda").
 * Syarat: bantuan sudah dicatat (recorded_at terisi) dan kunjungan milik fasilitas petugas.
 * Idempoten: memanggil ulang tidak mengubah waktu selesai pertama.
 */
export async function completeVisit(
  session: VisitSessionParam,
  input: { visitId: string },
  options?: { now?: Date }
): Promise<CompleteVisitResult> {
  if (session.role !== "staff" || !session.facilityId) {
    throw new VisitActionError(
      "Hanya petugas fasilitas yang dapat menyelesaikan pelayanan",
      403,
      "FORBIDDEN"
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
      const res = await tx.query<{ completed_at: string; recorded_at: string | null }>(
        `UPDATE visits
         SET completed_at = COALESCE(completed_at, $2)
         WHERE id = $1 AND facility_id = $3 AND recorded_at IS NOT NULL
         RETURNING completed_at, recorded_at;`,
        [input.visitId, now.toISOString(), session.facilityId]
      );
      if (res.rows.length === 0) {
        throw new VisitActionError(
          "Kunjungan tidak ditemukan atau bantuan belum dicatat",
          404,
          "NOT_FOUND_OR_NOT_RECORDED"
        );
      }
      // KomunikaCare dua perangkat bersifat sementara: hapus pesan saat selesai.
      await tx.query(`DELETE FROM komunikacare_messages WHERE visit_id = $1;`, [
        input.visitId,
      ]);
      return {
        ok: true,
        visitId: input.visitId,
        completedAt: new Date(res.rows[0].completed_at).toISOString(),
      };
    }
  );
}

export type WaitingPhase = "menunggu" | "dipanggil" | "dilayani";

export interface OwnWaitingState {
  visitId: string;
  facilityName: string;
  phase: WaitingPhase;
  calledAt: string | null;
  room: string | null;
  /** Kategori kebutuhan yang dibagikan lewat ConsentQR kunjungan ini. */
  sharedFields: string[];
}

/**
 * Status menunggu/dipanggil untuk kunjungan milik pasien sendiri (P13/P14).
 * - "dilayani": petugas menandai pelayanan selesai (completed_at terisi).
 * - "dipanggil": petugas sudah menekan Panggil Pasien.
 * - "menunggu": selain itu.
 * Mengembalikan null bila kunjungan bukan milik pasien (dijaga RLS), tanpa membedakan sebabnya.
 */
export async function getOwnWaitingState(
  session: { userId: string; role: string },
  visitId: string
): Promise<OwnWaitingState | null> {
  if (session.role !== "patient") return null;
  if (!/^[0-9a-f-]{36}$/i.test(visitId)) return null;

  return await withContext(
    { userId: session.userId, role: "patient" },
    async (tx) => {
      const res = await tx.query<{
        id: string;
        facility_name: string;
        called_at: string | null;
        call_room: string | null;
        completed_at: string | null;
        shared_fields: string[] | null;
      }>(
        `SELECT v.id, f.name AS facility_name, v.called_at, v.call_room,
                v.completed_at, c.shared_fields
         FROM visits v
         JOIN facilities f ON f.id = v.facility_id
         LEFT JOIN consents c ON c.id = v.consent_id
         WHERE v.id = $1 AND v.patient_user_id = $2;`,
        [visitId, session.userId]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const phase: WaitingPhase = row.completed_at
        ? "dilayani"
        : row.called_at
        ? "dipanggil"
        : "menunggu";
      return {
        visitId: row.id,
        facilityName: row.facility_name,
        phase,
        calledAt: row.called_at ? new Date(row.called_at).toISOString() : null,
        room: row.call_room,
        sharedFields: row.shared_fields ?? [],
      };
    }
  );
}
