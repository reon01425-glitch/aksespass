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
  type ReadingMode,
  type TextSize,
} from "@/lib/preferences";

const CARD = "rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm";
const OPT = "min-h-12 rounded-2xl border-2 bg-white px-3 py-2 text-center shadow-sm transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";
const ON = "border-cyan-800 font-bold text-main";
const OFF = "border-cyan-200 text-secondary";

export function MulaiClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [textSize, setTextSize] = useState<TextSize>("100");
  const [contrast, setContrast] = useState<ContrastMode>("standard");
  const [readingMode, setReadingMode] = useState<ReadingMode>("standard");
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
      void saveAndNavigate({ textSize, contrast, readingMode });
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
      <div className="flex w-full max-w-full flex-col gap-5">
        {/* Indikator Langkah */}
        <div className={`flex items-center justify-between ${CARD}`}>
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
        <p className="rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-main shadow-sm">
          Aplikasi ini tidak meminta diagnosis medis Anda.
        </p>

        {/* LANGKAH 1: Bahasa */}
        {step === 1 && (
          <section aria-labelledby="heading-step-1" className="flex flex-col gap-5">
            <h2 id="heading-step-1" className="text-xl font-bold text-main">
              Pilih Bahasa Layanan
            </h2>
            <p className="text-base leading-7 text-main">
              AKSESPASS menggunakan kalimat ringkas dan jelas untuk mempermudah komunikasi dengan petugas.
            </p>

            <div className="flex flex-col rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm">
              <span className="text-base font-bold text-main">
                Bahasa Indonesia (Sederhana)
              </span>
              <span className="text-sm text-secondary">
                Satu-satunya pilihan bahasa saat ini. Terpilih.
              </span>
            </div>
          </section>
        )}

        {/* LANGKAH 2: Ukuran Teks dan Kontras dengan Pratinjau Langsung */}
        {step === 2 && (
          <section aria-labelledby="heading-step-2" className="flex flex-col gap-5">
            <h2 id="heading-step-2" className="text-xl font-bold text-main">
              Ukuran Teks dan Kontras
            </h2>
            <p className="text-base leading-7 text-main">
              Pilih kenyamanan membaca yang sesuai untuk Anda. Tampilan di bawah akan berubah langsung.
            </p>

            {/* Pilihan Ukuran Teks */}
            <div className={CARD}>
            <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
              <legend className="mb-3 w-full text-sm font-bold text-main">
                Ukuran Teks
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {(["100", "150", "200"] as const).map((size) => {
                  const isSelected = textSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTextSize(size)}
                      aria-pressed={isSelected}
                      className={`${OPT} ${isSelected ? ON : OFF}`}
                    >
                      {size}%
                    </button>
                  );
                })}
              </div>
            </fieldset>
            </div>

            {/* Pilihan Kontras */}
            <div className={CARD}>
            <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
              <legend className="mb-3 w-full text-sm font-bold text-main">
                Pilihan Kontras
              </legend>
              <div className="grid grid-cols-2 gap-3">
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
                      className={`${OPT} ${isSelected ? ON : OFF}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            </div>

            {/* Kotak Pratinjau Langsung */}
            <div
              className={`rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm ${contrast === "high" ? "" : ""}`.trim()}
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

        {/* LANGKAH 3: Mode Pembaca Layar */}
        {step === 3 && (
          <section aria-labelledby="heading-step-3" className="flex flex-col gap-5">
            <h2 id="heading-step-3" className="text-xl font-bold text-main">
              Mode Pembaca Layar
            </h2>
            <p className="text-base leading-7 text-main">
              Pilih apakah Anda memakai pembaca layar bawaan ponsel, seperti
              TalkBack (Android) atau VoiceOver (iPhone/iPad).
            </p>

            <div className={CARD}>
            <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
              <legend className="mb-3 w-full text-sm font-bold text-main">
                Mode Pembaca Layar
              </legend>
              <div className="grid grid-cols-1 gap-3">
                {(
                  [
                    {
                      val: "standard",
                      label: "Tampilan biasa",
                      desc: "Saya tidak memakai pembaca layar.",
                    },
                    {
                      val: "screen-reader",
                      label: "Saya memakai pembaca layar",
                      desc: "Pilihan ini disimpan di perangkat ini.",
                    },
                  ] as const
                ).map((m) => {
                  const isSelected = readingMode === m.val;
                  return (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setReadingMode(m.val)}
                      aria-pressed={isSelected}
                      className={`${OPT} text-left ${isSelected ? ON : OFF}`}
                    >
                      <span className="block font-bold">{m.label}</span>
                      <span className="block text-sm font-normal text-secondary">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            </div>

            <div className={`flex flex-col gap-2 ${CARD}`}>
              <span className="text-base font-bold text-main">
                Catatan Jujur
              </span>
              <p className="text-sm text-secondary">
                Pilihan ini baru disimpan sebagai preferensi dan belum mengubah
                tampilan. Aplikasi belum diuji dengan TalkBack atau VoiceOver.
                Teks-ke-suara untuk berbicara dengan petugas sudah tersedia
                di menu KomunikaCare (bergantung pada dukungan peramban).
              </p>
            </div>
          </section>
        )}

        {/* Tombol Aksi Bawah */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={isSaving}
                className="flex-1 rounded-2xl!"
              >
                Kembali
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleNext}
              isLoading={isSaving}
              className="flex-1 rounded-2xl!"
            >
              {step === 3 ? "Lanjut ke Masuk" : "Lanjut"}
            </Button>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-cyan-800 bg-white px-4 py-2 text-center text-sm font-bold text-cyan-900 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 disabled:opacity-60"
          >
            Lewati (Gunakan Pengaturan Bawaan)
          </button>
        </div>
      </div>
    </PageShell>
  );
}
