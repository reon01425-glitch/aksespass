import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { getStaffFacilityInfo } from "@/lib/facility";
import {
  HeroCard,
  LogoutButton,
  PageShell,
} from "@/components";
import { listTodayVisits } from "@/lib/visits";
import { QrCode, Building2, Clock, FileEdit, CheckCheck, CreditCard } from "lucide-react";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Petugas — AKSESPASS",
  description: "Beranda petugas fasilitas kesehatan untuk memindai ConsentQR dan melihat kebutuhan pasien.",
};

export default async function PetugasPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk/petugas");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "staff") {
    redirect("/masuk/petugas");
  }
  await requireActiveInstitutionPage("staff");

  const facilityInfo = await getStaffFacilityInfo(session);
  const todayVisits = await listTodayVisits(session);

  return (
    <PageShell title="Beranda Petugas" petugasNav>
      <div className="flex flex-col gap-5">
        {/* Identitas Fasilitas Kesehatan Petugas */}
        <div className="p-4 rounded-2xl border border-cyan-800 bg-white shadow-sm flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-100">
            <Building2 aria-hidden="true" className="w-7 h-7 text-cyan-800" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-secondary">Fasilitas Bertugas:</span>
            <span className="text-base font-bold text-main break-words">
              {facilityInfo?.facilityName || "Fasilitas Kesehatan"}
            </span>
            {facilityInfo?.staffName ? (
              <span className="text-sm text-secondary break-words">Masuk sebagai {facilityInfo.staffName}</span>
            ) : null}
          </div>
        </div>

        {/* Kartu Aksi: Pindai ConsentQR (utama) dan Kartu Cetak */}
        <div className="flex flex-col gap-3">
          <HeroCard
            href="/petugas/pindai"
            Icon={QrCode}
            title="Pindai ConsentQR"
            description="Arahkan kamera ke kode QR di ponsel pasien untuk membuka kebutuhan akomodasi."
          />
          <Link
            href="/petugas/kartu"
            className="flex items-center gap-4 w-full p-4 bg-white text-cyan-900 border border-cyan-800 rounded-2xl shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100">
              <CreditCard aria-hidden="true" className="w-6 h-6 text-cyan-800" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-bold">Pasien dengan Kartu Cetak</span>
              <span className="text-sm text-secondary">
                Untuk pasien yang hanya membawa kartu cetak atau saat sinyal buruk.
              </span>
            </span>
          </Link>
        </div>

        {/* Daftar Kunjungan Hari Ini (T3) */}
        <section aria-labelledby="heading-antrean" className="flex flex-col gap-3">
          <h2 id="heading-antrean" className="text-lg font-bold text-main">
            Kunjungan Hari Ini
          </h2>

          {todayVisits.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-cyan-800 bg-white text-center flex flex-col items-center justify-center gap-2">
              <p className="text-sm font-bold text-main">
                Belum ada kunjungan hari ini.
              </p>
              <p className="text-xs text-secondary">
                Kunjungan pasien yang baru dipindai akan otomatis muncul pada daftar ini.
              </p>
            </div>
          ) : (
            <ul role="list" className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
              {todayVisits.map((visit) => (
                <li
                  key={visit.id}
                  className="p-4 rounded-2xl bg-white border border-cyan-800 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-main">
                      Rujukan #{visit.shortRef}
                    </span>
                    <span className="text-xs text-secondary">
                      {visit.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-main">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100">
                      {visit.statusCode === "unrecorded" && (
                        <FileEdit aria-hidden="true" className="w-5 h-5 text-cyan-800" />
                      )}
                      {visit.statusCode === "pending_confirmation" && (
                        <Clock aria-hidden="true" className="w-5 h-5 text-cyan-800" />
                      )}
                      {visit.statusCode === "confirmed" && (
                        <CheckCheck aria-hidden="true" className="w-5 h-5 text-cyan-800" />
                      )}
                    </span>
                    <span className="break-words">{visit.statusText}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tombol Keluar Menonjol (Perangkat Petugas Dipakai Bergantian) */}
        <div className="p-4 rounded-2xl border border-cyan-800 bg-white flex flex-col gap-3">
          <p className="text-xs text-secondary text-center">
            Perangkat ini digunakan bergantian oleh staf medis? Selalu keluar setelah bertugas.
          </p>
          <LogoutButton redirectTo="/masuk/petugas" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
