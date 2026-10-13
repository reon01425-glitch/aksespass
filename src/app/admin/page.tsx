import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getFacilityDashboard, currentJakartaPeriod } from "@/lib/dashboard";
import { LogoutButton, PageShell } from "@/components";
import { ShieldCheck, ChevronRight, BarChart3 } from "lucide-react";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Admin Fasilitas — AKSESPASS",
  description: "Beranda manajemen admin fasilitas kesehatan.",
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk/petugas");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "facility_admin") {
    redirect("/masuk/petugas");
  }

  const period = currentJakartaPeriod();
  const result = await getFacilityDashboard(session, period);
  const selected = result.selected;

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(period.year, period.month - 1, 1));

  const unmetTotal =
    !selected.hidden && selected.categoryBreakdown
      ? Object.values(selected.categoryBreakdown).reduce(
          (sum, cell) => sum + (cell.hidden ? 0 : cell.value),
          0
        )
      : null;

  return (
    <PageShell title="Beranda Admin Fasilitas">
      <div className="flex flex-col gap-6">
        <div className="p-4 rounded-xl border border-cyan-800 bg-surface flex items-center gap-3">
          <ShieldCheck aria-hidden="true" className="w-6 h-6 text-cyan-800 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs text-secondary">Peran Pengguna:</span>
            <span className="text-base font-bold text-main">Admin Fasilitas</span>
            <span className="text-sm text-secondary">{result.facilityName}</span>
          </div>
        </div>

        <section aria-labelledby="heading-ringkasan" className="flex flex-col gap-3">
          <h2
            id="heading-ringkasan"
            className="text-base font-bold text-main border-b border-cyan-100 pb-2"
          >
            Ringkasan Bulan Berjalan — {monthLabel}
          </h2>

          {selected.hidden ? (
            <p className="text-base text-secondary">
              Disembunyikan (kurang dari 5 pasien berbeda) untuk {monthLabel}.
            </p>
          ) : selected.totalVisits === 0 ? (
            <p className="text-base text-secondary">Belum ada data kunjungan.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-surface border border-cyan-100 flex flex-col gap-1">
                <span className="text-sm text-secondary">Kunjungan Ber-AKSESPASS</span>
                <span className="text-2xl font-bold text-main">{selected.totalVisits}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-cyan-100 flex flex-col gap-1">
                <span className="text-sm text-secondary">Accommodation Fulfillment Rate</span>
                <span className="text-2xl font-bold text-main">{selected.afr ?? 0}%</span>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-cyan-100 flex flex-col gap-1">
                <span className="text-sm text-secondary">Kebutuhan Belum Terpenuhi</span>
                <span className="text-2xl font-bold text-main">{unmetTotal ?? 0}</span>
              </div>
            </div>
          )}

          <p className="text-sm text-secondary">
            Semua angka agregat dan anonim. Hanya pasien yang menyetujui statistik yang dihitung.
          </p>
        </section>

        <nav aria-label="Menu Admin" className="flex flex-col gap-3">
          <div className="flex flex-col divide-y divide-cyan-100 border border-cyan-200 rounded-xl bg-surface overflow-hidden">
            <Link
              href="/admin/dashboard"
              className="flex items-center justify-between p-4 min-h-[48px] hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BarChart3 aria-hidden="true" className="w-5 h-5 text-cyan-800 shrink-0" />
                <span className="text-base font-bold text-main">Dashboard</span>
              </div>
              <ChevronRight aria-hidden="true" className="w-5 h-5 text-secondary shrink-0" />
            </Link>
          </div>
        </nav>

        <div className="pt-4 border-t border-cyan-100">
          <LogoutButton redirectTo="/masuk/petugas" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
