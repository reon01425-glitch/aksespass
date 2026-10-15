import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getLinkedPatientByLinkId } from "@/lib/companions";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import { PassportFormClient } from "@/app/pasien/paspor/paspor-form-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Kelola Paspor Pasien — AKSESPASS",
  description: "Kelola paspor akomodasi atas nama pasien yang Anda dampingi.",
};

export default async function CompanionPassportPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;
  if (!linkId) {
    notFound();
  }

  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "companion") {
    redirect("/masuk");
  }

  let patient;
  try {
    patient = await getLinkedPatientByLinkId(session, linkId);
  } catch {
    notFound();
  }

  const [initialPassport, catalog] = await Promise.all([
    getOwnPassport(session, patient.patientUserId),
    getNeedsCatalog(session),
  ]);

  return (
    <PassportFormClient
      catalog={catalog}
      initialPassport={initialPassport}
      activeQrs={[]}
      ownerId={`${session.userId}:${linkId}`}
      companion={{
        patientName: patient.preferredName,
        submitUrl: `/api/pendamping/tautan/${linkId}/paspor`,
        backHref: "/pendamping",
        qrHref: `/pendamping/tautan/${linkId}/qr`,
      }}
    />
  );
}
