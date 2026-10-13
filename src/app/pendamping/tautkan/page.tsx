import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { TautkanClient } from "./tautkan-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Tautkan ke Pasien — AKSESPASS",
  description: "Masukkan kode dari pasien untuk mengajukan tautan pendamping.",
};

export default async function TautkanPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/masuk");
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "companion") {
    redirect("/masuk");
  }

  return <TautkanClient />;
}
