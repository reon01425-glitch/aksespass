import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnConfirmableVisit, CareProofError } from "@/lib/careproof";
import { getOwnPassport, getNeedsCatalog } from "@/lib/passport";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { PageShell, StatusBanner } from "@/components";
import { KonfirmasiClient } from "./konfirmasi-client";

export const metadata: Metadata = {
  title: "Konfirmasi Kebutuhan — AKSESPASS",
  description: "Konfirmasi apakah kebutuhan Anda terpenuhi pada kunjungan ini.",
};

export default async function PasienKonfirmasiDetailPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;

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

  let visit;
  try {
    visit = await getOwnConfirmableVisit(session, visitId);
  } catch (err) {
    if (err instanceof CareProofError) {
      return (
        <PageShell title="Konfirmasi Kebutuhan" backHref="/pasien/konfirmasi">
          <StatusBanner
            variant="error"
            title="Kunjungan Tidak Dapat Dibuka"
            message={err.message}
          />
        </PageShell>
      );
    }
    throw err;
  }

  const [passport, catalogGroups] = await Promise.all([
    getOwnPassport(session),
    getNeedsCatalog(session),
  ]);

  const ownNeedCodes = new Set(passport?.needCodes || []);
  const sharedCategorySet = new Set(visit.sharedCategories);
  const relevantGroups =
    sharedCategorySet.size > 0
      ? catalogGroups.filter((group) => sharedCategorySet.has(group.category))
      : catalogGroups;
  const unmetChoices = relevantGroups
    .flatMap((group) => group.items)
    .filter((item) => ownNeedCodes.has(item.code))
    .map((item) => ({ code: item.code, label: item.label, iconName: item.iconName }));

  return (
    <KonfirmasiClient
      visitId={visit.visitId}
      facilityName={visit.facilityName}
      recordedAt={visit.recordedAt}
      assistance={visit.assistance}
      unmetChoices={unmetChoices}
      currentAnswer={visit.currentAnswer}
      userId={session.userId}
    />
  );
}
