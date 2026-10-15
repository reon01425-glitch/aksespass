import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getLinkedPatientByLinkId } from "@/lib/companions";
import { getRecoveryCooldownMinutes, listRecoveryRequests } from "@/lib/recovery";
import { PemulihanClient } from "./pemulihan-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Pemulihan Nomor Akun — AKSESPASS",
  description: "Pindahkan akun pasien ke nomor baru lewat pendamping tertaut.",
};

export default async function PemulihanPage({ params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "companion") redirect("/masuk");

  let patient;
  try {
    patient = await getLinkedPatientByLinkId(session, linkId);
  } catch {
    notFound();
  }
  const requests = await listRecoveryRequests(session);
  const existing = requests.find((r) => r.linkId === linkId) ?? null;

  const mins = getRecoveryCooldownMinutes();
  const cooldownLabel = mins % 60 === 0 && mins >= 60 ? `${mins / 60} jam` : `${mins} menit`;

  return (
    <PemulihanClient
      linkId={linkId}
      patientName={patient.preferredName}
      existing={existing}
      cooldownLabel={cooldownLabel}
    />
  );
}
