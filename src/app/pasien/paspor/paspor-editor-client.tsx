"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  ChoiceChip,
  ChoiceGroup,
  ConfirmDialog,
  PatientNeedsSummary,
  StatusBanner,
  TextField,
  getNeedSummaryIcon,
} from "@/components";
import type {
  NeedsCategoryGroup,
  OwnPassportData,
} from "@/lib/passport";
import { X } from "lucide-react";

export interface PassportEditorClientProps {
  catalog: NeedsCategoryGroup[];
  initialPassport: OwnPassportData | null;
}

const CATEGORY_STEP_INDEXES = [
  { step: 2, category: "komunikasi", label: "Komunikasi" },
  { step: 3, category: "penglihatan", label: "Penglihatan" },
  { step: 4, category: "pendengaran", label: "Pendengaran" },
  { step: 5, category: "mobilitas", label: "Mobilitas" },
  { step: 6, category: "sensorik_lingkungan", label: "Sensorik dan Lingkungan" },
  { step: 7, category: "pendampingan", label: "Pendampingan" },
];

export function PassportEditorClient({
  catalog,
  initialPassport,
}: PassportEditorClientProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const noteInputId = useId();

  // Wizard state: 1..8 for editing, 9 for preview (P6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form state — draft HANYA di memori komponen (K-8)
  const [preferredName, setPreferredName] = useState<string>(
    initialPassport?.preferredName || ""
  );
  const [nameError, setNameError] = useState<string>("");

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(() => {
    return new Set(initialPassport?.needCodes || []);
  });

  const [patientNote, setPatientNote] = useState<string>(
    initialPassport?.patientNote || ""
  );

  // Status submission
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Exit confirmation dialog state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Catalog item lookup map
  const catalogItemMap = useMemo(() => {
    const map = new Map<
      string,
      { code: string; label: string; iconName: string; category: string }
    >();
    for (const group of catalog) {
      for (const item of group.items) {
        map.set(item.code, {
          code: item.code,
          label: item.label,
          iconName: item.iconName,
          category: group.category,
        });
      }
    }
    return map;
  }, [catalog]);

  // Catalog group lookup by category
  const catalogGroupMap = useMemo(() => {
    const map = new Map<string, NeedsCategoryGroup>();
    for (const group of catalog) {
      map.set(group.category, group);
    }
    return map;
  }, [catalog]);

  // Focus pada H2 saat langkah berganti
  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  // Cek apakah ada perubahan (isDirty) terhadap initial data
  const isDirty = useMemo(() => {
    const origName = initialPassport?.preferredName || "";
    const origNote = initialPassport?.patientNote || "";
    const origCodes = new Set(initialPassport?.needCodes || []);

    if (preferredName.trim() !== origName.trim()) return true;
    if (patientNote.trim() !== origNote.trim()) return true;
    if (selectedCodes.size !== origCodes.size) return true;
    for (const c of selectedCodes) {
      if (!origCodes.has(c)) return true;
    }
    return false;
  }, [preferredName, patientNote, selectedCodes, initialPassport]);

  const handleExitClick = () => {
    if (isDirty && !saveSuccess) {
      setShowExitConfirm(true);
    } else {
      router.push("/pasien");
    }
  };

  const handleToggleNeed = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleNextFromStep1 = () => {
    const trimmed = preferredName.trim();
    if (trimmed.length === 0) {
      setNameError("Nama panggilan wajib diisi.");
      return;
    }
    if (trimmed.length > 80) {
      setNameError("Nama panggilan maksimal 80 karakter.");
      return;
    }
    setNameError("");
    setCurrentStep(2);
  };

  const handleSavePassport = async () => {
    if (selectedCodes.size === 0) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/pasien/paspor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferredName: preferredName.trim(),
          needCodes: Array.from(selectedCodes),
          patientNote: patientNote.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setSaveError(
          data?.error ||
            "Terjadi kesalahan saat menyimpan paspor. Silakan coba lagi."
        );
      } else {
        setSaveSuccess(true);
      }
    } catch {
      setSaveError(
        "Terjadi kesalahan koneksi saat menyimpan paspor. Silakan periksa jaringan Anda."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Kebutuhan terpilih untuk pratinjau P6
  const selectedNeedsList = useMemo(() => {
    const list: Array<{
      code: string;
      label: string;
      iconName: string;
      category: string;
    }> = [];
    for (const code of selectedCodes) {
      const found = catalogItemMap.get(code);
      if (found) {
        list.push(found);
      }
    }
    return list;
  }, [selectedCodes, catalogItemMap]);

  return (
    <div className="min-h-full flex flex-col w-full bg-page text-main">
      {/* Header Halaman dengan Tombol Keluar [X] */}
      <header className="w-full border-b border-cyan-100 bg-white px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 w-full min-w-0">
          <h1 className="font-bold text-lg text-main break-words min-w-0 flex-1">
            Paspor Saya
          </h1>
          <button
            ref={exitButtonRef}
            type="button"
            onClick={handleExitClick}
            aria-label="Keluar dari pengisian paspor"
            className="inline-flex items-center justify-center min-w-12 min-h-12 h-12 w-12 rounded-lg text-main hover:bg-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-900 shrink-0"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Content Form / Wizard */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 focus:outline-none min-w-0"
      >
        {/* =============================================================== */}
        {/* LANGKAH 1 — NAMA PANGGILAN                                      */}
        {/* =============================================================== */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-normal text-secondary mb-1">
                Langkah 1 dari 8
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-main focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                Nama Panggilan
              </h2>
            </div>

            <TextField
              id="field-preferred-name"
              label="Nama Panggilan"
              value={preferredName}
              onChange={(e) => {
                setPreferredName(e.target.value);
                if (nameError) setNameError("");
              }}
              helperText="Boleh nama panggilan, tidak perlu nama lengkap."
              error={nameError}
              maxLength={80}
              autoFocus
            />

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={handleNextFromStep1}
                className="w-full sm:w-auto"
              >
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* LANGKAH 2–7 — KATEGORI KEBUTUHAN (KOMUNIKASI..PENDAMPINGAN)      */}
        {/* =============================================================== */}
        {currentStep >= 2 && currentStep <= 7 && (() => {
          const catInfo = CATEGORY_STEP_INDEXES.find(
            (c) => c.step === currentStep
          )!;
          const group = catalogGroupMap.get(catInfo.category);
          const items = group?.items || [];

          return (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-normal text-secondary mb-1">
                  Langkah {currentStep} dari 8
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl font-bold text-main focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
                >
                  {catInfo.label}
                </h2>
              </div>

              <ChoiceGroup
                legend={`Pilihan Kebutuhan ${catInfo.label}`}
                helperText="Pilih kebutuhan yang sesuai untuk Anda. Boleh lanjut tanpa memilih."
              >
                {items.length === 0 ? (
                  <p className="text-sm font-normal text-secondary">
                    Tidak ada item katalog pada kategori ini.
                  </p>
                ) : (
                  items.map((item) => (
                    <ChoiceChip
                      key={item.code}
                      id={`chip-${item.code}`}
                      name={`category-${catInfo.category}`}
                      label={item.label}
                      icon={getNeedSummaryIcon(item.iconName)}
                      checked={selectedCodes.has(item.code)}
                      onChange={() => handleToggleNeed(item.code)}
                      className="w-full"
                    />
                  ))
                )}
              </ChoiceGroup>

              <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="w-full sm:w-auto"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="w-full sm:w-auto"
                >
                  Lanjut
                </Button>
              </div>
            </div>
          );
        })()}

        {/* =============================================================== */}
        {/* LANGKAH 8 — CATATAN UNTUK PETUGAS (OPSIONAL)                    */}
        {/* =============================================================== */}
        {currentStep === 8 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-normal text-secondary mb-1">
                Langkah 8 dari 8
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-main focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                Catatan untuk Petugas (Opsional)
              </h2>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor={noteInputId}
                className="text-sm font-bold text-main"
              >
                Catatan Tambahan
              </label>
              <p className="text-sm font-normal text-secondary mb-1">
                Tulis cara membantu Anda. Tidak perlu menulis diagnosis atau nama penyakit.
              </p>
              <textarea
                id={noteInputId}
                value={patientNote}
                onChange={(e) => setPatientNote(e.target.value)}
                maxLength={300}
                rows={4}
                className="w-full p-3 rounded-lg border border-cyan-800 bg-white text-main text-base focus:outline-none focus:ring-4 focus:ring-cyan-900"
              />
              <span className="text-sm font-normal text-secondary text-right">
                {patientNote.length}/300 karakter
              </span>
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 justify-between">
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(7)}
                className="w-full sm:w-auto"
              >
                Sebelumnya
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(9)}
                className="w-full sm:w-auto"
              >
                Lihat Pratinjau
              </Button>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* LANGKAH 9 / P6 — PRATINJAU PASPOR LAYANAN                        */}
        {/* =============================================================== */}
        {currentStep === 9 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-normal text-secondary mb-1">
                Pemeriksaan Akhir
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-bold text-main focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded"
              >
                Pratinjau Paspor Layanan
              </h2>
            </div>

            {/* Peringatan bila belum ada kebutuhan yang dipilih */}
            {selectedCodes.size === 0 && (
              <StatusBanner
                variant="warning"
                title="Pilih minimal satu kebutuhan"
                message="Paspor membutuhkan minimal satu kebutuhan layanan agar dapat disimpan dan dibagikan."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentStep(2)}
                    className="w-full sm:w-auto"
                  >
                    Pilih Kebutuhan di Langkah 2
                  </Button>
                }
              />
            )}

            {/* Hasil simpan berhasil */}
            {saveSuccess && (
              <div className="flex flex-col gap-4">
                <StatusBanner
                  variant="success"
                  title="Paspor tersimpan"
                  message="Perubahan langsung berlaku, termasuk untuk ConsentQR yang masih aktif."
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/pasien/kunjungan"
                    className="inline-flex items-center justify-center min-h-12 min-w-12 h-12 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 flex-1 text-center"
                  >
                    Mulai Kunjungan
                  </Link>
                  <Link
                    href="/pasien"
                    className="inline-flex items-center justify-center min-h-12 min-w-12 h-12 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:outline-none focus:ring-4 focus:ring-cyan-900 flex-1 text-center"
                  >
                    Ke Beranda
                  </Link>
                </div>
              </div>
            )}

            {/* Galat saat simpan */}
            {saveError && (
              <StatusBanner
                variant="error"
                title="Gagal Menyimpan Paspor"
                message={saveError}
              />
            )}

            {/* PatientNeedsSummary identik dengan tampilan petugas */}
            <PatientNeedsSummary
              preferredName={preferredName}
              needs={selectedNeedsList}
              patientNote={patientNote}
              showPrivacyNotes={true}
            />

            {/* Tombol aksi bila belum tersimpan sukses */}
            {!saveSuccess && (
              <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(8)}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  Kembali Edit
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSavePassport}
                  disabled={selectedCodes.size === 0 || isSaving}
                  isLoading={isSaving}
                  className="w-full sm:w-auto"
                >
                  Simpan Paspor
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dialog Konfirmasi Keluar Tanpa Menyimpan */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Keluar tanpa menyimpan?"
        description="Perubahan akan hilang."
        confirmLabel="Ya, Buang"
        cancelLabel="Tetap mengisi"
        triggerRef={exitButtonRef}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          router.push("/pasien");
        }}
      />
    </div>
  );
}
