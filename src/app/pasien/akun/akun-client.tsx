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
  "min-h-[48px] px-3 py-2 rounded-lg font-bold border text-center transition-colors";
const SELECTED = "bg-cyan-700 text-white border-cyan-700 ring-2 ring-cyan-900";
const UNSELECTED = "bg-surface text-main border-cyan-800";

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
    <PageShell title="Akun" backHref="/pasien" backLabel="Kembali ke beranda">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <section aria-labelledby="akun-kontak" className="flex flex-col gap-3">
          <h2 id="akun-kontak" className="text-xl font-bold text-main">
            Kontak
          </h2>
          <div className="flex flex-col gap-1 rounded-xl border border-decorative bg-surface p-4">
            <div className="text-sm text-secondary">Nomor HP untuk masuk</div>
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
              className="w-full"
            >
              Ubah Nomor HP
            </Button>
          )}
        </section>

        <section aria-labelledby="akun-bahasa" className="flex flex-col gap-2">
          <h2 id="akun-bahasa" className="text-xl font-bold text-main">
            Bahasa
          </h2>
          <div className="rounded-xl border border-decorative bg-surface p-4 text-base font-bold text-main">
            Indonesia sederhana
          </div>
          <p className="text-sm text-secondary">
            Saat ini hanya bahasa Indonesia sederhana yang tersedia.
          </p>
        </section>

        <section aria-labelledby="akun-tampilan" className="flex flex-col gap-4">
          <h2 id="akun-tampilan" className="text-xl font-bold text-main">
            Tampilan dan Aksesibilitas
          </h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-bold text-main">Ukuran Teks</legend>
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
            <legend className="mb-1 text-sm font-bold text-main">Kontras</legend>
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
            <legend className="mb-1 text-sm font-bold text-main">Mode Pembaca Layar</legend>
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
            <p className="text-sm text-secondary">
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

        <section aria-labelledby="akun-pemulihan" className="flex flex-col gap-2">
          <h2 id="akun-pemulihan" className="text-xl font-bold text-main">
            Pemulihan Akses
          </h2>
          <p className="text-sm text-secondary">
            Jika ponsel hilang, akses dipulihkan lewat nomor HP di atas. Pendamping tertaut
            dapat membantu Anda.
          </p>
          <div className="rounded-xl border border-decorative bg-surface p-4 text-base text-main">
            {activeCompanions > 0
              ? `${activeCompanions} pendamping aktif tertaut.`
              : "Belum ada pendamping tertaut."}
          </div>
          <Link
            href="/pasien/pendamping"
            className="inline-flex min-h-12 items-center font-bold text-cyan-900 underline"
          >
            Kelola pendamping
          </Link>
        </section>

        <section aria-labelledby="akun-hapus" className="flex flex-col gap-2 border-t border-decorative pt-4">
          <h2 id="akun-hapus" className="text-xl font-bold text-main">
            Hapus Data dan Akun
          </h2>
          <p className="text-sm text-secondary">
            Hapus paspor, profil, dan tautan pendamping Anda, lalu cabut semua QR.
          </p>
          <Link
            href="/pasien/akun/hapus"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-800 px-4 font-bold text-main"
          >
            Hapus Data dan Akun
          </Link>
        </section>

        <div className="border-t border-decorative pt-4">
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
