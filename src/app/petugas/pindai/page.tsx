import type { Metadata } from "next";
import { PetugasPindaiClient } from "@/components";
import { requireActiveInstitutionPage } from "@/lib/auth/page-guard";


export const metadata: Metadata = {
  title: "Pindai ConsentQR — AKSESPASS",
  description: "Pindai ConsentQR pasien dengan kamera atau masukkan kode manual.",
};

export default async function PetugasPindaiPage() {
  await requireActiveInstitutionPage("staff");
  return <PetugasPindaiClient />;
}
