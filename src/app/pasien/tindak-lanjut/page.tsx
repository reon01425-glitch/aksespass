import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FollowUpList, PageShell } from "@/components";
import { COOKIE_NAME, SECURE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionCookie } from "@/lib/auth/session";
import { listOwnFollowUps } from "@/lib/careproof";

export const metadata: Metadata = {
  title: "Status Tindak Lanjut — AKSESPASS",
  description: "Pantau tanggapan fasilitas atas kebutuhan yang belum terpenuhi.",
};

export default async function PasienTindakLanjutPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(SECURE_COOKIE_NAME)?.value ||
    cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionCookie) redirect("/masuk");

  const session = await verifySessionCookie(sessionCookie);
  if (!session || session.role !== "patient") redirect("/masuk");

  const items = await listOwnFollowUps(session);

  return (
    <PageShell
      title="Tindak Lanjut"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-6 max-w-full w-full">
        <p className="text-base text-secondary">
          Kebutuhan yang Anda laporkan belum terpenuhi, beserta tanggapan fasilitas.
        </p>
        {items.length === 0 ? (
          <p role="status" className="text-base text-main">
            Belum ada tindak lanjut. Laporan muncul di sini bila Anda menjawab
            &quot;sebagian&quot; atau &quot;belum&quot; pada konfirmasi kunjungan.
          </p>
        ) : (
          <FollowUpList items={items} showFacility />
        )}
      </div>
    </PageShell>
  );
}
