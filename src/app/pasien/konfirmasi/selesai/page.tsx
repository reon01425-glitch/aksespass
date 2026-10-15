import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FollowUpList, PageShell, PendingConfirmationSync, StatusBanner } from "@/components";
import { listOwnFollowUps } from "@/lib/careproof";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { getNeedsCatalog } from "@/lib/passport";

export const metadata: Metadata = {
  title: "Jawaban Tersimpan — AKSESPASS",
  description: "Ringkasan jawaban konfirmasi kebutuhan Anda.",
};

const STATUS_LABEL: Record<string, string> = {
  terpenuhi: "Terpenuhi",
  sebagian: "Sebagian",
  belum: "Belum",
};

export default async function PasienKonfirmasiSelesaiPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; unmet?: string; visit?: string; pending?: string }>;
}) {
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

  const params = await searchParams;
  const status = params.status && STATUS_LABEL[params.status] ? params.status : null;
  const unmetCodes = (params.unmet || "").split(",").filter(Boolean);

  let unmetLabels: string[] = [];
  if (unmetCodes.length > 0) {
    const catalogGroups = await getNeedsCatalog(session);
    const labelByCode = new Map<string, string>();
    for (const group of catalogGroups) {
      for (const item of group.items) {
        labelByCode.set(item.code, item.label);
      }
    }
    unmetLabels = unmetCodes.map((code) => labelByCode.get(code) || code);
  }

  const statusLabel = status ? STATUS_LABEL[status] : null;
  const isPending = params.pending === "1";
  const followUps =
    !isPending && params.visit
      ? await listOwnFollowUps(session, { visitId: params.visit })
      : [];

  return (
    <PageShell title="Jawaban Tersimpan" patientNav>
      <div className="flex flex-col gap-5 max-w-full w-full">
        {isPending ? (
          <StatusBanner
            variant="warning"
            title="Menunggu sinkron"
            message="Anda sedang offline. Jawaban tersimpan di perangkat dan terkirim otomatis saat online."
          />
        ) : (
          <StatusBanner
            variant="success"
            title="Terima kasih, jawaban tersimpan"
            message="Jawaban Anda telah tercatat."
          />
        )}
        <PendingConfirmationSync userId={session.userId} />

        {statusLabel && (
          <section
            aria-labelledby="heading-ringkasan"
            className="flex flex-col gap-1 rounded-2xl bg-cyan-700 p-5 text-white shadow-md"
          >
            <h2 id="heading-ringkasan" className="text-xs font-bold uppercase tracking-wider text-white">
              Ringkasan Jawaban
            </h2>
            <p className="text-lg font-bold text-white">
              Status kebutuhan: {statusLabel}
            </p>
          </section>
        )}

        {unmetLabels.length > 0 && (
          <section aria-labelledby="heading-belum" className="flex flex-col gap-3">
            <h2 id="heading-belum" className="text-lg font-bold text-main">
              Kebutuhan yang Belum Terpenuhi
            </h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
              {unmetLabels.map((label) => (
                <li
                  key={label}
                  className="min-w-0 break-words rounded-2xl border border-cyan-800 bg-white p-4 text-base font-bold text-main shadow-sm"
                >
                  {label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {followUps.length > 0 && (
          <section aria-labelledby="heading-tindak-lanjut" className="flex flex-col gap-3">
            <h2
              id="heading-tindak-lanjut"
              className="text-lg font-bold text-main"
            >
              Status Tindak Lanjut
            </h2>
            <FollowUpList items={followUps} />
            <Link
              href="/pasien/tindak-lanjut"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-cyan-800 bg-white px-4 py-3 text-base font-bold text-cyan-900 shadow-sm transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              Lihat semua tindak lanjut
            </Link>
          </section>
        )}

        <Link
          href="/pasien"
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-center text-base font-bold text-white shadow-md transition-colors hover:bg-cyan-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </PageShell>
  );
}
