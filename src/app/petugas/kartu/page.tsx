import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { getNeedsCatalog } from "@/lib/passport";
import { KartuPetugasClient } from "./kartu-petugas-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Pasien dengan Kartu Cetak — AKSESPASS",
  description: "Catat kunjungan pasien dari Kode Kartu dan kebutuhan yang tertulis di kartu cetak.",
};

export default async function PetugasKartuPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "staff") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("staff");

  const catalog = await getNeedsCatalog(session);
  return <KartuPetugasClient catalog={catalog} />;
}
