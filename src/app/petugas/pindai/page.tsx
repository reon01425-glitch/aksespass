import type { Metadata } from "next";
import { PageShell } from "@/components";

export const metadata: Metadata = {
  title: "Pindai ConsentQR — AKSESPASS",
};

export default function PetugasPindaiPlaceholderPage() {
  return (
    <PageShell
      title="Pindai ConsentQR"
      backHref="/petugas"
      backLabel="Kembali ke Beranda Petugas"
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-main">
          Fitur pemindai kamera ConsentQR sedang dibangun (Prompt 13).
        </p>
      </div>
    </PageShell>
  );
}
