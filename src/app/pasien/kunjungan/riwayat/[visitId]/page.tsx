import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components";
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
    <PageShell title="Detail Kunjungan" backHref="/pasien/akses/riwayat" backLabel="Kembali ke riwayat kunjungan" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
          <section
            aria-labelledby="heading-status"
            className="flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm"
          >
            <h2
              id="heading-status"
              className="text-lg font-bold leading-tight text-main"
            >
              Ringkasan kunjungan tersedia
            </h2>
            <p className="text-sm leading-6 text-secondary">
              Kunjungan ke {visit.facilityName} telah dicatat. Pencatatan ini
              tidak mengubah masa berlaku atau status ConsentQR.
            </p>
          </section>

          <section
            aria-labelledby="heading-ringkasan"
            className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="heading-ringkasan"
                className="text-lg font-bold text-main"
              >
                Ringkasan Layanan
              </h2>
              {visit.currentAnswer && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-900">
                  Terkonfirmasi
                </span>
              )}
            </div>

            <dl className="flex flex-col divide-y divide-cyan-800">
              <div className="flex flex-col gap-0.5 pb-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Referensi Kunjungan
                </dt>
                <dd className="break-all text-base font-bold tracking-wider text-main">
                  {visit.shortRef}
                </dd>
              </div>

              <div className="flex flex-col gap-0.5 py-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Fasilitas Layanan
                </dt>
                <dd className="break-words text-base font-bold text-main">
                  {visit.facilityName}
                </dd>
                <dd className="text-sm text-secondary">
                  Dicatat melalui{" "}
                  {visit.channel === "qr" ? "ConsentQR" : "kartu"}
                </dd>
              </div>

              <div className="flex flex-col gap-0.5 py-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Waktu Kunjungan
                </dt>
                <dd className="text-base font-bold text-main">
                  {formatDateTimeWib(new Date(visit.createdAt))}
                </dd>
                <dd className="text-sm text-secondary">
                  Bantuan dicatat {formatDateTimeWib(new Date(visit.recordedAt))}
                </dd>
              </div>

              <div className="flex flex-col gap-0.5 pt-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Status CareProof
                </dt>
                {visit.currentAnswer ? (
                  <>
                    <dd className="text-base font-bold text-main">
                      {ANSWER_LABELS[visit.currentAnswer.status]}
                    </dd>
                    <dd className="text-sm text-secondary">
                      {ANSWER_ACTORS[visit.currentAnswer.confirmedBy]}
                    </dd>
                  </>
                ) : (
                  <dd className="text-base font-bold text-main">
                    Belum dikonfirmasi
                  </dd>
                )}
              </div>
            </dl>
          </section>

          {visit.assistance.length > 0 && (
            <section
              aria-labelledby="heading-bantuan"
              className="flex flex-col gap-3"
            >
              <h2
                id="heading-bantuan"
                className="text-lg font-bold text-main"
              >
                Bantuan yang Dicatat
              </h2>
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
                {visit.assistance.map((item) => (
                  <li
                    key={item.ruleId}
                    className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-cyan-800 bg-white p-3 shadow-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100"
                    >
                      {getNeedSummaryIcon(item.iconName)}
                    </span>
                    <span className="min-w-0 break-words text-base leading-6 text-main">
                      {item.actionText}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="rounded-2xl border border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary shadow-sm">
            Pencatatan kunjungan tidak otomatis mencabut ConsentQR. Anda dapat
            mengelola QR aktif kapan saja dari{" "}
            <Link
              href="/pasien/akses/qr"
              className={`font-bold text-cyan-900 underline ${focusRing}`}
            >
              halaman QR aktif
            </Link>
            .
          </p>

          <Link
            href="/pasien/akses/riwayat"
            className={`flex min-h-12 items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-center font-bold text-white ${focusRing}`}
          >
            Kembali ke Riwayat
          </Link>
      </div>
    </PageShell>
  );
}
