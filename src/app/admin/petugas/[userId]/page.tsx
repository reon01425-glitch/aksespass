import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { listStaff } from "@/lib/staff";
import { PageShell } from "@/components";
import { StaffFormClient } from "../staff-form-client";

export const instant = false;
export const metadata: Metadata = { title: "Ubah Petugas — AKSESPASS" };

export default async function UbahPetugasPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "facility_admin") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("facility_admin");

  const { userId } = await params;
  const item = (await listStaff(session)).find((s) => s.userId === userId);
  if (!item) notFound();
  return (
    <PageShell title="Ubah Petugas" backHref="/admin/petugas" backLabel="Kembali ke Akun Petugas" adminNav>
      <StaffFormClient
        mode="ubah"
        userId={item.userId}
        initial={{ name: item.name, unit: item.unit, phoneMasked: item.phoneMasked }}
      />
    </PageShell>
  );
}
