import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { PageShell } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { listOwnConfirmations } from "@/lib/careproof";

export const metadata: Metadata = {
  title: "Konfirmasi Kunjungan — AKSESPASS",
  description: "Konfirmasi apakah kebutuhan Anda terpenuhi pada kunjungan terbaru.",
};

const BY_LABEL: Record<string, string> = {
  companion: "dijawab oleh pendamping",
  on_site: "dijawab di tempat",
};

function formatRecordedDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PasienKonfirmasiPage() {
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

  const items = await listOwnConfirmations(session);

  return (
    <PageShell title="Konfirmasi Kunjungan" backHref="/pasien" backLabel="Kembali ke Beranda">
      <div className="flex flex-col gap-6 max-w-full w-full">
        <p className="text-base text-secondary">
          Konfirmasikan apakah kebutuhan Anda terpenuhi pada kunjungan di bawah ini.
          Bila tidak dijawab, status kunjungan tetap &quot;belum dikonfirmasi&quot; dan
          tidak dihitung terpenuhi.
        </p>

        {items.length === 0 ? (
          <div className="p-5 rounded-2xl bg-surface border border-cyan-200 text-center">
            <p className="text-base text-secondary">
              Tidak ada kunjungan yang perlu dikonfirmasi saat ini.
            </p>
          </div>
        ) : (
          <nav aria-label="Daftar Kunjungan untuk Dikonfirmasi" className="flex flex-col gap-4">
            {items.map((item) => {
              const byLabel = item.currentAnswer
                ? BY_LABEL[item.currentAnswer.confirmedBy]
                : null;
              return (
                <Link
                  key={item.visitId}
                  href={`/pasien/konfirmasi/${item.visitId}`}
                  className="flex items-start justify-between p-5 rounded-2xl bg-white border border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors shadow-sm min-h-12"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="p-3 rounded-xl bg-cyan-100 text-cyan-900 shrink-0">
                      <ClipboardCheck className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-lg font-bold text-main break-words">
                        {item.facilityName}
                      </span>
                      <span className="text-sm text-secondary mt-1 break-words">
                        {formatRecordedDate(item.recordedAt)}
                        {byLabel ? ` — sudah ${byLabel}, dapat Anda ubah` : " — belum dikonfirmasi"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 text-secondary shrink-0 mt-3 ml-2"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </PageShell>
  );
}
