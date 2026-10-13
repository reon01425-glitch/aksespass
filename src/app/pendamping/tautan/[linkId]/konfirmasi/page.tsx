import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { PageShell } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { listPatientConfirmationsForCompanion } from "@/lib/companions";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import { CompanionKonfirmasiClient } from "./companion-konfirmasi-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Konfirmasi CareProof atas Nama Pasien — AKSESPASS",
  description: "Konfirmasi keterpenuhan kebutuhan layanan atas nama pasien yang didampingi.",
};

const BY_LABEL: Record<string, string> = {
  patient: "dijawab oleh pasien (terkunci)",
  companion: "dijawab oleh pendamping",
  on_site: "dijawab di tempat",
};

function formatRecordedDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

interface CompanionKonfirmasiPageProps {
  params: Promise<{ linkId: string }>;
  searchParams: Promise<{ visitId?: string }>;
}

export default async function CompanionKonfirmasiPage({
  params,
  searchParams,
}: CompanionKonfirmasiPageProps) {
  const { linkId } = await params;
  if (!linkId) {
    notFound();
  }

  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "companion") {
    redirect("/masuk");
  }

  let patientData;
  try {
    patientData = await listPatientConfirmationsForCompanion(session, linkId);
  } catch {
    notFound();
  }

  const { patient, visits } = patientData;
  const { visitId } = await searchParams;

  // Jika tidak ada kunjungan sama sekali
  if (visits.length === 0) {
    return (
      <PageShell
        title={`Konfirmasi: ${patient.preferredName}`}
        backHref="/pendamping"
        backLabel="Kembali ke Beranda Pendamping"
      >
        <div className="flex flex-col gap-6 max-w-full w-full">
          <div className="p-5 rounded-2xl bg-surface border border-cyan-200 text-center">
            <p className="text-base text-secondary">
              Tidak ada kunjungan yang perlu dikonfirmasi saat ini untuk{" "}
              <strong className="text-main">{patient.preferredName}</strong>.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  // Tentukan kunjungan yang akan ditampilkan
  let targetVisit = visits[0];
  let showList = false;

  if (visitId) {
    const found = visits.find((v) => v.visitId === visitId);
    if (found) {
      targetVisit = found;
    } else {
      notFound();
    }
  } else if (visits.length > 1) {
    showList = true;
  }

  // Jika ada lebih dari satu kunjungan dan belum memilih, tampilkan daftar
  if (showList) {
    return (
      <PageShell
        title={`Konfirmasi: ${patient.preferredName}`}
        backHref="/pendamping"
        backLabel="Kembali ke Beranda Pendamping"
      >
        <div className="flex flex-col gap-6 max-w-full w-full">
          <p className="text-base text-secondary">
            Pilih kunjungan {patient.preferredName} yang ingin Anda konfirmasi
            sebagai pendamping.
          </p>

          <nav
            aria-label="Daftar Kunjungan untuk Dikonfirmasi"
            className="flex flex-col gap-4"
          >
            {visits.map((item) => {
              const byLabel = item.currentAnswer
                ? BY_LABEL[item.currentAnswer.confirmedBy]
                : null;
              return (
                <Link
                  key={item.visitId}
                  href={`/pendamping/tautan/${linkId}/konfirmasi?visitId=${item.visitId}`}
                  className="flex items-start justify-between p-5 rounded-2xl bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors shadow-sm min-h-12"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="p-3 rounded-xl bg-cyan-100 text-cyan-900 shrink-0">
                      <ClipboardCheck className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg font-bold text-main break-words">
                        {item.facilityName}
                      </span>
                      <span className="text-sm text-secondary mt-1 break-words">
                        {formatRecordedDate(item.recordedAt)}
                        {byLabel ? ` — ${byLabel}` : " — belum dikonfirmasi"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 text-secondary shrink-0 mt-3 ml-2"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </PageShell>
    );
  }

  // Tampilkan form konfirmasi untuk targetVisit
  const [passport, catalogGroups] = await Promise.all([
    getOwnPassport(session, patient.patientUserId),
    getNeedsCatalog(session),
  ]);

  const ownNeedCodes = new Set(passport?.needCodes || []);
  const sharedCategorySet = new Set(targetVisit.sharedCategories);
  const relevantGroups =
    sharedCategorySet.size > 0
      ? catalogGroups.filter((group) => sharedCategorySet.has(group.category))
      : catalogGroups;
  const unmetChoices = relevantGroups
    .flatMap((group) => group.items)
    .filter((item) => ownNeedCodes.has(item.code))
    .map((item) => ({
      code: item.code,
      label: item.label,
      iconName: item.iconName,
    }));

  return (
    <CompanionKonfirmasiClient
      linkId={linkId}
      patientName={patient.preferredName}
      visitId={targetVisit.visitId}
      facilityName={targetVisit.facilityName}
      recordedAt={targetVisit.recordedAt}
      assistance={targetVisit.assistance}
      unmetChoices={unmetChoices}
      currentAnswer={targetVisit.currentAnswer}
      isPatientConfirmed={targetVisit.isPatientConfirmed}
      backHref={
        visits.length > 1
          ? `/pendamping/tautan/${linkId}/konfirmasi`
          : "/pendamping"
      }
    />
  );
}
