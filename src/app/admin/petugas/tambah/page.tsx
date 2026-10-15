import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { PageShell } from "@/components";
import { StaffFormClient } from "../staff-form-client";

export const instant = false;
export const metadata: Metadata = { title: "Tambah Petugas — AKSESPASS" };

export default async function TambahPetugasPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "facility_admin") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("facility_admin");
  return (
    <PageShell title="Tambah Petugas" backHref="/admin/petugas" backLabel="Kembali ke Akun Petugas">
      <StaffFormClient mode="tambah" />
    </PageShell>
  );
}
