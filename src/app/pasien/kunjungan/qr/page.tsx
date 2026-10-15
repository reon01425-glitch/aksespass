import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, StatusBanner } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { countActiveConsents, getLastConsentSharedFields } from "@/lib/consent";
import { getActiveFacilities } from "@/lib/facility";
import { getAppOrigin } from "@/lib/http";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import { ConsentQrFlowClient } from "./consent-qr-flow-client";

export const metadata: Metadata = {
  title: "ConsentQR Kunjungan — AKSESPASS",
};

interface PasienKunjunganQrPageProps {
  searchParams: Promise<{ fasilitas?: string }>;
}

export default async function PasienKunjunganQrPage({
  searchParams,
}: PasienKunjunganQrPageProps) {
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

  const { fasilitas: facilityId } = await searchParams;
  if (!facilityId) {
    redirect("/pasien/kunjungan");
  }

  // 1. Ambil paspor dan katalog kebutuhan
  const [passport, catalog] = await Promise.all([
    getOwnPassport(session),
    getNeedsCatalog(session),
  ]);

  if (!passport || passport.needCodes.length === 0) {
    return (
      <PageShell
        title="Pengaturan ConsentQR"
        backHref="/pasien/kunjungan"
        backLabel="Kembali ke Pilih Fasilitas"
      >
        <div className="flex flex-col gap-6 max-w-full w-full">
          <StatusBanner
            variant="warning"
            title="Isi paspor dulu"
            message="Anda perlu mengisi MyCare Passport sebelum dapat membuat ConsentQR."
          />
          <div>
            <Link
              href="/pasien/paspor"
              className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center"
            >
              Isi Paspor
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // 2. Ambil informasi faskes
  const facilities = await getActiveFacilities(session);
  const selectedFacility = facilities.find((f) => f.id === facilityId);

  if (!selectedFacility) {
    redirect("/pasien/kunjungan");
  }

  // 3. Ambil consent terakhir dan jumlah QR aktif
  const [lastSharedFields, activeQrCount] = await Promise.all([
    getLastConsentSharedFields(session),
    countActiveConsents(session),
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
      title="ConsentQR Kunjungan"
      backHref="/pasien/kunjungan"
      backLabel="Kembali ke Pilih Fasilitas"
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
        waitingHrefBase="/pasien/menunggu"
      />
    </PageShell>
  );
}
