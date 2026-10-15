import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getOwnPassportStatus } from "@/lib/passport";
import { countOpenFollowUps, listOwnConfirmations } from "@/lib/careproof";
import { listRecoveryRequests } from "@/lib/recovery";
import { formatDateTimeWib } from "@/lib/consent/time";
import { HeroCard, LogoutButton, PageShell, PendingConfirmationSync, RecoveryNotice, StatusBanner } from "@/components";
import {
  FileText,
  History,
  ListChecks,
  MessageSquareText,
  Printer,
  QrCode,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PassportDraftBanner } from "./draft-banner";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Pasien — AKSESPASS",
  description: "Beranda utama pasien untuk mengelola paspor layanan dan kunjungan.",
};

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

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

  const [passport, pendingConfirmations, openFollowUps, recoveryRequests] = await Promise.all([
    getOwnPassportStatus(session),
    listOwnConfirmations(session),
    countOpenFollowUps(session),
    listRecoveryRequests(session),
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
    {
      href: "/pasien/kartu-cetak",
      title: "Kartu Cetak",
      subtitle: "Cetak atau simpan offline",
      Icon: Printer,
    },
    {
      href: "/pasien/komunikacare",
      title: "KomunikaCare",
      subtitle: "Bantu bicara dengan petugas",
      Icon: MessageSquareText,
    },
    {
      href: "/pasien/tindak-lanjut",
      title: "Tindak Lanjut",
      subtitle:
        openFollowUps > 0
          ? `${openFollowUps} kebutuhan sedang ditanggapi`
          : "Status kebutuhan belum terpenuhi",
      Icon: ListChecks,
    },
    {
      href: "/pasien/akun",
      title: "Akun",
      subtitle: "Tampilan dan keluar",
      Icon: Settings,
    },
  ];

  const companionNote = passport.lastUpdatedByCompanion && (
    <p className="rounded-2xl border border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary shadow-sm">
      Terakhir diubah oleh pendamping {passport.lastUpdatedByCompanion.companionName},{" "}
      {formatDateTimeWib(new Date(passport.lastUpdatedByCompanion.updatedAt))}
    </p>
  );

  return (
    <PageShell title="Beranda Pasien" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        {/* Sapaan */}
        <section
          aria-label="Identitas pasien"
          className="flex min-w-0 flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm"
        >
          <span className="text-sm text-secondary">Selamat datang,</span>
          <p className="break-words text-2xl font-bold leading-tight text-main">
            {displayName}
          </p>
        </section>

        {recoveryRequests.map((r) => (
          <RecoveryNotice
            key={r.id}
            requestId={r.id}
            initiatorName={r.initiatorName}
            initiatedByMe={false}
            maskedNewPhone={r.maskedNewPhone}
            eligibleAt={r.eligibleAt}
            audience="patient"
          />
        ))}

        {isComplete ? (
          <StatusBanner
            variant="success"
            title="Paspor Layanan Lengkap"
            message={`Paspor Anda memuat ${passport.needCount} kebutuhan layanan yang siap dibagikan ke fasilitas kesehatan.`}
          />
        ) : (
          <StatusBanner
            floating
            variant="warning"
            title="Paspor Belum Diisi"
            message="Isi kebutuhan layanan Anda agar petugas fasilitas dapat menyiapkan akomodasi yang sesuai sebelum Anda tiba."
          />
        )}
        {companionNote}
        <PassportDraftBanner ownerId={session.userId} />

        {/* Kartu aksi utama */}
        <HeroCard
          href={isComplete ? "/pasien/kunjungan" : "/pasien/paspor"}
          Icon={isComplete ? QrCode : FileText}
          title={isComplete ? "Mulai Kunjungan" : "Lengkapi Paspor Layanan"}
          description={
            isComplete
              ? "Bagikan kebutuhan layanan Anda ke petugas fasilitas."
              : "Isi kebutuhan layanan agar fasilitas bisa bersiap."
          }
          note="Aplikasi ini tidak meminta diagnosis medis Anda."
        />

        <PendingConfirmationSync userId={session.userId} />

        {pendingCount > 0 && (
          <Link
            href="/pasien/konfirmasi"
            className={`flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
          >
            <span className="break-words text-lg font-bold text-main">
              Konfirmasi Kunjungan
            </span>
            <span className="break-words text-sm text-secondary">
              {pendingCount === 1
                ? "1 kunjungan menunggu konfirmasi Anda."
                : `${pendingCount} kunjungan menunggu konfirmasi Anda.`}
            </span>
          </Link>
        )}

        {/* Menu layanan: dua kolom */}
        <section aria-labelledby="menu-title" className="w-full">
          <h2 id="menu-title" className="mb-3 text-lg font-bold text-main">
            Menu Layanan
          </h2>
          <nav aria-label="Menu Pasien">
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
              {menuItems.map(({ href, title, subtitle, Icon }) => (
                <li key={href} className="flex">
                  <Link
                    href={href}
                    className={`flex min-h-32 w-full min-w-0 flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 ${FOCUS_RING}`}
                  >
                    <Icon aria-hidden="true" className="h-7 w-7 text-cyan-700" />
                    <span className="break-words text-base font-bold leading-snug text-main">
                      {title}
                    </span>
                    <span className="break-words text-xs text-secondary">
                      {subtitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <div className="rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
