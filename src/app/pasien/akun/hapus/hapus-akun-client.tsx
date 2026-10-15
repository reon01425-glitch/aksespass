"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, OtpActionForm, PageShell, StatusBanner } from "@/components";

/**
 * Hapus Data dan Akun (P23): penjelasan akibat, lalu verifikasi dengan kode, lalu pesan selesai.
 * Teks akibat penghapusan perlu diverifikasi dengan UU Pelindungan Data Pribadi sebelum dipakai sungguhan.
 */
export function HapusAkunClient({
  maskedPhone,
  statsConsent,
}: {
  maskedPhone: string;
  statsConsent: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <PageShell title="Akun Dihapus">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
          <StatusBanner
            variant="success"
            title="Data dan akun Anda sudah dihapus"
            message="Semua QR dicabut dan Anda sudah keluar. Anda bisa mendaftar lagi sebagai pengguna baru kapan saja."
          />
          <Button onClick={() => router.replace("/")} className="w-full">
            Kembali ke Awal
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Hapus Data dan Akun" backHref="/pasien/akun" backLabel="Kembali ke akun">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <section aria-labelledby="hapus-akibat" className="flex flex-col gap-3">
          <h2 id="hapus-akibat" className="text-xl font-bold text-main">
            Yang akan terjadi
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-base text-main">
            <li>Paspor dan profil Anda dihapus.</li>
            <li>Tautan pendamping dihapus.</li>
            <li>Catatan kunjungan dan tindak lanjut yang terkait identitas Anda dihapus.</li>
            <li>Semua QR dicabut dan tidak bisa dipakai lagi.</li>
            <li>Riwayat akses tetap tersimpan, tetapi tidak lagi terhubung ke identitas Anda.</li>
          </ul>
          <p className="text-sm text-secondary">
            {statsConsent
              ? "Anda menyetujui statistik anonim: jumlah kunjungan tanpa nama, nomor, atau catatan tetap dihitung di fasilitas."
              : "Anda tidak menyetujui statistik anonim, sehingga kunjungan Anda tidak dihitung lagi di fasilitas."}
          </p>
          <StatusBanner
            variant="warning"
            title="Tidak bisa dibatalkan"
            message="Setelah dihapus, data tidak dapat dikembalikan."
          />
        </section>

        {!confirming ? (
          <div className="flex flex-col gap-3">
            <Button onClick={() => setConfirming(true)} className="w-full">
              Hapus Akun
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/pasien/akun")}
              className="w-full"
            >
              Batal
            </Button>
          </div>
        ) : (
          <section aria-labelledby="hapus-verifikasi" className="flex flex-col gap-3">
            <h2 id="hapus-verifikasi" className="text-xl font-bold text-main">
              Verifikasi dengan kode
            </h2>
            <p className="text-sm text-secondary">
              Kode dikirim ke nomor {maskedPhone}.
            </p>
            <OtpActionForm
              idPrefix="hapus-akun"
              purpose="hapus"
              submitUrl="/api/pasien/akun/hapus"
              sendLabel="Kirim Kode Verifikasi"
              submitLabel="Hapus Akun Saya"
              onSuccess={() => setDone(true)}
              onCancel={() => router.push("/pasien/akun")}
            />
          </section>
        )}
      </div>
    </PageShell>
  );
}
