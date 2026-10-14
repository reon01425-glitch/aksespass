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
import { LogoutButton, StatusBanner } from "@/components";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  ClipboardCheck,
  FileText,
  History,
  House,
  Lock,
  QrCode,
  Shield,
  ShieldPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Pasien — AKSESPASS",
  description: "Beranda utama pasien untuk mengelola paspor layanan dan kunjungan.",
};

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

  const displayName = passport.preferredName || "Pasien AKSESPASS";

  const menuItems: {
    href: string;
    title: string;
    subtitle: string;
    Icon: LucideIcon;
  }[] = [
    {
      href: "/pasien/paspor",
      title: "Paspor Saya",
      subtitle: isComplete
        ? `${passport.needCount} kebutuhan aktif`
        : "Belum diisi",
      Icon: FileText,
    },
    {
      href: "/pasien/pendamping",
      title: "Pendamping",
      subtitle: "Kelola pendamping",
      Icon: Users,
    },
    {
      href: "/pasien/akses",
      title: "Kontrol Akses",
      subtitle: "Atur izin dan QR",
      Icon: Shield,
    },
    {
      href: "/pasien/akses/riwayat",
      title: "Riwayat Akses",
      subtitle: "Riwayat akses data",
      Icon: History,
    },
  ];

  const companionNote = passport.lastUpdatedByCompanion && (
    <p className="px-1 text-xs italic text-secondary">
      Terakhir diubah oleh pendamping {passport.lastUpdatedByCompanion.companionName},{" "}
      {formatDateTimeWib(new Date(passport.lastUpdatedByCompanion.updatedAt))}
    </p>
  );

  return (
    <div className="min-h-dvh w-full bg-page text-main">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        {/* Header tetap di atas */}
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
                Beranda
              </h1>
            </div>
            <Link
              href="/pasien/akses/riwayat"
              aria-label="Riwayat akses"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              <Bell aria-hidden="true" className="h-6 w-6" />
            </Link>
            <Link
              href="/pasien"
              aria-label="Beranda pasien"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
            >
              <UserRound aria-hidden="true" className="h-6 w-6" />
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-20 focus:outline-none"
        >
          {/* Sapaan Pengguna */}
          <div className="flex min-w-0 flex-col pt-2">
            <span className="text-base text-secondary">Selamat datang,</span>
            <p
              className="break-words text-2xl font-bold leading-tight text-main"
              style={{ color: "var(--text-main)" }}
            >
              {displayName}
            </p>
          </div>

          {/* Status Paspor */}
          <div className="flex flex-col gap-2">
            {isComplete ? (
              <StatusBanner
                variant="success"
                title="Paspor Layanan Lengkap"
                message={`Paspor Anda memuat ${passport.needCount} kebutuhan layanan yang siap dibagikan ke fasilitas kesehatan.`}
              />
            ) : (
              <StatusBanner
                variant="warning"
                title="Paspor Belum Diisi"
                message="Isi kebutuhan layanan Anda agar petugas fasilitas dapat menyiapkan akomodasi yang sesuai sebelum Anda tiba."
              />
            )}
            {companionNote}
          </div>

          {/* Kartu Aksi Utama */}
          <section
            aria-labelledby="hero-title"
            className="flex flex-col rounded-xl bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-900"
              >
                {isComplete ? (
                  <QrCode className="h-7 w-7" />
                ) : (
                  <FileText className="h-7 w-7" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2
                  id="hero-title"
                  className="text-xl font-bold leading-7 text-main"
                >
                  {isComplete ? "Mulai Kunjungan" : "Lengkapi Paspor Layanan"}
                </h2>
                <p className="text-sm text-secondary">
                  {isComplete
                    ? "Bagikan kebutuhan layanan Anda ke petugas fasilitas."
                    : "Isi kebutuhan layanan agar fasilitas bisa bersiap."}
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface p-3">
              <Lock aria-hidden="true" className="h-5 w-5 shrink-0 text-icon-accent" />
              <span className="text-xs font-bold text-main">
                Aplikasi ini tidak meminta diagnosis medis Anda.
              </span>
            </div>

            <Link
              href={isComplete ? "/pasien/kunjungan" : "/pasien/paspor"}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-bold text-white shadow-sm transition-opacity hover:opacity-95 ${FOCUS_RING}`}
            >
              <span>{isComplete ? "Mulai Kunjungan" : "Isi Paspor"}</span>
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </section>

          {/* Kartu Konfirmasi Kunjungan (P16) */}
          {pendingCount > 0 && (
            <Link
              href="/pasien/konfirmasi"
              className={`flex min-h-12 items-start justify-between rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-surface ${FOCUS_RING}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  aria-hidden="true"
                  className="shrink-0 rounded-lg bg-cyan-100 p-3 text-cyan-900"
                >
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="break-words text-lg font-bold text-main">
                    Konfirmasi Kunjungan
                  </span>
                  <span className="mt-1 break-words text-sm text-secondary">
                    {pendingCount === 1
                      ? "1 kunjungan menunggu konfirmasi Anda."
                      : `${pendingCount} kunjungan menunggu konfirmasi Anda.`}
                  </span>
                </div>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="ml-2 mt-3 h-5 w-5 shrink-0 text-secondary"
              />
            </Link>
          )}

          {/* Menu Layanan: grid 2 kolom */}
          <section aria-labelledby="menu-title" className="w-full">
            <h2
              id="menu-title"
              className="mb-2 px-1 text-sm font-bold tracking-wider text-secondary"
            >
              Menu Layanan
            </h2>
            <nav aria-label="Menu Pasien">
              <ul className="grid grid-cols-2 gap-3">
                {menuItems.map(({ href, title, subtitle, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`group flex min-h-32 h-full flex-col justify-between rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-surface ${FOCUS_RING}`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div
                          aria-hidden="true"
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-btn-primary"
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <ChevronRight
                          aria-hidden="true"
                          className="h-5 w-5 text-secondary transition-colors group-hover:text-main"
                        />
                      </div>
                      <div className="mt-3 flex min-w-0 flex-col">
                        <span className="break-words text-sm font-bold text-main">
                          {title}
                        </span>
                        <span className="mt-0.5 break-words text-xs text-secondary">
                          {subtitle}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          {/* Tombol Keluar */}
          <div className="border-t border-decorative pt-4">
            <LogoutButton redirectTo="/masuk" className="w-full" />
          </div>
        </main>

        {/* Navigasi bawah tetap */}
        <nav
          aria-label="Navigasi Utama Pasien"
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-decorative bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <ul className="flex h-16 items-center justify-between px-1">
            {NAV_ITEMS.map(({ href, label, Icon, emphasis }) => {
              const isActive = href === "/pasien";
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg ${FOCUS_RING} ${
                      isActive ? "font-bold text-btn-primary" : "text-secondary hover:text-main"
                    }`}
                  >
                    {emphasis ? (
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-btn-primary text-white shadow-sm"
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                    ) : (
                      <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
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