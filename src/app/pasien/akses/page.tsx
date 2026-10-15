import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History, QrCode, Shield } from "lucide-react";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { countActiveConsents } from "@/lib/consent";
import { HeroCard, PageShell } from "@/components";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

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
    <PageShell title="Kontrol Akses" backHref="/pasien" backLabel="Kembali ke beranda" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        <HeroCard
          Icon={Shield}
          title="Persetujuan tetap dalam kendali Anda"
          description="Periksa siapa yang membuka data paspor atau cabut ConsentQR aktif kapan saja."
        />

        <section aria-labelledby="heading-akses-anda">
          <h2 id="heading-akses-anda" className="mb-3 text-lg font-bold text-main">
            Akses Anda
          </h2>
          <nav
            aria-label="Menu Kontrol Akses"
            className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2"
          >
            <Link
              href="/pasien/akses/riwayat"
              className={`flex min-w-0 flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
            >
              <History aria-hidden="true" className="h-7 w-7 text-cyan-700" />
              <span className="text-base font-bold text-main">Riwayat Akses</span>
              <span className="text-xs text-secondary">
                Waktu, petugas, dan fasilitas yang mengakses data.
              </span>
            </Link>
            <Link
              href="/pasien/akses/qr"
              className={`flex min-w-0 flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
            >
              <QrCode aria-hidden="true" className="h-7 w-7 text-cyan-700" />
              <span className="text-base font-bold text-main">QR Aktif</span>
              <span className="text-xs text-secondary">
                {activeQrText}.{" "}
                {activeCount > 0
                  ? "Kelola atau cabut aksesnya."
                  : "Tidak ada ConsentQR yang berlaku."}
              </span>
            </Link>
          </nav>
        </section>
      </div>
    </PageShell>
  );
}
