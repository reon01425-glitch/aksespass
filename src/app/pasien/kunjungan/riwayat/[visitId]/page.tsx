import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  QrCode,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getNeedSummaryIcon } from "@/components/patient-needs-summary";
import { getOwnVisitHistoryItem } from "@/lib/careproof";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { formatDateTimeWib } from "@/lib/consent/time";

export const metadata: Metadata = {
  title: "Detail Kunjungan — AKSESPASS",
  description: "Ringkasan kunjungan layanan pasien.",
};

const ANSWER_LABELS = {
  terpenuhi: "Kebutuhan terpenuhi",
  sebagian: "Sebagian kebutuhan terpenuhi",
  belum: "Kebutuhan belum terpenuhi",
} as const;

const ANSWER_ACTORS = {
  patient: "Dikonfirmasi oleh Anda",
  companion: "Dikonfirmasi oleh pendamping",
  on_site: "Dikonfirmasi di tempat",
} as const;

export default async function DetailKunjunganPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const visit = await getOwnVisitHistoryItem(session, visitId);
  if (!visit) notFound();

  const focusRing =
    "focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

  return (
    <div className="min-h-dvh w-full bg-page text-main">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header className="fixed left-1/2 top-0 z-50 w-full max-w-md -translate-x-1/2 bg-page/90 px-4 pt-[calc(env(safe-area-inset-top)+0.25rem)] backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3">
            <Link
              href="/pasien/akses/riwayat"
              aria-label="Kembali ke riwayat kunjungan"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${focusRing}`}
            >
              <ArrowLeft aria-hidden="true" className="h-6 w-6" />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-main">
              Detail Kunjungan
            </h1>
            <Link
              href="/pasien"
              aria-label="Beranda pasien"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${focusRing}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-800 text-white">
                <UserRound aria-hidden="true" className="h-5 w-5" />
              </span>
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-24 focus:outline-none"
        >
          <section
            aria-labelledby="heading-status"
            className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-100 bg-white p-6 text-center shadow-sm"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
              <CheckCircle2 aria-hidden="true" className="h-9 w-9" />
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-900">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Bantuan Tercatat
            </span>
            <h2
              id="heading-status"
              className="text-xl font-bold leading-tight text-main"
            >
              Ringkasan kunjungan tersedia
            </h2>
            <p className="text-sm text-secondary">
              Kunjungan ke {visit.facilityName} telah dicatat. Pencatatan ini
              tidak mengubah masa berlaku atau status ConsentQR.
            </p>
          </section>

          <section
            aria-labelledby="heading-ringkasan"
            className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="heading-ringkasan"
                className="flex items-center gap-2 text-lg font-bold text-main"
              >
                <FileText aria-hidden="true" className="h-5 w-5" />
                Ringkasan Layanan
              </h2>
              {visit.currentAnswer && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-900">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Terkonfirmasi
                </span>
              )}
            </div>

            <div className="rounded-xl bg-cyan-50 p-4">
              <p className="text-sm text-secondary">Referensi Kunjungan</p>
              <p className="break-all text-lg font-bold tracking-wider text-main">
                {visit.shortRef}
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-cyan-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
                <MapPin aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-secondary">Fasilitas Layanan</p>
                <p className="break-words font-bold text-main">
                  {visit.facilityName}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-secondary">
                  <QrCode aria-hidden="true" className="h-4 w-4 shrink-0" />
                  Dicatat melalui{" "}
                  {visit.channel === "qr" ? "ConsentQR" : "kartu"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-cyan-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
                <Clock3 aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-secondary">Waktu Kunjungan</p>
                <p className="font-bold text-main">
                  {formatDateTimeWib(new Date(visit.createdAt))}
                </p>
                <p className="mt-1 text-sm text-secondary">
                  Bantuan dicatat{" "}
                  {formatDateTimeWib(new Date(visit.recordedAt))}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-cyan-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-secondary">Status CareProof</p>
                {visit.currentAnswer ? (
                  <>
                    <p className="font-bold text-main">
                      {ANSWER_LABELS[visit.currentAnswer.status]}
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      {ANSWER_ACTORS[visit.currentAnswer.confirmedBy]}
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-main">
                    Belum dikonfirmasi
                  </p>
                )}
              </div>
            </div>

            <p className="rounded-xl border border-cyan-100 p-3 text-sm text-secondary">
              Pencatatan kunjungan tidak otomatis mencabut ConsentQR. Anda
              dapat mengelola QR aktif kapan saja dari{" "}
              <Link
                href="/pasien/akses/qr"
                className={`font-bold text-cyan-900 underline ${focusRing}`}
              >
                halaman QR aktif
              </Link>
              .
            </p>

            {visit.assistance.length > 0 && (
              <div>
                <h3 className="mb-2 text-base font-bold text-main">
                  Bantuan yang Dicatat
                </h3>
                <ul className="flex flex-col gap-2">
                  {visit.assistance.map((item) => (
                    <li
                      key={item.ruleId}
                      className="flex items-start gap-3 rounded-xl bg-cyan-50 p-3"
                    >
                      {getNeedSummaryIcon(item.iconName)}
                      <span className="break-words text-sm font-bold text-main">
                        {item.actionText}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <Link
            href="/pasien/akses/riwayat"
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-center font-bold text-white shadow-sm ${focusRing}`}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Kembali ke Riwayat
          </Link>
        </main>
      </div>
    </div>
  );
}
