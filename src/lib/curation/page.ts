import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "../auth/constants";
import { verifySessionCookie } from "../auth/session";
import { requireActiveInstitutionPage } from "../auth/page-guard";

/** Penjaga halaman kurator: cookie sah, peran kurator, dan sesi belum dicabut di database. */
export async function requireCuratorSession() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value || cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk/petugas");
  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "curator") redirect("/masuk/petugas");
  await requireActiveInstitutionPage("curator");
  return session;
}
