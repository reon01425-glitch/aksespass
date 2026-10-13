import type { Metadata } from "next";
import { getAuthReasonMessage } from "@/lib/auth/reasons";
import { MasukClient } from "./masuk-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Masuk — AKSESPASS",
  description: "Masuk atau daftar akun pasien dan pendamping AKSESPASS.",
};

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ alasan?: string }>;
}) {
  const params = await searchParams;
  const reasonMessage = getAuthReasonMessage(params.alasan);

  return <MasukClient reasonMessage={reasonMessage} />;
}
