import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import {
  getFacilityDashboard,
  recentJakartaPeriods,
  DASHBOARD_MIN_GROUP_SIZE,
  type DashboardCell,
  type DashboardPeriod,
} from "@/lib/dashboard";
import { NEED_CATEGORY_LABELS } from "@/lib/passport";
import { PageShell } from "@/components";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard Kesenjangan Aksesibilitas — AKSESPASS",
  description: "Accommodation Fulfillment Rate dan rincian kebutuhan belum terpenuhi fasilitas.",
};

const STATUS_LABELS: Record<string, string> = {
  terpenuhi: "Terpenuhi",
  sebagian: "Sebagian",
  belum: "Belum",
  belum_dikonfirmasi: "Belum Dikonfirmasi",
};

const ANSWERER_LABELS: Record<string, string> = {
  patient: "Oleh Pasien",
  companion: "Oleh Pendamping",
  on_site: "Di Tempat",
};

function periodKey(p: DashboardPeriod): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

function periodLabel(p: DashboardPeriod): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(p.year, p.month - 1, 1)
  );
}

function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

function renderCell(cell: DashboardCell | undefined, suffix: string = ""): string {
  if (!cell) return "Belum ada data kunjungan";
  if (cell.hidden) {
    return `Disembunyikan (kurang dari ${DASHBOARD_MIN_GROUP_SIZE} pasien)`;
  }
  return `${cell.value}${suffix}`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
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
  await requireActiveInstitutionPage("facility_admin");

  const availablePeriods = recentJakartaPeriods(new Date(), 3);
  const params = await searchParams;
  const selectedPeriod =
    availablePeriods.find((p) => periodKey(p) === params.month) ?? availablePeriods[0];

  const result = await getFacilityDashboard(session, selectedPeriod);
  const selected = result.selected;

  const trendRows = result.trend.map((t) => ({
    monthLabel: monthLabelFromKey(t.month),
    hidden: t.hidden,
    totalVisits: t.hidden ? null : t.totalVisits ?? 0,
    afr: t.hidden ? null : t.afr ?? null,
    afrHidden: t.hidden ? false : Boolean(t.afrHidden),
  }));
  const maxTotalVisits = Math.max(1, ...trendRows.map((r) => r.totalVisits ?? 0));

  return (
    <PageShell title="Dashboard Aksesibilitas" backHref="/admin" backLabel="Kembali ke Beranda Admin">
      <div className="flex flex-col gap-8 max-w-full w-full">
        <p className="text-base text-secondary">
          Semua angka agregat dan anonim. Hanya pasien yang menyetujui statistik yang dihitung.
        </p>

        {/* Filter Periode */}
        <nav aria-label="Pilih Periode" className="flex flex-wrap gap-2">
          {availablePeriods.map((p) => {
            const key = periodKey(p);
            const isActive = key === periodKey(selectedPeriod);
            return (
              <Link
                key={key}
                href={`/admin/dashboard?month=${key}`}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center justify-center min-h-12 px-4 rounded-lg border text-base focus:outline-none focus:ring-4 focus:ring-cyan-900 ${
                  isActive
                    ? "bg-cyan-700 text-white border-cyan-700 font-bold"
                    : "bg-white text-main border-cyan-200 hover:bg-cyan-50"
                }`}
              >
                {periodLabel(p)}
              </Link>
            );
          })}
        </nav>

        {selected.hidden ? (
          <div className="p-5 rounded-2xl bg-surface border border-cyan-200 text-center">
            <p className="text-base text-secondary">
              Disembunyikan (kurang dari {DASHBOARD_MIN_GROUP_SIZE} pasien berbeda) untuk{" "}
              {periodLabel(selectedPeriod)}.
            </p>
          </div>
        ) : selected.totalVisits === 0 ? (
          <div className="p-5 rounded-2xl bg-surface border border-cyan-200 text-center">
            <p className="text-base text-secondary">Belum ada data kunjungan.</p>
          </div>
        ) : (
          <>
            {/* AFR Besar */}
            <section aria-labelledby="heading-afr" className="flex flex-col gap-2">
              <h2 id="heading-afr" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
                Accommodation Fulfillment Rate — {periodLabel(selectedPeriod)}
              </h2>
              {selected.afrHidden ? (
                <p className="text-lg text-main">
                  Disembunyikan: jumlah pasien terlalu sedikit (kurang dari{" "}
                  {DASHBOARD_MIN_GROUP_SIZE} pasien berbeda pada kelompok terpenuhi atau belum
                  terpenuhi) sehingga angka ini dapat mengungkap individu.
                </p>
              ) : (
                <>
                  <div className="text-6xl font-bold text-main" aria-hidden="true">
                    {selected.afr ?? 0}%
                  </div>
                  <p className="text-lg text-main">
                    {selected.afr ?? 0}% kunjungan kebutuhannya terpenuhi dari total{" "}
                    {selected.totalVisits} kunjungan tercatat.
                  </p>
                </>
              )}
            </section>

            {/* Tren Bulanan */}
            <section aria-labelledby="heading-tren" className="flex flex-col gap-3">
              <h2 id="heading-tren" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
                Tren Bulanan
              </h2>
              <div
                tabIndex={0}
                aria-label="Tabel tren bulanan"
                className="overflow-x-auto max-w-full focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                <table className="w-full text-left border-collapse">
                  <caption className="text-sm text-secondary text-left mb-2">
                    Jumlah kunjungan dan Accommodation Fulfillment Rate per bulan. Panjang batang
                    hanya ilustrasi; angka selalu ditulis.
                  </caption>
                  <thead>
                    <tr className="border-b border-cyan-200">
                      <th scope="col" className="py-2 pr-4 text-sm font-bold text-main">
                        Bulan
                      </th>
                      <th scope="col" className="py-2 pr-4 text-sm font-bold text-main">
                        Kunjungan
                      </th>
                      <th scope="col" className="py-2 text-sm font-bold text-main">
                        AFR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendRows.map((row) => (
                      <tr key={row.monthLabel} className="border-b border-cyan-100">
                        <td className="py-3 pr-4 text-base text-main">{row.monthLabel}</td>
                        <td className="py-3 pr-4 text-base text-main">
                          {row.hidden
                            ? `Disembunyikan (kurang dari ${DASHBOARD_MIN_GROUP_SIZE} pasien)`
                            : row.totalVisits}
                        </td>
                        <td className="py-3 text-base text-main">
                          {row.hidden || row.afr === null ? (
                            row.hidden || row.afrHidden ? (
                              `Disembunyikan (kurang dari ${DASHBOARD_MIN_GROUP_SIZE} pasien)`
                            ) : (
                              "Belum ada data"
                            )
                          ) : (
                            <div className="flex items-center gap-2 max-w-full">
                              <div
                                className="h-3 bg-cyan-700 rounded"
                                aria-hidden="true"
                                style={{
                                  width: `${Math.max(
                                    4,
                                    ((row.totalVisits ?? 0) / maxTotalVisits) * 96
                                  )}px`,
                                }}
                              />
                              <span>{row.afr}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Rincian Status */}
            <section aria-labelledby="heading-status" className="flex flex-col gap-3">
              <h2 id="heading-status" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
                Rincian Status Konfirmasi
              </h2>
              <div
                tabIndex={0}
                aria-label="Tabel rincian status konfirmasi"
                className="overflow-x-auto max-w-full focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                <table className="w-full text-left border-collapse">
                  <caption className="text-sm text-secondary text-left mb-2">
                    Jumlah kunjungan per status konfirmasi CareProof pada {periodLabel(selectedPeriod)}.
                  </caption>
                  <thead>
                    <tr className="border-b border-cyan-200">
                      <th scope="col" className="py-2 pr-4 text-sm font-bold text-main">Status</th>
                      <th scope="col" className="py-2 text-sm font-bold text-main">Jumlah Kunjungan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["terpenuhi", "sebagian", "belum", "belum_dikonfirmasi"] as const).map((key) => (
                      <tr key={key} className="border-b border-cyan-100">
                        <td className="py-3 pr-4 text-base text-main">{STATUS_LABELS[key]}</td>
                        <td className="py-3 text-base text-main">
                          {renderCell(selected.statusBreakdown?.[key])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Rincian Penjawab */}
            <section aria-labelledby="heading-penjawab" className="flex flex-col gap-3">
              <h2 id="heading-penjawab" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
                Rincian Penjawab
              </h2>
              <p className="text-sm text-secondary">
                Jawaban pendamping dan di tempat ditandai terpisah.
              </p>
              <div
                tabIndex={0}
                aria-label="Tabel rincian penjawab"
                className="overflow-x-auto max-w-full focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">
                    Jumlah kunjungan per pihak yang menjawab konfirmasi CareProof.
                  </caption>
                  <thead>
                    <tr className="border-b border-cyan-200">
                      <th scope="col" className="py-2 pr-4 text-sm font-bold text-main">Penjawab</th>
                      <th scope="col" className="py-2 text-sm font-bold text-main">Jumlah Kunjungan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["patient", "companion", "on_site"] as const).map((key) => (
                      <tr key={key} className="border-b border-cyan-100">
                        <td className="py-3 pr-4 text-base text-main">{ANSWERER_LABELS[key]}</td>
                        <td className="py-3 text-base text-main">
                          {renderCell(selected.answererBreakdown?.[key])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Rincian Kategori */}
            <section aria-labelledby="heading-kategori" className="flex flex-col gap-3">
              <h2 id="heading-kategori" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
                Rincian Kategori Kebutuhan Belum Terpenuhi
              </h2>
              <div
                tabIndex={0}
                aria-label="Tabel rincian kategori kebutuhan belum terpenuhi"
                className="overflow-x-auto max-w-full focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">
                    Jumlah kunjungan dengan kebutuhan belum terpenuhi per kategori.
                  </caption>
                  <thead>
                    <tr className="border-b border-cyan-200">
                      <th scope="col" className="py-2 pr-4 text-sm font-bold text-main">Kategori</th>
                      <th scope="col" className="py-2 text-sm font-bold text-main">Jumlah Kunjungan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(NEED_CATEGORY_LABELS).map(([key, label]) => (
                      <tr key={key} className="border-b border-cyan-100">
                        <td className="py-3 pr-4 text-base text-main">{label}</td>
                        <td className="py-3 text-base text-main">
                          {renderCell(
                            selected.categoryBreakdown?.[key as keyof typeof NEED_CATEGORY_LABELS]
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href={`/admin/belum-terpenuhi?month=${periodKey(selectedPeriod)}`}
                className="flex min-h-12 items-center justify-center rounded-lg border-2 border-cyan-700 bg-white px-4 py-2 text-base font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
              >
                Lihat Kebutuhan Belum Terpenuhi
              </Link>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
