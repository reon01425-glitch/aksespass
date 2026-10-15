"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LogoutButton, PageShell, StatusBanner } from "@/components";
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
 * Akun pasien (bagian awal P22): ubah tampilan aksesibilitas dan keluar.
 * Ubah kontak, pemulihan akses, dan hapus akun belum tersedia di versi ini.
 */
export function AkunClient({
  initialPreferences,
}: {
  initialPreferences: AppPreferences;
}) {
  const router = useRouter();
  const [textSize, setTextSize] = useState<TextSize>(initialPreferences.textSize);
  const [contrast, setContrast] = useState<ContrastMode>(initialPreferences.contrast);
  const [readingMode, setReadingMode] = useState<ReadingMode>(
    initialPreferences.readingMode
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

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

        <section
          aria-labelledby="akun-belum"
          className="flex flex-col gap-2 rounded-xl border border-dashed border-decorative bg-surface p-4"
        >
          <h2 id="akun-belum" className="text-base font-bold text-main">
            Belum tersedia di versi ini
          </h2>
          <p className="text-sm text-secondary">
            Ubah nomor kontak, pemulihan akses, serta hapus data dan akun belum
            dapat dilakukan dari halaman ini.
          </p>
        </section>

        <div className="border-t border-decorative pt-4">
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
