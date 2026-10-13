import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageShell, StatusBanner } from "@/components";
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
  searchParams: Promise<{ status?: string; unmet?: string }>;
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

  return (
    <PageShell title="Jawaban Tersimpan">
      <div className="flex flex-col gap-6 max-w-full w-full">
        <StatusBanner
          variant="success"
          title="Terima kasih, jawaban tersimpan"
          message="Jawaban Anda telah tercatat."
        />

        {statusLabel && (
          <section aria-labelledby="heading-ringkasan" className="flex flex-col gap-3">
            <h2
              id="heading-ringkasan"
              className="text-base font-bold text-main border-b border-cyan-100 pb-2"
            >
              Ringkasan Jawaban
            </h2>
            <p className="text-base text-main">
              Status kebutuhan:{" "}
              <span className="font-bold">{statusLabel}</span>
            </p>

            {unmetLabels.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-secondary">Kebutuhan yang belum terpenuhi:</p>
                <ul className="flex flex-col gap-1 list-disc pl-5">
                  {unmetLabels.map((label) => (
                    <li key={label} className="text-base text-main break-words">
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <Link
          href="/pasien"
          className="flex items-center justify-center min-h-[48px] w-full px-6 py-3 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center text-lg"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </PageShell>
  );
}
