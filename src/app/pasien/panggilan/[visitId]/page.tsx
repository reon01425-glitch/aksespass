import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ServiceDoneRedirect } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getOwnWaitingState } from "@/lib/visits";
import { PanggilanClient } from "./panggilan-client";

export const metadata: Metadata = {
  title: "Giliran Anda — AKSESPASS",
};

export default async function PasienPanggilanPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const { visitId } = await params;
  const state = await getOwnWaitingState(session, visitId);
  if (!state) redirect("/pasien");
  if (state.phase === "dilayani") redirect(`/pasien/konfirmasi/${state.visitId}`);
  // Belum dipanggil: kembali ke layar menunggu.
  if (state.phase === "menunggu") redirect(`/pasien/menunggu/${state.visitId}`);

  return (
    <>
      <ServiceDoneRedirect visitId={state.visitId} />
      <PanggilanClient
        visitId={state.visitId}
        facilityName={state.facilityName}
        initialRoom={state.room}
        initialCalledAt={state.calledAt}
      />
    </>
  );
}
