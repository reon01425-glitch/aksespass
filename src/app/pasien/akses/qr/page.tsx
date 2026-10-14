import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { listOwnActiveQrs } from "@/lib/consent";
import { ActiveQrClient } from "./active-qr-client";

export const metadata: Metadata = {
  title: "QR Akses — AKSESPASS",
  description: "Daftar ConsentQR aktif dan pembatalan izin akses.",
};

export default async function PasienAksesQrPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") {
    redirect("/masuk");
  }

  const activeQrs = await listOwnActiveQrs(session);

  return <ActiveQrClient initialQrs={activeQrs} />;
}
