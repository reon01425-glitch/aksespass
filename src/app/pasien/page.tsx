import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getOwnPassportStatus } from "@/lib/passport";
import { listOwnConfirmations } from "@/lib/careproof";
import { formatDateTimeWib } from "@/lib/consent/time";
import {
  LogoutButton,
  PageShell,
  StatusBanner,
} from "@/components";
import {
  FileText,
  Shield,
  Users,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Pasien — AKSESPASS",
  description: "Beranda utama pasien untuk mengelola paspor layanan dan kunjungan.",
};

export default async function PasienPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") {
    redirect("/masuk");
  }

  const [passport, pendingConfirmations] = await Promise.all([
    getOwnPassportStatus(session),
    listOwnConfirmations(session),
  ]);
  const isComplete = passport.status === "complete";
  const pendingCount = pendingConfirmations.length;

  return (
    <PageShell title="Beranda Pasien">
      <div className="flex flex-col gap-6">
        {/* Sapaan Pengguna */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-secondary">Selamat datang,</p>
          <p className="text-lg font-bold text-main">
            {passport.preferredName || "Pasien AKSESPASS"}
          </p>
        </div>

        {/* Kartu Status Paspor Menggunakan StatusBanner */}
        <div className="flex flex-col gap-3">
          {isComplete ? (
            <>
              <StatusBanner
                variant="success"
                title="Paspor Layanan Lengkap"
                message={`Paspor Anda memuat ${passport.needCount} kebutuhan layanan yang siap dibagikan ke fasilitas kesehatan.`}
              />
              {passport.lastUpdatedByCompanion && (
                <p className="text-xs text-secondary italic px-1">
                  Terakhir diubah oleh pendamping {passport.lastUpdatedByCompanion.companionName},{" "}
                  {formatDateTimeWib(new Date(passport.lastUpdatedByCompanion.updatedAt))}
                </p>
              )}
              <Link
                href="/pasien/kunjungan"
                className="flex items-center justify-center min-h-[48px] w-full px-6 py-3 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center text-lg"
              >
                Mulai Kunjungan
              </Link>
            </>
          ) : (
            <>
              <StatusBanner
                variant="warning"
                title="Paspor Belum Diisi"
                message="Isi kebutuhan layanan Anda agar petugas fasilitas dapat menyiapkan akomodasi yang sesuai sebelum Anda tiba."
              />
              {passport.lastUpdatedByCompanion && (
                <p className="text-xs text-secondary italic px-1">
                  Terakhir diubah oleh pendamping {passport.lastUpdatedByCompanion.companionName},{" "}
                  {formatDateTimeWib(new Date(passport.lastUpdatedByCompanion.updatedAt))}
                </p>
              )}
              <Link
                href="/pasien/paspor"
                className="flex items-center justify-center min-h-[48px] w-full px-6 py-3 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center text-lg"
              >
                Isi Paspor
              </Link>
            </>
          )}
        </div>

        {/* Kartu Konfirmasi Kunjungan (P16) */}
        {pendingCount > 0 && (
          <Link
            href="/pasien/konfirmasi"
            className="flex items-start justify-between p-5 rounded-2xl bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors shadow-sm min-h-12"
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="p-3 rounded-xl bg-cyan-100 text-cyan-900 shrink-0">
                <ClipboardCheck className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold text-main break-words">
                  Konfirmasi Kunjungan
                </span>
                <span className="text-sm text-secondary mt-1 break-words">
                  {pendingCount === 1
                    ? "1 kunjungan menunggu konfirmasi Anda."
                    : `${pendingCount} kunjungan menunggu konfirmasi Anda.`}
                </span>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 text-secondary shrink-0 mt-3 ml-2"
              aria-hidden="true"
            />
          </Link>
        )}

        {/* Menu Navigasi Utama */}
        <nav aria-label="Menu Pasien" className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-main border-b border-cyan-100 pb-2">
            Menu Layanan
          </h2>

          <div className="flex flex-col divide-y divide-cyan-100 border border-cyan-200 rounded-xl bg-surface overflow-hidden">
            <Link
              href="/pasien/paspor"
              className="flex items-center justify-between p-4 min-h-[48px] hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText aria-hidden="true" className="w-5 h-5 text-cyan-800 shrink-0" />
                <span className="text-base font-bold text-main">Paspor Saya</span>
              </div>
              <ChevronRight aria-hidden="true" className="w-5 h-5 text-secondary shrink-0" />
            </Link>

            <Link
              href="/pasien/akses"
              className="flex items-center justify-between p-4 min-h-[48px] hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield aria-hidden="true" className="w-5 h-5 text-cyan-800 shrink-0" />
                <span className="text-base font-bold text-main">Kontrol Akses</span>
              </div>
              <ChevronRight aria-hidden="true" className="w-5 h-5 text-secondary shrink-0" />
            </Link>

            <Link
              href="/pasien/pendamping"
              className="flex items-center justify-between p-4 min-h-[48px] hover:bg-cyan-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users aria-hidden="true" className="w-5 h-5 text-cyan-800 shrink-0" />
                <span className="text-base font-bold text-main">Pendamping</span>
              </div>
              <ChevronRight aria-hidden="true" className="w-5 h-5 text-secondary shrink-0" />
            </Link>
          </div>
        </nav>

        {/* Tombol Keluar */}
        <div className="pt-4 border-t border-cyan-100">
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
