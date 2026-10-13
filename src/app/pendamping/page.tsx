import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_NAME,
  SECURE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { LogoutButton, PageShell } from "@/components";
import { Users } from "lucide-react";

export const instant = false;

export const metadata: Metadata = {
  title: "Beranda Pendamping — AKSESPASS",
  description: "Beranda pendamping pasien untuk mengelola kebutuhan pasien yang didampingi.",
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

  return (
    <PageShell title="Beranda Pendamping">
      <div className="flex flex-col gap-6">
        <div className="p-4 rounded-xl border border-cyan-800 bg-surface flex items-center gap-3">
          <Users aria-hidden="true" className="w-6 h-6 text-cyan-800 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs text-secondary">Peran Pengguna:</span>
            <span className="text-base font-bold text-main">Pendamping Pasien</span>
          </div>
        </div>

        <section aria-labelledby="heading-pendamping-info" className="flex flex-col gap-3">
          <h2 id="heading-pendamping-info" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
            Status Prototipe
          </h2>
          <div className="p-4 rounded-xl border border-dashed border-cyan-400 bg-surface flex flex-col gap-2">
            <p className="text-sm font-bold text-main">
              Modul Pendamping Pasien sedang dibangun (Prompt 16).
            </p>
            <p className="text-xs text-secondary">
              Fitur tautan persetujuan pasien, pendampingan kunjungan, dan pengisian paspor atas nama pasien akan tersedia pada pembaruan berikutnya.
            </p>
          </div>
        </section>

        <div className="pt-4 border-t border-cyan-100">
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
