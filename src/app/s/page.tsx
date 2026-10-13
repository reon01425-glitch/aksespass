import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { SPageClient } from "./s-client";


export const metadata: Metadata = {
  title: "Pemeriksaan ConsentQR — AKSESPASS",
  description: "Tujuan pemindaian kode ConsentQR pasien oleh petugas.",
};

export default async function SPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  let isStaff = false;
  if (sessionCookie) {
    const session = await verifySessionCookie(sessionCookie);
    if (session && session.role === "staff") {
      isStaff = true;
    }
  }

  return <SPageClient isStaff={isStaff} />;
}
