import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_COOKIE_NAME,
  parsePreferenceCookie,
} from "@/lib/preferences";
import { getAccountOverview } from "@/lib/account";
import { AkunClient } from "./akun-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Akun — AKSESPASS",
  description: "Ubah tampilan aksesibilitas dan keluar dari akun pasien.",
};

export default async function PasienAkunPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const preferences =
    parsePreferenceCookie(cookieStore.get(PREFERENCE_COOKIE_NAME)?.value) ??
    DEFAULT_PREFERENCES;

  const overview = await getAccountOverview(session);

  return (
    <AkunClient
      initialPreferences={preferences}
      maskedPhone={overview.maskedPhone}
      activeCompanions={overview.activeCompanions}
    />
  );
}
