import { withContext } from "../../db";
import type { SessionClaims } from "../auth/session";

export interface StaffFacilityInfo {
  facilityId: string;
  facilityName: string;
  staffName: string | null;
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
      const res = await tx.query<{ name: string; staff_name: string | null }>(
        `SELECT f.name,
                (SELECT u.display_name FROM users u WHERE u.id = $2) AS staff_name
         FROM facilities f WHERE f.id = $1;`,
        [session.facilityId, session.userId]
      );

      if (res.rows.length === 0) {
        return null;
      }

      return {
        facilityId: session.facilityId!,
        facilityName: res.rows[0].name,
        staffName: res.rows[0].staff_name,
      };
    }
  );
}

export interface FacilityOption {
  id: string;
  name: string;
}

/**
 * Mengambil seluruh fasilitas aktif yang dapat dipilih oleh pasien/pengguna.
 */
export async function getActiveFacilities(
  session: SessionClaims
): Promise<FacilityOption[]> {
  return withContext(
    {
      userId: session.userId,
      role: session.role,
    },
    async (tx) => {
      const res = await tx.query<FacilityOption>(
        "SELECT id, name FROM facilities WHERE status = 'active' ORDER BY name ASC;"
      );
      return res.rows;
    }
  );
}
