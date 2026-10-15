import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { listStaff } from "@/lib/staff";
import { PageShell } from "@/components";
import { StaffListClient } from "./staff-list-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Kelola Akun Petugas — AKSESPASS",
  description: "Daftar, tambah, dan nonaktifkan akun petugas fasilitas.",
};

export default async function AdminPetugasPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "facility_admin") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("facility_admin");

  const staff = await listStaff(session);
  return (
    <PageShell title="Kelola Akun Petugas" backHref="/admin" backLabel="Kembali ke Beranda Admin" adminNav>
      <StaffListClient initialStaff={staff} />
    </PageShell>
  );
}
