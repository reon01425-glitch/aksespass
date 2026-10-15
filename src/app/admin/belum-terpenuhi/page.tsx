import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { DASHBOARD_MIN_GROUP_SIZE, recentJakartaPeriods } from "@/lib/dashboard";
import { FACILITY_ACTION_STATUS_LABELS, getUnmetNeeds } from "@/lib/facility-actions";
import { PageShell } from "@/components";
import { NewActionButton } from "./new-action-button";

export const instant = false;

export const metadata: Metadata = {
  title: "Kebutuhan Belum Terpenuhi — AKSESPASS",
  description: "Kategori kebutuhan yang paling sering belum terpenuhi (agregat anonim).",
};

const TREND_LABEL = {
  naik: "Naik dari bulan lalu",
  turun: "Turun dari bulan lalu",
  tetap: "Sama dengan bulan lalu",
  belum_cukup_data: "Tren belum tersedia (data belum cukup)",
} as const;

function key(p: { year: number; month: number }) {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}
function label(p: { year: number; month: number }) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(p.year, p.month - 1, 1)
  );
}

export default async function BelumTerpenuhiPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "facility_admin") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("facility_admin");

  const periods = recentJakartaPeriods();
  const { month } = await searchParams;
  const period = periods.find((p) => key(p) === month) ?? periods[0];
  const { rows } = await getUnmetNeeds(session, period);

  return (
    <PageShell title="Belum Terpenuhi" backHref="/admin" backLabel="Kembali ke Beranda Admin" adminNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        <p className="max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary">
          Kategori kebutuhan yang paling sering belum terpenuhi. Semua angka agregat dan anonim;
          kelompok kurang dari {DASHBOARD_MIN_GROUP_SIZE} pasien disembunyikan.
        </p>

        <nav aria-label="Pilih Periode" className="flex flex-wrap gap-2">
          {periods.map((p) => {
            const active = key(p) === key(period);
            return (
              <Link
                key={key(p)}
                href={`/admin/belum-terpenuhi?month=${key(p)}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 ${
                  active
                    ? "border-cyan-900 bg-cyan-900 font-bold text-white"
                    : "border-cyan-800 bg-white text-main hover:bg-cyan-50"
                }`}
              >
                {label(p)}
              </Link>
            );
          })}
        </nav>

        <ol aria-label="Kategori belum terpenuhi" className="m-0 grid w-full list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
          {rows.map((r) => (
            <li
              key={r.category}
              data-testid="baris-kategori"
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <span className="break-words text-base font-bold text-main">{r.categoryLabel}</span>
                {r.current.hidden ? (
                  <span className="text-sm text-secondary">
                    Disembunyikan (kurang dari {DASHBOARD_MIN_GROUP_SIZE} pasien)
                  </span>
                ) : (
                  <span className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-main">{r.current.value}</span>
                    <span className="text-xs text-secondary">kunjungan</span>
                  </span>
                )}
                <span className="text-xs text-secondary">{TREND_LABEL[r.trend]}</span>
                {r.openActionStatus && (
                  <span className="text-xs font-bold text-main">
                    Tindak lanjut: {FACILITY_ACTION_STATUS_LABELS[r.openActionStatus]}
                  </span>
                )}
              </div>
              <div className="mt-auto">
              {r.openActionId ? (
                <Link
                  href="/admin/tindak-lanjut"
                  className="flex min-h-12 items-center justify-center rounded-lg border-2 border-cyan-700 bg-white px-2 py-2 text-center text-sm font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                >
                  Lihat Tindak Lanjut
                </Link>
              ) : (
                <NewActionButton category={r.category} categoryLabel={r.categoryLabel} />
              )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </PageShell>
  );
}
