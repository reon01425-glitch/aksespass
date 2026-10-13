import { withContext } from "../../db";
import type { SessionClaims } from "../auth/session";

export type PassportStatus = "complete" | "empty";

export interface OwnPassportStatusResult {
  status: PassportStatus;
  preferredName: string | null;
  needCount: number;
}

/**
 * Membaca ringkasan status paspor milik pasien sendiri (P4).
 * Memeriksa apakah profil pasien ada dan memiliki minimal 1 kebutuhan yang tercatat.
 * Menggunakan helper withContext dengan RLS konteks pengguna.
 */
export async function getOwnPassportStatus(
  session: SessionClaims
): Promise<OwnPassportStatusResult> {
  if (session.role !== "patient") {
    return {
      status: "empty",
      preferredName: null,
      needCount: 0,
    };
  }

  return withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{
        preferred_name: string;
        need_count: string;
      }>(
        `SELECT pp.preferred_name, count(ppn.need_code) as need_count
         FROM patient_profiles pp
         LEFT JOIN patient_profile_needs ppn ON ppn.profile_id = pp.id
         WHERE pp.user_id = $1
         GROUP BY pp.id, pp.preferred_name;`,
        [session.userId]
      );

      if (res.rows.length === 0) {
        return {
          status: "empty",
          preferredName: null,
          needCount: 0,
        };
      }

      const count = parseInt(res.rows[0].need_count, 10) || 0;
      return {
        status: count > 0 ? "complete" : "empty",
        preferredName: res.rows[0].preferred_name,
        needCount: count,
      };
    }
  );
}
