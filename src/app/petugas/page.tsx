import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getStaffFacilityInfo } from "@/lib/facility";
import {
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

  const facilityInfo = await getStaffFacilityInfo(session);
  const todayVisits = await listTodayVisits(session);

  return (
    <PageShell title="Beranda Petugas">
      <div className="flex flex-col gap-6">
        {/* Identitas Fasilitas Kesehatan Petugas */}
        <div className="p-4 rounded-xl border border-cyan-800 bg-surface flex items-center gap-3">
          <Building2 aria-hidden="true" className="w-6 h-6 text-cyan-800 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs text-secondary">Fasilitas Bertugas:</span>
            <span className="text-base font-bold text-main">
              {facilityInfo?.facilityName || "Fasilitas Kesehatan"}
            </span>
          </div>
        </div>

        {/* Tombol Utama Besar: Pindai ConsentQR */}
        <div className="flex flex-col gap-2">
          <Link
            href="/petugas/pindai"
            className="flex items-center justify-center gap-3 min-h-[56px] w-full px-6 py-4 bg-cyan-700 text-white font-bold rounded-xl shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center text-lg"
          >
            <QrCode aria-hidden="true" className="w-6 h-6 shrink-0" />
            <span>Pindai ConsentQR</span>
          </Link>
          <p className="text-xs text-secondary text-center">
            Arahkan kamera ke kode QR di ponsel pasien untuk membuka kebutuhan akomodasi.
          </p>
          <Link
            href="/petugas/kartu"
            className="flex items-center justify-center gap-2 min-h-12 w-full px-6 py-3 bg-cyan-100 text-cyan-900 border border-cyan-800 font-bold rounded-xl focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center"
          >
            <CreditCard aria-hidden="true" className="w-5 h-5 shrink-0" />
            <span>Pasien dengan Kartu Cetak</span>
          </Link>
          <p className="text-xs text-secondary text-center">
            Untuk pasien yang hanya membawa kartu cetak atau saat sinyal buruk.
          </p>
        </div>

        {/* Daftar Kunjungan Hari Ini (T3) */}
        <section aria-labelledby="heading-antrean" className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
            <h2 id="heading-antrean" className="text-base font-bold text-main">
              Kunjungan Hari Ini
            </h2>
            <div className="flex items-center gap-1 text-xs text-secondary">
              <Clock aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Hari ini</span>
            </div>
          </div>

          {todayVisits.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-cyan-400 bg-surface text-center flex flex-col items-center justify-center gap-2">
              <p className="text-sm font-bold text-main">
                Belum ada kunjungan hari ini.
              </p>
              <p className="text-xs text-secondary">
                Kunjungan pasien yang baru dipindai akan otomatis muncul pada daftar ini.
              </p>
            </div>
          ) : (
            <ul role="list" className="flex flex-col gap-3 m-0 p-0 list-none">
              {todayVisits.map((visit) => (
                <li
                  key={visit.id}
                  className="p-4 rounded-xl bg-white border border-cyan-800 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-main">
                      Rujukan #{visit.shortRef}
                    </span>
                    <span className="text-xs text-secondary">
                      {visit.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-main">
                    {visit.statusCode === "unrecorded" && (
                      <FileEdit
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0 text-cyan-800"
                      />
                    )}
                    {visit.statusCode === "pending_confirmation" && (
                      <Clock
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0 text-cyan-800"
                      />
                    )}
                    {visit.statusCode === "confirmed" && (
                      <CheckCheck
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0 text-cyan-800"
                      />
                    )}
                    <span className="break-words">{visit.statusText}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tombol Keluar Menonjol (Perangkat Petugas Dipakai Bergantian) */}
        <div className="pt-6 border-t border-cyan-100 flex flex-col gap-2">
          <p className="text-xs text-secondary text-center">
            Perangkat ini digunakan bergantian oleh staf medis? Selalu keluar setelah bertugas.
          </p>
          <LogoutButton redirectTo="/masuk/petugas" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
