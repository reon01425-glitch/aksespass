import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, StatusBanner } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getActiveFacilities } from "@/lib/facility";
import { getOwnPassport } from "@/lib/passport";
import { KunjunganClient } from "./kunjungan-client";

export const metadata: Metadata = {
  title: "Mulai Kunjungan — AKSESPASS",
};

export default async function PasienKunjunganPage() {
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

  const passport = await getOwnPassport(session);
  const hasPassport = passport !== null && passport.needCodes.length > 0;

  if (!hasPassport) {
    return (
      <PageShell
        title="Mulai Kunjungan"
        backHref="/pasien"
        backLabel="Kembali ke Beranda"
      >
        <div className="flex flex-col gap-6 max-w-full w-full">
          <StatusBanner
            variant="warning"
            title="Isi paspor dulu"
            message="Anda perlu mengisi MyCare Passport sebelum dapat membagikan kebutuhan ke fasilitas kesehatan."
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

  const facilities = await getActiveFacilities(session);

  return (
    <PageShell
      title="Mulai Kunjungan"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-6 max-w-full w-full">
        <KunjunganClient facilities={facilities} showPatientShortcuts />
      </div>
    </PageShell>
  );
}
