import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getNeedsCatalog, getOwnPassport } from "@/lib/passport";
import { PassportEditorClient } from "./paspor-editor-client";

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

  const [initialPassport, catalog] = await Promise.all([
    getOwnPassport(session),
    getNeedsCatalog(session),
  ]);

  return (
    <PassportEditorClient
      catalog={catalog}
      initialPassport={initialPassport}
    />
  );
}
