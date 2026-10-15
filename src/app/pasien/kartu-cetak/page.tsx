import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_COOKIE_NAME,
  parsePreferenceCookie,
} from "@/lib/preferences";
import { KartuCetakClient } from "./kartu-cetak-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Kartu Cetak — AKSESPASS",
  description: "Cetak ringkasan kebutuhan layanan tanpa QR akses.",
};

export default async function PasienKartuCetakPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const [passport, catalog] = await Promise.all([
    getOwnPassport(session),
    getNeedsCatalog(session),
  ]);
  const preferences =
    parsePreferenceCookie(cookieStore.get(PREFERENCE_COOKIE_NAME)?.value) ??
    DEFAULT_PREFERENCES;

  return (
    <KartuCetakClient
      passport={passport}
      catalog={catalog}
      textSize={preferences.textSize}
      contrast={preferences.contrast}
    />
  );
}
