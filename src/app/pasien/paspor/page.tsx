import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import { listOwnActiveQrs } from "@/lib/consent";
import { PassportFormClient } from "./paspor-form-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Paspor Saya — AKSESPASS",
  description: "Susun kebutuhan akomodasi layanan kesehatan Anda.",
};

export default async function PasienPasporPage() {
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

  const [initialPassport, catalog, activeQrs] = await Promise.all([
    getOwnPassport(session),
    getNeedsCatalog(session),
    listOwnActiveQrs(session),
  ]);

  return (
    <PassportFormClient
      catalog={catalog}
      initialPassport={initialPassport}
      activeQrs={activeQrs}
    />
  );
}
