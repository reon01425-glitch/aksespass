import type { Metadata } from "next";
import { PageShell } from "@/components";

export const metadata: Metadata = {
  title: "Paspor Saya — AKSESPASS",
};

export default function PasienPasporPlaceholderPage() {
  return (
    <PageShell
      title="Paspor Saya"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-main">
          Fitur penyusunan MyCare Passport sedang dibangun (Prompt 10).
        </p>
      </div>
    </PageShell>
  );
}
