import { withContext, DASHBOARD_MIN_GROUP_SIZE } from "../../db";
import { NEED_CATEGORIES, type NeedCategory } from "../consent/constants";
import type { SessionClaims } from "../auth/session";

export { DASHBOARD_MIN_GROUP_SIZE };

export type DashboardStatusKey =
  | "terpenuhi"
  | "sebagian"
  | "belum"
  | "belum_dikonfirmasi";

export type DashboardAnswererKey = "patient" | "companion" | "on_site";

export type DashboardCell =
  | { hidden: true }
  | { hidden: false; value: number };

export interface DashboardTrendMonth {
  month: string;
  hidden: boolean;
  totalVisits?: number;
  afr?: number | null;
  /** true bila AFR disembunyikan karena membuka sel kecil (jumlah pasien terlalu sedikit). */
  afrHidden?: boolean;
}

export interface DashboardSelectedMonth {
  month: string;
  hidden: boolean;
  totalVisits?: number;
  afr?: number | null;
  /** true bila AFR disembunyikan karena membuka sel kecil (jumlah pasien terlalu sedikit). */
  afrHidden?: boolean;
  statusBreakdown?: Record<DashboardStatusKey, DashboardCell>;
  answererBreakdown?: Record<DashboardAnswererKey, DashboardCell>;
  categoryBreakdown?: Record<NeedCategory, DashboardCell>;
}

export interface FacilityDashboardResult {
  facilityName: string;
  trend: DashboardTrendMonth[];
  selected: DashboardSelectedMonth;
}

export interface DashboardPeriod {
  year: number;
  month: number;
}

export interface DashboardSessionParam {
  userId: string;
  role: string;
  facilityId?: string | null;
}

export class DashboardError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 403, code: string = "FORBIDDEN") {
    super(message);
    this.name = "DashboardError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Mengembalikan tahun dan bulan bulan berjalan di zona Asia/Jakarta.
 */
export function currentJakartaPeriod(now: Date = new Date()): DashboardPeriod {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  return { year, month };
}

/**
 * Menghasilkan hingga 3 periode pilihan (bulan berjalan dan 2 bulan sebelumnya),
 * urut terbaru lebih dulu, untuk pilihan filter periode A6.
 */
export function recentJakartaPeriods(
  now: Date = new Date(),
  count: number = 3
): DashboardPeriod[] {
  const { year, month } = currentJakartaPeriod(now);
  const periods: DashboardPeriod[] = [];
  for (let i = 0; i < count; i++) {
    let m = month - i;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    periods.push({ year: y, month: m });
  }
  return periods;
}

/**
 * Membaca agregat Accessibility Gap Dashboard (A3, A6) milik fasilitas admin pemanggil.
 *
 * Batasan arsitektur (§6, §11, K-10):
 * 1. Hanya peran facility_admin yang diizinkan; peran lain -> DashboardError 403.
 * 2. Fasilitas SELALU diambil dari sesi admin (session.facilityId); tidak ada parameter
 *    yang dapat memilih fasilitas lain -- ditegakkan ulang di dalam fungsi SECURITY DEFINER.
 * 3. Modul ini TIDAK PERNAH membaca tabel kunjungan, konfirmasi, atau profil pasien secara
 *    langsung -- seluruh angka berasal dari satu panggilan ke get_facility_dashboard(...).
 * 4. Ambang kelompok kecil (DASHBOARD_MIN_GROUP_SIZE) ditegakkan di dalam database; sel yang
 *    disembunyikan tidak pernah membawa angka keluar dari DB (lihat migrasi 009).
 */
export async function getFacilityDashboard(
  session: DashboardSessionParam | SessionClaims,
  period?: DashboardPeriod
): Promise<FacilityDashboardResult> {
  if (session.role !== "facility_admin" || !session.facilityId) {
    throw new DashboardError(
      "Hanya admin fasilitas yang dapat membaca dashboard agregat",
      403,
      "FORBIDDEN"
    );
  }

  const resolvedPeriod = period ?? currentJakartaPeriod();

  return withContext(
    {
      userId: session.userId,
      role: "facility_admin",
      facilityId: session.facilityId,
    },
    async (tx) => {
      const res = await tx.query<{ result: FacilityDashboardResult | null }>(
        `SELECT get_facility_dashboard($1, $2) AS result;`,
        [resolvedPeriod.year, resolvedPeriod.month]
      );

      const result = res.rows[0]?.result;
      if (!result) {
        throw new DashboardError(
          "Tidak berwenang membaca dashboard fasilitas ini",
          403,
          "FORBIDDEN"
        );
      }

      return result;
    }
  );
}

export { NEED_CATEGORIES };
