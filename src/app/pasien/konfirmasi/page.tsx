import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    <PageShell title="Konfirmasi Kunjungan" backHref="/pasien" backLabel="Kembali ke Beranda" patientNav>
      <div className="flex flex-col gap-5 max-w-full w-full">
        <p className="text-base text-secondary">
          Konfirmasikan apakah kebutuhan Anda terpenuhi pada kunjungan di bawah ini.
          Bila tidak dijawab, status kunjungan tetap &quot;belum dikonfirmasi&quot; dan
          tidak dihitung terpenuhi.
        </p>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-cyan-800 bg-white p-5 text-center shadow-sm">
            <p className="text-base text-secondary">
              Tidak ada kunjungan yang perlu dikonfirmasi saat ini.
            </p>
          </div>
        ) : (
          <nav aria-label="Daftar Kunjungan untuk Dikonfirmasi" className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
            {items.map((item) => {
              const byLabel = item.currentAnswer
                ? BY_LABEL[item.currentAnswer.confirmedBy]
                : null;
              return (
                <Link
                  key={item.visitId}
                  href={`/pasien/konfirmasi/${item.visitId}`}
                  className="flex min-w-0 flex-col gap-1 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                >
                  <span className="break-words text-base font-bold leading-snug text-main">
                    {item.facilityName}
                  </span>
                  <span className="break-words text-xs text-secondary">
                    {formatRecordedDate(item.recordedAt)}
                    {byLabel ? ` — sudah ${byLabel}, dapat Anda ubah` : " — belum dikonfirmasi"}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </PageShell>
  );
}
