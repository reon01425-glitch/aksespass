import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireSessionFromHeaders } from "./guard";
import type { AppDbRole } from "../../db";

/**
 * Penjaga halaman server untuk petugas/admin: selain tanda tangan cookie (proxy), memeriksa ke DB
 * bahwa sesi belum dicabut dan keanggotaan masih aktif. Petugas yang dinonaktifkan admin langsung
 * ditolak di halaman, bukan hanya di API.
 */
export async function requireActiveInstitutionPage(role: AppDbRole): Promise<void> {
  const res = await requireSessionFromHeaders(await headers(), { roles: [role] });
  if (res.ok) return;
  const closed =
    res.reason === "MEMBERSHIP_INACTIVE" ||
    res.reason === "USER_INACTIVE" ||
    res.reason === "FACILITY_MISMATCH";
  redirect(closed ? "/masuk/petugas?alasan=akses-ditutup" : "/masuk/petugas?alasan=sesi-berakhir");
}
