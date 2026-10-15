import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";
import { listFacilityActions } from "@/lib/facility-actions";
import { PageShell } from "@/components";
import { ActionListClient } from "./action-list-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Tindak Lanjut — AKSESPASS",
  description: "Tindak lanjut fasilitas atas kebutuhan yang belum terpenuhi.",
};

export default async function TindakLanjutAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ baru?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "facility_admin") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("facility_admin");

  const items = await listFacilityActions(session);
  const { baru } = await searchParams;
  return (
    <PageShell title="Tindak Lanjut" backHref="/admin/belum-terpenuhi" backLabel="Kembali ke Belum Terpenuhi">
      <ActionListClient initialItems={items} highlightId={baru ?? null} />
    </PageShell>
  );
}
