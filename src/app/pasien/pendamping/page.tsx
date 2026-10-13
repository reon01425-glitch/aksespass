import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { listOwnCompanions } from "@/lib/companions";
import { PendampingClient } from "./pendamping-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Pendamping — AKSESPASS",
  description: "Kelola pendamping yang memiliki izin mendampingi layanan Anda.",
};

export default async function PasienPendampingPage() {
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

  const companions = await listOwnCompanions(session);

  return <PendampingClient initialCompanions={companions} />;
}
