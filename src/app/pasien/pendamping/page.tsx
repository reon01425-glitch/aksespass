import type { Metadata } from "next";
import { PageShell } from "@/components";

export const metadata: Metadata = {
  title: "Pendamping — AKSESPASS",
};

export default function PasienPendampingPlaceholderPage() {
  return (
    <PageShell
      title="Pendamping Pasien"
      backHref="/pasien"
      backLabel="Kembali ke Beranda"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-main">
          Fitur tautan dan persetujuan pendamping sedang dibangun (Prompt 16).
        </p>
      </div>
    </PageShell>
  );
}
