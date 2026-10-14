import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  History,
  House,
  QrCode,
  ShieldCheck,
  ShieldPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { countActiveConsents } from "@/lib/consent";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

const NAV_ITEMS: {
  href: string;
  label: string;
  Icon: LucideIcon;
  emphasis?: boolean;
}[] = [
  { href: "/pasien", label: "Beranda", Icon: House },
  { href: "/pasien/paspor", label: "Paspor", Icon: FileText },
  { href: "/pasien/akses/qr", label: "QR Akses", Icon: QrCode, emphasis: true },
  { href: "/pasien/pendamping", label: "Pendamping", Icon: Users },
  { href: "/pasien/akses/riwayat", label: "Riwayat", Icon: History },
];

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
    <div className="min-h-dvh w-full bg-page text-main">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header className="fixed left-1/2 top-0 z-50 w-full max-w-md -translate-x-1/2 bg-page/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-200 text-cyan-900"
            >
              <ShieldPlus className="h-6 w-6" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                AKSESPASS Pasien
              </span>
              <h1 className="truncate text-xl font-bold leading-7 text-main">
                Kontrol Akses
              </h1>
            </div>
            <Link
              href="/pasien/akses/riwayat"
              aria-label="Riwayat akses"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-main ${FOCUS_RING}`}
            >
              <Bell aria-hidden="true" className="h-6 w-6" />
            </Link>
            <Link
              href="/pasien"
              aria-label="Beranda pasien"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-white ${FOCUS_RING}`}
            >
              <UserRound aria-hidden="true" className="h-6 w-6" />
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex w-full flex-1 flex-col gap-5 px-4 pb-28 pt-24 focus:outline-none"
        >
          <section
            aria-labelledby="heading-kontrol-akses"
            className="flex gap-3 rounded-2xl border border-cyan-100 bg-cyan-100 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-cyan-900">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2
                id="heading-kontrol-akses"
                className="text-base font-bold text-main"
              >
                Persetujuan tetap dalam kendali Anda
              </h2>
              <p className="mt-1 text-sm text-secondary">
                Periksa siapa yang membuka data paspor atau cabut ConsentQR
                aktif kapan saja.
              </p>
            </div>
          </section>

          <section aria-labelledby="heading-akses-anda">
            <h2
              id="heading-akses-anda"
              className="mb-3 text-lg font-bold text-main"
            >
              Akses Anda
            </h2>
            <nav
              aria-label="Menu Kontrol Akses"
              className="flex flex-col gap-3"
            >
              <Link
                href="/pasien/akses/riwayat"
                className={`flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-900">
                    <History aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-bold text-main">
                      Riwayat Akses
                    </span>
                    <span className="mt-1 text-sm text-secondary">
                      Lihat waktu, petugas, dan fasilitas yang mengakses data.
                    </span>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-secondary"
                />
              </Link>

              <Link
                href="/pasien/akses/qr"
                className={`flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-900">
                    <QrCode aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-2 text-base font-bold text-main">
                      QR Aktif
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-900">
                        {activeCount > 0 ? (
                          <CheckCircle2
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        ) : (
                          <AlertCircle
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        )}
                        {activeQrText}
                      </span>
                    </span>
                    <span className="mt-1 text-sm text-secondary">
                      {activeCount > 0
                        ? "Kelola QR yang dapat dipindai atau cabut aksesnya."
                        : "Tidak ada ConsentQR yang sedang berlaku saat ini."}
                    </span>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-secondary"
                />
              </Link>
            </nav>
          </section>
        </main>

        <nav
          aria-label="Navigasi Utama Pasien"
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-cyan-200 bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <ul className="flex h-16 items-center justify-between px-1">
            {NAV_ITEMS.map(({ href, label, Icon, emphasis }) => {
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg text-secondary hover:text-main ${FOCUS_RING}`}
                  >
                    {emphasis ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-700 text-white shadow-sm">
                        <Icon aria-hidden="true" className="h-6 w-6" />
                      </span>
                    ) : (
                      <Icon
                        aria-hidden="true"
                        className="h-[22px] w-[22px]"
                      />
                    )}
                    <span className="text-[11px] leading-tight">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
