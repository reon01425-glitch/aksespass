import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell, ServiceDoneRedirect } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { KomunikaCareClient } from "./komunikacare-client";

export const metadata: Metadata = {
  title: "KomunikaCare — AKSESPASS",
  description: "Papan bergambar, teks ke suara, dan teks langsung untuk berkomunikasi dengan petugas.",
};

export default async function PasienKomunikaCarePage({
  searchParams,
}: {
  searchParams: Promise<{ kunjungan?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const { kunjungan } = await searchParams;
  const visitId =
    kunjungan && /^[0-9a-f-]{36}$/i.test(kunjungan) ? kunjungan : null;

  return (
    <PageShell
      title="KomunikaCare"
      backHref={visitId ? `/pasien/menunggu/${visitId}` : "/pasien"}
      backLabel={visitId ? "Kembali ke Status Kunjungan" : "Kembali ke Beranda"}
      patientNav={!visitId}
    >
      {visitId && <ServiceDoneRedirect visitId={visitId} />}
      <KomunikaCareClient visitId={visitId} />
    </PageShell>
  );
}
