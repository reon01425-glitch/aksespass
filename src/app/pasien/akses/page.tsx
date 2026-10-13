import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, History, QrCode } from "lucide-react";
import { PageShell } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { countActiveConsents } from "@/lib/consent";

export const metadata: Metadata = {
  title: "Kontrol Akses — AKSESPASS",
  description: "Kelola riwayat akses data dan ConsentQR aktif Anda.",
};

export default async function PasienAksesPage() {
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

  const activeCount = await countActiveConsents(session);
  const activeQrText =
    activeCount === 0
      ? "Tidak ada QR aktif"
      : activeCount === 1
      ? "1 QR aktif"
      : `${activeCount} QR aktif`;

  return (
    <PageShell
      title="Kontrol Akses"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-6 max-w-full w-full">
        <p className="text-base text-secondary">
          Kendali penuh persetujuan ada di tangan Anda. Anda dapat memeriksa
          siapa saja yang membuka data paspor Anda atau membatalkan QR yang
          sedang aktif kapan saja.
        </p>

        <nav aria-label="Menu Kontrol Akses" className="flex flex-col gap-4">
          {/* Kartu Riwayat Akses */}
          <Link
            href="/pasien/akses/riwayat"
            className="flex items-start justify-between p-5 rounded-2xl bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors shadow-sm min-h-12"
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="p-3 rounded-xl bg-cyan-100 text-cyan-900 shrink-0">
                <History className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold text-main break-words">
                  Riwayat Akses
                </span>
                <span className="text-sm text-secondary mt-1 break-words">
                  Lihat jejak waktu, petugas, fasilitas, dan bagian data yang
                  pernah dibuka.
                </span>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 text-secondary shrink-0 mt-3 ml-2"
              aria-hidden="true"
            />
          </Link>

          {/* Kartu QR Aktif */}
          <Link
            href="/pasien/akses/qr"
            className="flex items-start justify-between p-5 rounded-2xl bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors shadow-sm min-h-12"
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="p-3 rounded-xl bg-cyan-100 text-cyan-900 shrink-0">
                <QrCode className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-main break-words">
                    QR Aktif
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900">
                    {activeQrText}
                  </span>
                </div>
                <span className="text-sm text-secondary mt-1 break-words">
                  {activeCount > 0
                    ? `Ada ${activeQrText} yang masih dapat dipindai. Anda dapat mencabutnya sewaktu-waktu.`
                    : "Tidak ada ConsentQR yang sedang berlaku saat ini."}
                </span>
              </div>
            </div>
            <ChevronRight
              className="w-5 h-5 text-secondary shrink-0 mt-3 ml-2"
              aria-hidden="true"
            />
          </Link>
        </nav>
      </div>
    </PageShell>
  );
}
