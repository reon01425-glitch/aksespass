import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { listLinkedPatients } from "@/lib/companions";
import { listRecoveryRequests } from "@/lib/recovery";
import { PendampingClient } from "./pendamping-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Pendamping — AKSESPASS",
  description: "Kelola kebutuhan dan kunjungan pasien yang Anda dampingi.",
};

export default async function PendampingPage() {
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

  const [data, recoveryRequests] = await Promise.all([
    listLinkedPatients(session),
    listRecoveryRequests(session),
  ]);

  return <PendampingClient data={data} recoveryRequests={recoveryRequests} />;
}
