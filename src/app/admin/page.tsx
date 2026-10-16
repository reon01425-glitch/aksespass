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
import { getFacilityDashboard, currentJakartaPeriod } from "@/lib/dashboard";
import { LayoutDashboard } from "lucide-react";
import { HeroCard, LogoutButton, PageShell } from "@/components";

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
  await requireActiveInstitutionPage("facility_admin");

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

  const MENU = [
    { href: "/admin/petugas", label: "Akun Petugas", desc: "Tambah, ubah, atau nonaktifkan akun petugas." },
    { href: "/admin/belum-terpenuhi", label: "Belum Terpenuhi", desc: "Kebutuhan pasien yang belum dipenuhi." },
    { href: "/admin/tindak-lanjut", label: "Tindak Lanjut", desc: "Pantau tindakan perbaikan yang dicatat." },
  ];
  const STAT = "flex flex-col gap-1 rounded-2xl bg-cyan-700 p-4 text-white shadow-md";

  return (
    <PageShell title="Beranda Admin" adminNav>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm">
          <span className="text-xs text-secondary">Admin Fasilitas:</span>
          <span className="text-base font-bold text-main break-words">{result.facilityName}</span>
        </div>

        <HeroCard
          href="/admin/dashboard"
          Icon={LayoutDashboard}
          title="Dashboard Fasilitas"
          description="Statistik akomodasi bulanan yang anonim."
        />

        <section aria-labelledby="heading-ringkasan" className="flex flex-col gap-3">
          <h2 id="heading-ringkasan" className="text-lg font-bold text-main">
            Ringkasan {monthLabel}
          </h2>

          {selected.hidden ? (
            <p className={`max-w-none ${STAT} text-base text-white`}>
              Disembunyikan (kurang dari 5 pasien berbeda) untuk {monthLabel}.
            </p>
          ) : selected.totalVisits === 0 ? (
            <p className={`max-w-none ${STAT} text-base text-white`}>Belum ada data kunjungan.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
              <div className={STAT}>
                <span className="text-xs text-white">Kunjungan Ber-AKSESPASS</span>
                <span className="text-2xl font-bold text-white">{selected.totalVisits}</span>
              </div>
              <div className={STAT}>
                <span className="text-xs text-white">Accommodation Fulfillment Rate</span>
                <span className={`font-bold text-white break-words ${selected.afrHidden ? "text-base" : "text-2xl"}`}>
                  {selected.afrHidden ? "Disembunyikan" : `${selected.afr ?? 0}%`}
                </span>
              </div>
              <div className={STAT}>
                <span className="text-xs text-white">Kebutuhan Belum Terpenuhi</span>
                <span className="text-2xl font-bold text-white">{unmetTotal ?? 0}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-secondary">
            Semua angka agregat dan anonim. Hanya pasien yang menyetujui statistik yang dihitung.
          </p>
        </section>

        <nav aria-label="Menu Admin" className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-12 flex-col rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              <span className="text-base font-bold text-main">{item.label}</span>
              <span className="text-sm text-secondary">{item.desc}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4">
          <p className="text-center text-xs text-secondary">
            Perangkat dipakai bergantian? Selalu keluar setelah selesai.
          </p>
          <LogoutButton redirectTo="/masuk/petugas" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
