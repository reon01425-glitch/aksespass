import type { Metadata } from "next";
import { PageShell } from "@/components";

export const metadata: Metadata = {
  title: "QR Aktif — AKSESPASS",
};

export default function PasienAksesQrPage() {
  return (
    <PageShell
      title="QR Aktif"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-main">
          Daftar seluruh ConsentQR aktif dan riwayat pembatalan sedang dibangun (Prompt 12).
        </p>
      </div>
    </PageShell>
  );
}
