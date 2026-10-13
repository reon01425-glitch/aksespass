import type { Metadata } from "next";
import { PageShell } from "@/components";

export const metadata: Metadata = {
  title: "Kontrol Akses — AKSESPASS",
};

export default function PasienAksesPlaceholderPage() {
  return (
    <PageShell
      title="Kontrol Akses"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-main">
          Fitur riwayat akses dan pembatalan ConsentQR sedang dibangun (Prompt 12).
        </p>
      </div>
    </PageShell>
  );
}
