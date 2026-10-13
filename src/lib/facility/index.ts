import { withContext } from "../../db";
import type { SessionClaims } from "../auth/session";

export interface StaffFacilityInfo {
  facilityId: string;
  facilityName: string;
}

/**
 * Mengambil nama fasilitas tempat petugas bertugas berdasarkan sesi.
 * Menggunakan helper withContext dengan RLS konteks petugas.
 */
export async function getStaffFacilityInfo(
  session: SessionClaims
): Promise<StaffFacilityInfo | null> {
  if (!session.facilityId) {
    return null;
  }

  return withContext(
    {
      userId: session.userId,
      role: session.role,
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{ name: string }>(
        "SELECT name FROM facilities WHERE id = $1;",
        [session.facilityId]
      );

      if (res.rows.length === 0) {
        return null;
      }

      return {
        facilityId: session.facilityId!,
        facilityName: res.rows[0].name,
      };
    }
  );
}
