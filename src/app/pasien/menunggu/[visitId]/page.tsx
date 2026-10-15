import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import { getOwnWaitingState } from "@/lib/visits";
import { MenungguClient } from "./menunggu-client";

export const metadata: Metadata = {
  title: "Menunggu Dipanggil — AKSESPASS",
};

export default async function PasienMenungguPage({
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
  // Bantuan sudah dicatat petugas: lanjut ke konfirmasi (P16).
  if (state.phase === "dilayani") redirect(`/pasien/konfirmasi/${state.visitId}`);

  const [passport, catalog] = await Promise.all([
    getOwnPassport(session),
    getNeedsCatalog(session),
  ]);

  const shared = new Set(state.sharedFields);
  const ownCodes = new Set(passport?.needCodes ?? []);
  const needs = catalog
    .filter((g) => shared.has(g.category))
    .flatMap((g) => g.items)
    .filter((item) => ownCodes.has(item.code));
  const note =
    shared.has("catatan_pasien") && passport?.patientNote
      ? passport.patientNote
      : null;

  return (
    <PageShell title="Menunggu Dipanggil" backHref="/pasien" backLabel="Ke Beranda">
      <MenungguClient
        visitId={state.visitId}
        facilityName={state.facilityName}
        initialPhase={state.phase}
        summary={{
          preferredName: passport?.preferredName ?? "",
          needs,
          patientNote: note,
        }}
      />
    </PageShell>
  );
}
