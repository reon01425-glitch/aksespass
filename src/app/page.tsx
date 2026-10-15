import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import {
  PREFERENCE_COOKIE_NAME,
  parsePreferenceCookie,
  resolveRootDestination,
} from "@/lib/preferences";
import { SplashClient } from "./splash-client";

export const instant = false;

export const metadata: Metadata = {
  title: "AKSESPASS",
  description:
    "Sampaikan kebutuhan layanan kesehatan dengan kontrol persetujuan di tangan pasien.",
};

/**
 * [P1] Splash Screen: menampilkan logo, tagline, dan indikator memuat secara
 * singkat (dapat dilewati), lalu mengarahkan ke beranda peran atau alur
 * orientasi berdasarkan ada/tidaknya sesi dan cookie preferensi.
 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  const claims = sessionCookie
    ? await verifySessionCookie(sessionCookie)
    : null;

  const prefRaw = cookieStore.get(PREFERENCE_COOKIE_NAME)?.value;
  const hasPref = Boolean(prefRaw && parsePreferenceCookie(prefRaw));

  const destination = resolveRootDestination(claims, hasPref);
  return <SplashClient destination={destination} />;
}
