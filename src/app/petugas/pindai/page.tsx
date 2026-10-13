import type { Metadata } from "next";
import { PetugasPindaiClient } from "@/components";


export const metadata: Metadata = {
  title: "Pindai ConsentQR — AKSESPASS",
  description: "Pindai ConsentQR pasien dengan kamera atau masukkan kode manual.",
};

export default function PetugasPindaiPage() {
  return <PetugasPindaiClient />;
}
