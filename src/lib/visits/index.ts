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
