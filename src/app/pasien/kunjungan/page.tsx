import type { Metadata } from "next";
import { PageShell } from "@/components";

export const metadata: Metadata = {
  title: "Mulai Kunjungan — AKSESPASS",
};

export default function PasienKunjunganPlaceholderPage() {
  return (
    <PageShell
      title="Mulai Kunjungan"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-main">
          Fitur mulai kunjungan dan ConsentQR sedang dibangun (Prompt 11 & 12).
        </p>
      </div>
    </PageShell>
  );
}
