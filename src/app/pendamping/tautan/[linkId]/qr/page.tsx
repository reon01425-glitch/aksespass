import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell, StatusBanner } from "@/components";
import { KunjunganClient } from "@/app/pasien/kunjungan/kunjungan-client";
import { ConsentQrFlowClient } from "@/app/pasien/kunjungan/qr/consent-qr-flow-client";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getLinkedPatientByLinkId } from "@/lib/companions";
import {
  countActiveConsents,
  getLastConsentSharedFields,
  listOwnActiveQrs,
} from "@/lib/consent";
import { CompanionActiveQrList } from "./companion-active-qr-list";
import { getActiveFacilities } from "@/lib/facility";
import { getAppOrigin } from "@/lib/http";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";

export const instant = false;

export const metadata: Metadata = {
  title: "ConsentQR atas Nama Pasien — AKSESPASS",
  description: "Buat ConsentQR atas nama pasien yang Anda dampingi.",
};

interface CompanionQrPageProps {
  params: Promise<{ linkId: string }>;
  searchParams: Promise<{ fasilitas?: string }>;
}

export default async function CompanionQrPage({
  params,
  searchParams,
}: CompanionQrPageProps) {
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

  let patient;
  try {
    patient = await getLinkedPatientByLinkId(session, linkId);
  } catch {
    notFound();
  }

  const passport = await getOwnPassport(session, patient.patientUserId);
  const hasPassport = passport !== null && passport.needCodes.length > 0;

  if (!hasPassport) {
    return (
      <PageShell
        title={`ConsentQR: ${patient.preferredName}`}
        backHref="/pendamping"
        backLabel="Kembali ke Beranda Pendamping"
      >
        <div className="flex flex-col gap-6 max-w-full w-full">
          <StatusBanner
            variant="warning"
            title="Paspor belum diisi"
            message={`Paspor untuk ${patient.preferredName} belum memiliki kebutuhan layanan. Lengkapi paspor sebelum membuat ConsentQR.`}
          />
          <div>
            <Link
              href={`/pendamping/tautan/${linkId}/paspor`}
              className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center"
            >
              Isi Paspor {patient.preferredName}
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const { fasilitas: facilityId } = await searchParams;
  const facilities = await getActiveFacilities(session);

  // Jika belum memilih fasilitas, tampilkan QR aktif dan pemilih faskes
  if (!facilityId) {
    const activeQrs = await listOwnActiveQrs(session, {
      targetPatientUserId: patient.patientUserId,
    });
    return (
      <PageShell
        title={`Pilih Fasilitas — ${patient.preferredName}`}
        backHref="/pendamping"
        backLabel="Kembali ke Beranda Pendamping"
      >
        <div className="flex flex-col gap-4 max-w-full w-full">
          <CompanionActiveQrList
            initialQrs={activeQrs}
            patientName={patient.preferredName}
          />
          <p className="text-sm text-secondary">
            Pilih fasilitas tempat Anda mendampingi {patient.preferredName} untuk membuat ConsentQR.
          </p>
          <KunjunganClient
            facilities={facilities}
            targetUrlPrefix={`/pendamping/tautan/${linkId}/qr`}
          />
        </div>
      </PageShell>
    );
  }

  const selectedFacility = facilities.find((f) => f.id === facilityId);
  if (!selectedFacility) {
    redirect(`/pendamping/tautan/${linkId}/qr`);
  }

  const [catalog, lastSharedFields, activeQrCount] = await Promise.all([
    getNeedsCatalog(session),
    getLastConsentSharedFields(session, patient.patientUserId),
    countActiveConsents(session, { targetPatientUserId: patient.patientUserId }),
  ]);

  const appOrigin = getAppOrigin();
  const catalogMap = new Map(
    catalog.flatMap((group) => group.items).map((item) => [item.code, item])
  );
  const passportNeeds = passport.needCodes
    .map((code) => catalogMap.get(code))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <PageShell
      title={`ConsentQR: ${patient.preferredName}`}
      backHref={`/pendamping/tautan/${linkId}/qr`}
      backLabel="Ganti Fasilitas"
    >
      <ConsentQrFlowClient
        facility={selectedFacility}
        passport={{
          preferredName: passport.preferredName,
          needs: passportNeeds,
          patientNote: passport.patientNote,
        }}
        lastSharedFields={lastSharedFields}
        initialActiveCount={activeQrCount}
        appOrigin={appOrigin}
        createConsentUrl={`/api/pendamping/tautan/${linkId}/qr`}
        patientLabel={`Atas nama ${patient.preferredName}`}
        cancelHref={`/pendamping/tautan/${linkId}/qr`}
        homeHref="/pendamping"
      />
    </PageShell>
  );
}
