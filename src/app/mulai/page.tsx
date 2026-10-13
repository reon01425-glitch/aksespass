import type { Metadata } from "next";
import { MulaiClient } from "./mulai-client";

export const metadata: Metadata = {
  title: "Mulai — AKSESPASS",
  description: "Pengaturan awal aksesibilitas tampilan dan bahasa.",
};

export default function MulaiPage() {
  return <MulaiClient />;
}
