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

const CARD = "flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm";
const H2 = "text-lg font-bold text-main";

interface ChartPoint {
  label: string;
  value: number | null;
}

/** Grafik garis SVG satu warna (cyan). Titik tersembunyi (kelompok kecil) tidak digambar. */
function LineChart({
  points,
  title,
  unit = "",
  max,
}: {
  points: ChartPoint[];
  title: string;
  unit?: string;
  max?: number;
}) {
  const W = 640;
  const H = 260;
  const L = 56;
  const R = 24;
  const T = 28;
  const B = 40;
  const values = points.map((p) => p.value ?? 0);
  const top = max ?? Math.max(4, Math.ceil(Math.max(...values, 1) / 4) * 4);
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const drawn = points
    .map((pt, i) => (pt.value === null ? null : { ...pt, cx: x(i), cy: y(pt.value) }))
    .filter((d): d is ChartPoint & { value: number; cx: number; cy: number } => d !== null);
  const path = drawn.map((d, i) => `${i === 0 ? "M" : "L"}${d.cx.toFixed(1)} ${d.cy.toFixed(1)}`).join(" ");
  const ticks = [0, top / 2, top];
  const summary = points
    .map((pt) => `${pt.label}: ${pt.value === null ? "disembunyikan" : `${pt.value}${unit}`}`)
    .join("; ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${title}. ${summary}`}
      className="h-auto w-full"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-cyan-100" strokeWidth={1} />
          <text x={L - 10} y={y(t) + 5} textAnchor="end" className="fill-cyan-900 text-[13px]">
            {Math.round(t)}
            {unit}
          </text>
        </g>
      ))}
      {drawn.length > 1 && (
        <path d={path} fill="none" className="stroke-cyan-700" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {drawn.map((d) => (
        <g key={d.label}>
          <circle cx={d.cx} cy={d.cy} r={7} className="fill-white stroke-cyan-700" strokeWidth={4} />
          <text x={d.cx} y={d.cy - 14} textAnchor="middle" className="fill-cyan-900 text-[14px] font-bold">
            {d.value}
            {unit}
          </text>
        </g>
      ))}
      {points.map((pt, i) =>
        pt.value === null ? (
          <circle key={`h-${pt.label}`} cx={x(i)} cy={y(0)} r={5} className="fill-white stroke-cyan-700" strokeWidth={2} strokeDasharray="3 3" />
        ) : null
      )}
      {points.map((pt, i) => (
        <text key={pt.label} x={x(i)} y={H - 12} textAnchor="middle" className="fill-cyan-900 text-[13px]">
          {pt.label}
          {pt.value === null ? " (disembunyikan)" : ""}
        </text>
      ))}
    </svg>
  );
}

/** Daftar batang horizontal; angka selalu ditulis, panjang batang hanya pelengkap. */
function BarList({ rows }: { rows: { key: string; label: string; cell: DashboardCell | undefined }[] }) {
  const max = Math.max(1, ...rows.map((r) => (r.cell && !r.cell.hidden ? r.cell.value : 0)));
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map(({ key, label, cell }) => (
        <li key={key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-main">{label}</span>
            <span className="text-sm font-bold text-main">
              {!cell ? "Belum ada data" : cell.hidden ? `Disembunyikan (<${DASHBOARD_MIN_GROUP_SIZE} pasien)` : cell.value}
            </span>
          </div>
          <div aria-hidden="true" className="h-3 w-full overflow-hidden rounded-full bg-cyan-100">
            <div
              className="h-full rounded-full bg-cyan-700"
              style={{ width: `${cell && !cell.hidden ? Math.max(2, (cell.value / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
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

  const trendMonthShort = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(year, month - 1, 1));
  };
  const visitPoints: ChartPoint[] = result.trend.map((t) => ({
    label: trendMonthShort(t.month),
    value: t.hidden ? null : t.totalVisits ?? 0,
  }));
  const afrPoints: ChartPoint[] = result.trend.map((t) => ({
    label: trendMonthShort(t.month),
    value: t.hidden || t.afrHidden ? null : t.afr ?? null,
  }));

  return (
    <PageShell title="Dashboard" adminNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        <nav aria-label="Pilih Periode" className="flex flex-wrap gap-2">
          {availablePeriods.map((p) => {
            const key = periodKey(p);
            const isActive = key === periodKey(selectedPeriod);
            return (
              <Link
                key={key}
                href={`/admin/dashboard?month=${key}`}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 ${
                  isActive
                    ? "border-cyan-900 bg-cyan-900 font-bold text-white"
                    : "border-cyan-800 bg-white text-main hover:bg-cyan-50"
                }`}
              >
                {periodLabel(p)}
              </Link>
            );
          })}
        </nav>

        {selected.hidden ? (
          <div className={`${CARD} text-center`}>
            <p className="text-sm text-secondary">
              Disembunyikan (kurang dari {DASHBOARD_MIN_GROUP_SIZE} pasien berbeda) untuk{" "}
              {periodLabel(selectedPeriod)}.
            </p>
          </div>
        ) : selected.totalVisits === 0 ? (
          <div className={`${CARD} text-center`}>
            <p className="text-sm text-secondary">Belum ada data kunjungan.</p>
          </div>
        ) : (
          <>
            <section aria-labelledby="heading-afr" className="grid grid-cols-2 gap-3">
              <h2 id="heading-afr" className="sr-only">
                Ringkasan {periodLabel(selectedPeriod)}
              </h2>
              <div className="flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm">
                <span className="text-xs text-secondary">Accommodation Fulfillment Rate</span>
                <span className="text-3xl font-bold text-main">
                  {selected.afrHidden ? "Disembunyikan" : `${selected.afr ?? 0}%`}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm">
                <span className="text-xs text-secondary">Kunjungan Tercatat</span>
                <span className="text-3xl font-bold text-main">{selected.totalVisits}</span>
              </div>
              {selected.afrHidden && (
                <p className="col-span-2 text-xs leading-5 text-secondary">
                  AFR disembunyikan karena kelompok terpenuhi atau belum terpenuhi berasal dari kurang dari{" "}
                  {DASHBOARD_MIN_GROUP_SIZE} pasien berbeda.
                </p>
              )}
            </section>

            <section aria-labelledby="heading-tren-kunjungan" className={CARD}>
              <h2 id="heading-tren-kunjungan" className={H2}>
                Tren Kunjungan
              </h2>
              <LineChart points={visitPoints} title="Tren jumlah kunjungan per bulan" />
            </section>

            <section aria-labelledby="heading-tren-afr" className={CARD}>
              <h2 id="heading-tren-afr" className={H2}>
                Tren AFR
              </h2>
              <LineChart points={afrPoints} title="Tren Accommodation Fulfillment Rate per bulan" unit="%" max={100} />
              <p className="text-xs text-secondary">
                Bulan yang kelompoknya terlalu kecil tidak digambar.
              </p>
            </section>

            <section aria-labelledby="heading-status" className={CARD}>
              <h2 id="heading-status" className={H2}>
                Status Konfirmasi
              </h2>
              <BarList
                rows={(["terpenuhi", "sebagian", "belum", "belum_dikonfirmasi"] as const).map((key) => ({
                  key,
                  label: STATUS_LABELS[key],
                  cell: selected.statusBreakdown?.[key],
                }))}
              />
            </section>

            <section aria-labelledby="heading-penjawab" className={CARD}>
              <h2 id="heading-penjawab" className={H2}>
                Penjawab Konfirmasi
              </h2>
              <BarList
                rows={(["patient", "companion", "on_site"] as const).map((key) => ({
                  key,
                  label: ANSWERER_LABELS[key],
                  cell: selected.answererBreakdown?.[key],
                }))}
              />
            </section>

            <section aria-labelledby="heading-kategori" className={CARD}>
              <h2 id="heading-kategori" className={H2}>
                Kebutuhan Belum Terpenuhi
              </h2>
              <BarList
                rows={Object.entries(NEED_CATEGORY_LABELS).map(([key, label]) => ({
                  key,
                  label,
                  cell: selected.categoryBreakdown?.[key as keyof typeof NEED_CATEGORY_LABELS],
                }))}
              />
              <Link
                href={`/admin/belum-terpenuhi?month=${periodKey(selectedPeriod)}`}
                className="flex min-h-12 items-center justify-center rounded-lg border-2 border-cyan-700 bg-white px-4 py-2 text-base font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
              >
                Lihat Kebutuhan Belum Terpenuhi
              </Link>
            </section>

            <p className="text-xs text-secondary">
              Semua angka agregat dan anonim. Hanya pasien yang menyetujui statistik yang dihitung.
            </p>
          </>
        )}
      </div>
    </PageShell>
  );
}
