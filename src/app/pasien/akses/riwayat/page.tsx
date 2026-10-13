import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components";
import { getOwnAccessHistory } from "@/lib/audit";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { countActiveConsents } from "@/lib/consent";
import { getActiveFacilities } from "@/lib/facility";
import { RiwayatAksesClient } from "./riwayat-akses-client";

export const metadata: Metadata = {
  title: "Riwayat Akses — AKSESPASS",
  description: "Riwayat pembukaan data profil kebutuhan oleh petugas fasilitas.",
};

export default async function PasienRiwayatAksesPage() {
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

  const [history, activeCount, facilities] = await Promise.all([
    getOwnAccessHistory(session),
    countActiveConsents(session),
    getActiveFacilities(session).catch(() => []),
  ]);

  // Kumpulkan fasilitas unik yang tersedia untuk opsi filter
  const facilityNamesSet = new Set<string>();
  for (const f of facilities) {
    if (f.name) facilityNamesSet.add(f.name);
  }
  for (const h of history) {
    if (h.facilityName) facilityNamesSet.add(h.facilityName);
  }
  const availableFacilities = Array.from(facilityNamesSet).sort();

  return (
    <PageShell
      title="Riwayat Akses"
      backHref="/pasien/akses"
      backLabel="Kembali ke Kontrol Akses"
    >
      <RiwayatAksesClient
        initialHistory={history}
        initialActiveCount={activeCount}
        availableFacilities={availableFacilities}
      />
    </PageShell>
  );
}
