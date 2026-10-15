"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  LogoutButton,
  OtpActionForm,
  PageShell,
  StatusBanner,
} from "@/components";
import type {
  AppPreferences,
  ContrastMode,
  ReadingMode,
  TextSize,
} from "@/lib/preferences";

const OPTION_BASE =
  "min-h-12 rounded-2xl border-2 px-3 py-2 text-center font-bold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";
const SELECTED = "border-cyan-900 bg-cyan-900 text-white";
const UNSELECTED = "border-cyan-800 bg-white text-cyan-900";
const CARD = "flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm";
const H2 = "text-lg font-bold text-main";

/**
 * Pengaturan Akun dan Privasi (P22): kontak, bahasa dan aksesibilitas, pemulihan akses,
 * tautan ke Hapus Data dan Akun (P23), dan keluar.
 */
export function AkunClient({
  initialPreferences,
  maskedPhone,
  activeCompanions,
}: {
  initialPreferences: AppPreferences;
  maskedPhone: string;
  activeCompanions: number;
}) {
  const router = useRouter();
  const [textSize, setTextSize] = useState<TextSize>(initialPreferences.textSize);
  const [contrast, setContrast] = useState<ContrastMode>(initialPreferences.contrast);
  const [readingMode, setReadingMode] = useState<ReadingMode>(
    initialPreferences.readingMode
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [phoneChanged, setPhoneChanged] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus("idle");
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textSize, contrast, readingMode }),
      });
      if (!response.ok) throw new Error("gagal");
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell title="Akun" backHref="/pasien" backLabel="Kembali ke beranda" patientNav>
      <div className="flex w-full max-w-full flex-col gap-5">
        <section aria-labelledby="akun-kontak" className={CARD}>
          <h2 id="akun-kontak" className={H2}>
            Kontak
          </h2>
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-secondary">
              Nomor HP untuk masuk
            </div>
            <div className="text-base font-bold text-main">{maskedPhone}</div>
          </div>
          {phoneChanged && (
            <StatusBanner
              variant="success"
              title="Nomor diperbarui"
              message="Gunakan nomor baru saat masuk berikutnya."
            />
          )}
          {isChangingPhone ? (
            <OtpActionForm
              idPrefix="ubah-kontak"
              askPhone
              phoneLabel="Nomor HP baru"
              purpose="kontak"
              submitUrl="/api/pasien/akun/kontak"
              sendLabel="Kirim kode ke nomor baru"
              submitLabel="Simpan Nomor Baru"
              onSuccess={() => {
                setIsChangingPhone(false);
                setPhoneChanged(true);
                router.refresh();
              }}
              onCancel={() => setIsChangingPhone(false)}
            />
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setPhoneChanged(false);
                setIsChangingPhone(true);
              }}
              className="w-full rounded-2xl! border-2! border-cyan-800! bg-white!"
            >
              Ubah Nomor HP
            </Button>
          )}
        </section>

        <section aria-labelledby="akun-bahasa" className={CARD}>
          <h2 id="akun-bahasa" className={H2}>
            Bahasa
          </h2>
          <div className="text-base font-bold text-main">Indonesia sederhana</div>
          <p className="text-sm leading-6 text-secondary">
            Saat ini hanya bahasa Indonesia sederhana yang tersedia.
          </p>
        </section>

        <section aria-labelledby="akun-tampilan" className={`${CARD} gap-4`}>
          <h2 id="akun-tampilan" className={H2}>
            Tampilan dan Aksesibilitas
          </h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-secondary">Ukuran Teks</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["100", "150", "200"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={textSize === size}
                  onClick={() => {
                    setTextSize(size);
                    setStatus("idle");
                  }}
                  className={`${OPTION_BASE} ${textSize === size ? SELECTED : UNSELECTED}`}
                >
                  {size}%
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-secondary">Kontras</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { val: "standard", label: "Standar" },
                  { val: "high", label: "Tinggi" },
                ] as const
              ).map((c) => (
                <button
                  key={c.val}
                  type="button"
                  aria-pressed={contrast === c.val}
                  onClick={() => {
                    setContrast(c.val);
                    setStatus("idle");
                  }}
                  className={`${OPTION_BASE} ${contrast === c.val ? SELECTED : UNSELECTED}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-secondary">Mode Pembaca Layar</legend>
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  { val: "standard", label: "Tampilan biasa" },
                  { val: "screen-reader", label: "Saya memakai pembaca layar" },
                ] as const
              ).map((m) => (
                <button
                  key={m.val}
                  type="button"
                  aria-pressed={readingMode === m.val}
                  onClick={() => {
                    setReadingMode(m.val);
                    setStatus("idle");
                  }}
                  className={`${OPTION_BASE} ${readingMode === m.val ? SELECTED : UNSELECTED}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-sm leading-6 text-secondary">
              Pilihan pembaca layar baru disimpan sebagai preferensi dan belum
              mengubah tampilan.
            </p>
          </fieldset>

          {status === "saved" && (
            <StatusBanner
              variant="success"
              title="Pengaturan tersimpan"
              message="Tampilan sudah diperbarui."
            />
          )}
          {status === "error" && (
            <StatusBanner
              variant="error"
              title="Gagal menyimpan"
              message="Periksa koneksi Anda lalu coba lagi."
            />
          )}

          <Button onClick={handleSave} isLoading={isSaving} className="w-full">
            Simpan
          </Button>
        </section>

        <section aria-labelledby="akun-pemulihan" className={CARD}>
          <h2 id="akun-pemulihan" className={H2}>
            Pemulihan Akses
          </h2>
          <p className="text-sm leading-6 text-secondary">
            Jika ponsel hilang, akses dipulihkan lewat nomor HP di atas. Pendamping tertaut
            dapat membantu Anda.
          </p>
          <div className="text-base font-bold text-main">
            {activeCompanions > 0
              ? `${activeCompanions} pendamping aktif tertaut.`
              : "Belum ada pendamping tertaut."}
          </div>
          <Link
            href="/pasien/pendamping"
            className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
          >
            Kelola pendamping
          </Link>
        </section>

        <section aria-labelledby="akun-hapus" className={CARD}>
          <h2 id="akun-hapus" className={H2}>
            Hapus Data dan Akun
          </h2>
          <p className="text-sm leading-6 text-secondary">
            Hapus paspor, profil, dan tautan pendamping Anda, lalu cabut semua QR.
          </p>
          <Link
            href="/pasien/akun/hapus"
            className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
          >
            Hapus Data dan Akun
          </Link>
        </section>

        <div>
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
