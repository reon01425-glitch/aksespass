"use client";

import React, { useState } from "react";
import { Button } from "./button";
import { StatusBanner } from "./status-banner";

export interface RecoveryNoticeProps {
  requestId: string;
  initiatorName: string;
  initiatedByMe: boolean;
  maskedNewPhone: string;
  /** ISO waktu nomor mulai dapat diganti. */
  eligibleAt: string;
  /** "patient": pasien yang akunnya dipindahkan; "companion": pendamping (pengaju atau lainnya). */
  audience: "patient" | "companion";
  /** Nama pasien untuk teks pendamping. */
  patientName?: string;
}

function fmt(iso: string): string {
  return (
    new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(
      new Date(iso)
    ) + " WIB"
  );
}

/** Pemberitahuan permintaan pemulihan nomor akun dengan tombol batal (pasien atau pendamping aktif mana pun). */
export function RecoveryNotice({
  requestId,
  initiatorName,
  initiatedByMe,
  maskedNewPhone,
  eligibleAt,
  audience,
  patientName,
}: RecoveryNoticeProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pemulihan/${requestId}/batal`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Gagal membatalkan. Coba lagi.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Koneksi gagal. Periksa koneksi internet Anda.");
    } finally {
      setBusy(false);
    }
  };

  let message: string;
  if (audience === "patient") {
    message = `${initiatorName} mengajukan pemindahan akun Anda ke nomor ${maskedNewPhone}. Nomor akun baru diganti setelah ${fmt(eligibleAt)}. Jika Anda tidak setuju, batalkan sekarang.`;
  } else if (initiatedByMe) {
    message = `Anda mengajukan pemindahan akun ${patientName ?? "pasien"} ke nomor ${maskedNewPhone}. Pasien masuk dengan nomor baru itu setelah ${fmt(eligibleAt)}.`;
  } else {
    message = `${initiatorName} mengajukan pemindahan akun ${patientName ?? "pasien yang Anda dampingi"} ke nomor ${maskedNewPhone}. Nomor diganti setelah ${fmt(eligibleAt)}. Batalkan bila Anda tidak mengenalinya.`;
  }

  return (
    <div className="flex flex-col gap-2">
      <StatusBanner
        variant="warning"
        title="Pemulihan Nomor Akun Diajukan"
        message={message}
        action={
          <Button variant="secondary" onClick={cancel} isLoading={busy} className="w-full">
            Batalkan Permintaan
          </Button>
        }
      />
      {error && <StatusBanner variant="error" title="Belum berhasil" message={error} />}
    </div>
  );
}
