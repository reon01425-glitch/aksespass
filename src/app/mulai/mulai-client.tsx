"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  PageShell,
} from "@/components";
import {
  DEFAULT_PREFERENCES,
  type AppPreferences,
  type ContrastMode,
  type TextSize,
} from "@/lib/preferences";
import { Check, ShieldCheck } from "lucide-react";

export function MulaiClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [textSize, setTextSize] = useState<TextSize>("100");
  const [contrast, setContrast] = useState<ContrastMode>("standard");
  const [isSaving, setIsSaving] = useState(false);

  const saveAndNavigate = async (pref: AppPreferences) => {
    setIsSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pref),
      });
    } catch {
      // Lanjut walau terjadi galat jaringan
    } finally {
      router.push("/masuk");
      router.refresh();
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 2 | 3);
    } else {
      void saveAndNavigate({ textSize, contrast });
    }
  };

  const handleSkip = () => {
    void saveAndNavigate(DEFAULT_PREFERENCES);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  return (
    <PageShell title="Pengaturan Awal Aksesibilitas">
      <div className="flex flex-col gap-6">
        {/* Indikator Langkah */}
        <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
          <span
            className="text-sm font-bold text-main"
            aria-current="step"
          >
            Langkah {step} dari 3
          </span>
          <span className="text-xs text-secondary">
            {step === 1 && "Bahasa"}
            {step === 2 && "Teks & Kontras"}
            {step === 3 && "Pembaca Layar"}
          </span>
        </div>

        {/* Pernyataan Privasi Wajib */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-cyan-400">
          <ShieldCheck aria-hidden="true" className="w-5 h-5 text-cyan-600 shrink-0" />
          <p className="text-sm text-main">
            Aplikasi ini tidak meminta diagnosis medis Anda.
          </p>
        </div>

        {/* LANGKAH 1: Bahasa */}
        {step === 1 && (
          <section aria-labelledby="heading-step-1" className="flex flex-col gap-4">
            <h2 id="heading-step-1" className="text-xl font-bold text-main">
              Pilih Bahasa Layanan
            </h2>
            <p className="text-base text-main">
              AKSESPASS menggunakan kalimat ringkas dan jelas untuk mempermudah komunikasi dengan petugas.
            </p>

            <div className="flex items-center justify-between p-4 rounded-xl border-2 border-cyan-800 bg-surface">
              <div className="flex flex-col">
                <span className="text-base font-bold text-main">
                  Bahasa Indonesia (Sederhana)
                </span>
                <span className="text-sm text-secondary">
                  Satu-satunya pilihan bahasa saat ini
                </span>
              </div>
              <Check aria-hidden="true" className="w-6 h-6 text-cyan-800 shrink-0" />
            </div>
          </section>
        )}

        {/* LANGKAH 2: Ukuran Teks dan Kontras dengan Pratinjau Langsung */}
        {step === 2 && (
          <section aria-labelledby="heading-step-2" className="flex flex-col gap-5">
            <h2 id="heading-step-2" className="text-xl font-bold text-main">
              Ukuran Teks dan Kontras
            </h2>
            <p className="text-base text-main">
              Pilih kenyamanan membaca yang sesuai untuk Anda. Tampilan di bawah akan berubah langsung.
            </p>

            {/* Pilihan Ukuran Teks */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-bold text-main mb-1">
                Ukuran Teks
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["100", "150", "200"] as const).map((size) => {
                  const isSelected = textSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTextSize(size)}
                      aria-pressed={isSelected}
                      className={`min-h-[48px] px-3 py-2 rounded-lg font-bold border text-center transition-colors ${
                        isSelected
                          ? "bg-cyan-700 text-white border-cyan-700 ring-2 ring-cyan-900"
                          : "bg-surface text-main border-cyan-800"
                      }`}
                    >
                      {size}%
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Pilihan Kontras */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-bold text-main mb-1">
                Pilihan Kontras
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { val: "standard", label: "Standar" },
                    { val: "high", label: "Tinggi" },
                  ] as const
                ).map((c) => {
                  const isSelected = contrast === c.val;
                  return (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setContrast(c.val)}
                      aria-pressed={isSelected}
                      className={`min-h-[48px] px-4 py-2 rounded-lg font-bold border text-center transition-colors ${
                        isSelected
                          ? "bg-cyan-700 text-white border-cyan-700 ring-2 ring-cyan-900"
                          : "bg-surface text-main border-cyan-800"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Kotak Pratinjau Langsung */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                contrast === "high"
                  ? "bg-white border-cyan-800"
                  : "bg-surface border-cyan-400"
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="block text-xs font-bold text-secondary mb-2">
                Pratinjau Tampilan Langsung ({textSize}%, Kontras {contrast === "high" ? "Tinggi" : "Standar"}):
              </span>
              <p
                className="font-bold text-main mb-1 leading-tight"
                style={{
                  fontSize:
                    textSize === "200"
                      ? "2rem"
                      : textSize === "150"
                      ? "1.5rem"
                      : "1rem",
                }}
              >
                Kebutuhan: BISINDO & Ruang Tenang
              </p>
              <p
                className="text-main leading-normal"
                style={{
                  fontSize:
                    textSize === "200"
                      ? "1.75rem"
                      : textSize === "150"
                      ? "1.25rem"
                      : "0.875rem",
                }}
              >
                Petugas akan menyiapkan juru bahasa isyarat dan ruang tunggu yang tenang untuk Anda.
              </p>
            </div>
          </section>
        )}

        {/* LANGKAH 3: Pembaca Layar */}
        {step === 3 && (
          <section aria-labelledby="heading-step-3" className="flex flex-col gap-4">
            <h2 id="heading-step-3" className="text-xl font-bold text-main">
              Dukungan Pembaca Layar
            </h2>
            <p className="text-base text-main">
              AKSESPASS dioptimalkan untuk pembaca layar bawaan ponsel Anda, seperti TalkBack (Android) dan VoiceOver (iPhone/iPad).
            </p>
            <div className="p-4 rounded-xl border border-cyan-800 bg-surface flex flex-col gap-2">
              <span className="text-base font-bold text-main">
                Aksesibilitas Siap Pakai
              </span>
              <p className="text-sm text-secondary">
                Semua tombol memiliki label suara yang jelas dan urutan pembacaan yang teratur. Pengaturan teks-ke-suara interaktif tambahan akan tersedia saat kunjungan melalui fitur KomunikaCare.
              </p>
            </div>
          </section>
        )}

        {/* Tombol Aksi Bawah */}
        <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={isSaving}
                className="flex-1"
              >
                Kembali
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleNext}
              isLoading={isSaving}
              className="flex-1"
            >
              {step === 3 ? "Lanjut ke Masuk" : "Lanjut"}
            </Button>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            className="min-h-[48px] py-2 text-center text-sm font-bold text-link underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 rounded-lg"
          >
            Lewati (Gunakan Pengaturan Bawaan)
          </button>
        </div>
      </div>
    </PageShell>
  );
}
