import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnAccessHistory } from "@/lib/audit";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { countActiveConsents } from "@/lib/consent";
import { getActiveFacilities } from "@/lib/facility";
import { listOwnVisitHistory } from "@/lib/careproof";
import { RiwayatAksesClient } from "./riwayat-akses-client";

export const metadata: Metadata = {
  title: "Riwayat Akses — AKSESPASS",
  description: "Lihat riwayat pembukaan data dan detail kunjungan Anda.",
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

  const [history, activeCount, facilities, visits] = await Promise.all([
    getOwnAccessHistory(session),
    countActiveConsents(session),
    getActiveFacilities(session).catch(() => []),
    listOwnVisitHistory(session),
  ]);

  // Kumpulkan fasilitas unik yang tersedia untuk opsi filter
  const facilityNamesSet = new Set<string>();
  for (const f of facilities) {
    if (f.name) facilityNamesSet.add(f.name);
  }
  for (const item of [...history, ...visits]) {
    if (item.facilityName) facilityNamesSet.add(item.facilityName);
  }
  const availableFacilities = Array.from(facilityNamesSet).sort();

  return (
    <RiwayatAksesClient
      initialHistory={history}
      initialActiveCount={activeCount}
      availableFacilities={availableFacilities}
      initialVisits={visits}
    />
  );
}
