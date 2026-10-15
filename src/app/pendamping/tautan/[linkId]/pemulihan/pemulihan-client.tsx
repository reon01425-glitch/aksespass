"use client";

import React from "react";
import { OtpActionForm, PageShell, RecoveryNotice, StatusBanner } from "@/components";
import type { RecoveryRequestItem } from "@/lib/recovery";

export function PemulihanClient({
  linkId,
  patientName,
  existing,
  cooldownLabel,
}: {
  linkId: string;
  patientName: string;
  existing: RecoveryRequestItem | null;
  cooldownLabel: string;
}) {
  return (
    <PageShell
      title={`Pemulihan Nomor: ${patientName}`}
      backHref="/pendamping"
      backLabel="Kembali ke Beranda Pendamping"
    >
      <div className="flex flex-col gap-5 max-w-full w-full">
        <section className="flex flex-col gap-2 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-main">Pasien kehilangan nomor lama?</h2>
          <p className="text-sm text-main">
            Anda dapat memindahkan akun {patientName} ke nomor baru. Seluruh riwayat, paspor, dan tautan
            pendamping tetap ada karena yang berganti hanya nomor masuknya.
          </p>
          <ul className="list-disc pl-5 text-sm text-secondary">
            <li>Kode verifikasi dikirim ke nomor baru, untuk membuktikan nomor itu bisa dipakai.</li>
            <li>Ada jeda keselamatan {cooldownLabel}. Selama jeda, pasien dan pendamping lain dapat membatalkan.</li>
            <li>Setelah jeda, pasien masuk dengan nomor baru dan nomor lama tidak lagi terhubung ke akun ini.</li>
          </ul>
        </section>

        {existing ? (
          <RecoveryNotice
            requestId={existing.id}
            initiatorName={existing.initiatorName}
            initiatedByMe={existing.initiatedByMe}
            maskedNewPhone={existing.maskedNewPhone}
            eligibleAt={existing.eligibleAt}
            audience="companion"
            patientName={patientName}
          />
        ) : (
          <section className="flex flex-col gap-3">
            <StatusBanner
              variant="warning"
              title="Pastikan atas izin pasien"
              message="Ajukan hanya bila pasien benar-benar tidak dapat memakai nomor lamanya. Pengajuan tercatat di riwayat akses pasien."
            />
            <OtpActionForm
              idPrefix="pemulihan"
              askPhone
              phoneLabel="Nomor HP baru pasien"
              codeUrl="/api/pendamping/pemulihan/kode"
              submitUrl="/api/pendamping/pemulihan"
              extraBody={{ linkId }}
              sendLabel="Kirim Kode ke Nomor Baru"
              submitLabel="Ajukan Pemulihan"
              onSuccess={() => window.location.reload()}
            />
          </section>
        )}
      </div>
    </PageShell>
  );
}
