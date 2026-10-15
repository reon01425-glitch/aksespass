import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getAccountOverview } from "@/lib/account";
import { HapusAkunClient } from "./hapus-akun-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Hapus Data dan Akun — AKSESPASS",
  description: "Hapus data dan akun pasien dengan kode verifikasi.",
};

export default async function PasienHapusAkunPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const overview = await getAccountOverview(session);

  return (
    <HapusAkunClient
      maskedPhone={overview.maskedPhone}
      statsConsent={overview.statsConsent}
    />
  );
}
