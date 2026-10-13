import type { Metadata } from "next";
import { getAuthReasonMessage } from "@/lib/auth/reasons";
import { MasukPetugasClient } from "./masuk-petugas-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Masuk Petugas — AKSESPASS",
  description: "Masuk untuk petugas fasilitas kesehatan, admin fasilitas, dan kurator AKSESPASS.",
};

export default async function MasukPetugasPage({
  searchParams,
}: {
  searchParams: Promise<{ alasan?: string }>;
}) {
  const params = await searchParams;
  const reasonMessage = getAuthReasonMessage(params.alasan);

  return <MasukPetugasClient reasonMessage={reasonMessage} />;
}
