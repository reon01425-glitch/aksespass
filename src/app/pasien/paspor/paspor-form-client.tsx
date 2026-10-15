"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  EyeOff,
  FileText,
  History,
  House,
  Info,
  MapPin,
  Pencil,
  QrCode,
  Save,
  ShieldCheck,
  ShieldPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ActionDialog,
  Button,
  StatusBanner,
  TextField,
  getNeedSummaryIcon,
} from "@/components";
import type { NeedsCategoryGroup, OwnPassportData } from "@/lib/passport";
import {
  PATIENT_NOTE_MAX_LENGTH,
  PATIENT_PREFERRED_NAME_MAX_LENGTH,
} from "@/lib/passport/constants";
import {
  clearPassportDraft,
  isDraftSameAsSaved,
  isPassportDraftEmpty,
  loadPassportDraft,
  savePassportDraft,
} from "@/lib/passport/draft";
import { refreshOfflineSummary } from "@/lib/passport/offline-summary";
import type { ActiveQrItem } from "@/lib/consent";
import { formatDateTimeWib } from "@/lib/consent/time";

interface PassportFormClientProps {
  catalog: NeedsCategoryGroup[];
  initialPassport: OwnPassportData | null;
  activeQrs: ActiveQrItem[];
  /** Id pengguna, dipakai sebagai kunci draft di perangkat ini. */
  ownerId: string;
  /** Diisi saat pendamping mengelola paspor atas nama pasien (D5): alamat simpan dan tujuan khusus. */
  companion?: {
    patientName: string;
    submitUrl: string;
    backHref: string;
    qrHref: string;
  };
}

const PATIENT_NAV_ITEMS: {
  href: string;
  label: string;
  Icon: LucideIcon;
  emphasis?: boolean;
}[] = [
  { href: "/pasien", label: "Beranda", Icon: House },
  { href: "/pasien/paspor", label: "Paspor", Icon: FileText },
  { href: "/pasien/akses/qr", label: "QR Akses", Icon: QrCode, emphasis: true },
  { href: "/pasien/pendamping", label: "Pendamping", Icon: Users },
  { href: "/pasien/akses/riwayat", label: "Riwayat", Icon: History },
];

const NOTE_TOO_LONG = `Catatan maksimal ${PATIENT_NOTE_MAX_LENGTH} karakter. Ringkas catatan sebelum menyimpan.`;

export function PassportFormClient({
  catalog,
  initialPassport,
  activeQrs,
  ownerId,
  companion,
}: PassportFormClientProps) {
  const router = useRouter();
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const preferredNameInputRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const noteInputId = "patient-passport-note";

  const [preferredName, setPreferredName] = useState(
    initialPassport?.preferredName ?? ""
  );
  const [nameError, setNameError] = useState("");
  const [selectedCodes, setSelectedCodes] = useState(
    () => new Set(initialPassport?.needCodes ?? [])
  );
  const [patientNote, setPatientNote] = useState(
    initialPassport?.patientNote ?? ""
  );
  const [savedValues, setSavedValues] = useState(() => ({
    preferredName: initialPassport?.preferredName ?? "",
    patientNote: initialPassport?.patientNote ?? "",
    needCodes: new Set(initialPassport?.needCodes ?? []),
  }));
  const [savedAt, setSavedAt] = useState(initialPassport?.updatedAt ?? null);
  const [isEditing, setIsEditing] = useState(initialPassport === null);
  const [isPreview, setIsPreview] = useState(false);
  const [step, setStep] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [noteError, setNoteError] = useState(() =>
    (initialPassport?.patientNote?.length ?? 0) > PATIENT_NOTE_MAX_LENGTH
      ? `Catatan tersimpan melebihi batas ${PATIENT_NOTE_MAX_LENGTH} karakter. Ringkas catatan sebelum menyimpan.`
      : ""
  );
  const [showNeedsError, setShowNeedsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const hasSavedPassport = savedAt !== null;

  const needs = useMemo(
    () => catalog.flatMap((group) => group.items),
    [catalog]
  );
  const validCodes = useMemo(
    () => new Set(needs.map((item) => item.code)),
    [needs]
  );

  // Satu langkah per kelompok kebutuhan, ditambah satu langkah terakhir untuk
  // nama panggilan dan catatan.
  const lastStep = catalog.length;
  const totalSteps = catalog.length + 1;
  const isNotesStep = step >= lastStep;
  const currentGroup = isNotesStep ? null : catalog[step];

  const isDirty = useMemo(
    () =>
      !isDraftSameAsSaved(
        {
          preferredName,
          needCodes: Array.from(selectedCodes),
          patientNote,
        },
        {
          preferredName: savedValues.preferredName,
          needCodes: Array.from(savedValues.needCodes),
          patientNote: savedValues.patientNote,
        }
      ),
    [patientNote, preferredName, savedValues, selectedCodes]
  );

  const clearSubmissionStatus = () => {
    setSaveError(null);
  };

  const resetToSaved = () => {
    setPreferredName(savedValues.preferredName);
    setPatientNote(savedValues.patientNote);
    setSelectedCodes(new Set(savedValues.needCodes));
    setNameError("");
    setNoteError("");
    setShowNeedsError(false);
  };

  // Pulihkan draft dari perangkat ini sekali saat halaman dibuka.
  // localStorage hanya ada di klien dan baru dibaca setelah hidrasi, sehingga
  // pembacaan awal ini memang menyetel state di dalam efek.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const draft = loadPassportDraft(ownerId, validCodes);
    if (
      draft &&
      !isPassportDraftEmpty(draft) &&
      !isDraftSameAsSaved(draft, {
        preferredName: initialPassport?.preferredName ?? "",
        needCodes: initialPassport?.needCodes ?? [],
        patientNote: initialPassport?.patientNote ?? "",
      })
    ) {
      setPreferredName(draft.preferredName);
      setPatientNote(draft.patientNote);
      setSelectedCodes(new Set(draft.needCodes));
      setStep(Math.min(draft.step, catalog.length));
      setIsEditing(true);
      setDraftRestored(true);
    }
    setDraftReady(true);
    // Hanya saat pertama dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Simpan draft otomatis selama mengisi. Draft sama dengan paspor tersimpan = tidak perlu draft.
  useEffect(() => {
    if (!draftReady || !isEditing) return;
    const draft = {
      preferredName,
      needCodes: Array.from(selectedCodes),
      patientNote,
      step,
      updatedAt: new Date().toISOString(),
    };
    if (
      isPassportDraftEmpty(draft) ||
      isDraftSameAsSaved(draft, {
        preferredName: savedValues.preferredName,
        needCodes: Array.from(savedValues.needCodes),
        patientNote: savedValues.patientNote,
      })
    ) {
      clearPassportDraft(ownerId);
    } else {
      savePassportDraft(ownerId, draft);
    }
  }, [
    draftReady,
    isEditing,
    ownerId,
    patientNote,
    preferredName,
    savedValues,
    selectedCodes,
    step,
  ]);

  // Pindahkan fokus ke judul langkah agar pembaca layar mengumumkan langkah baru.
  const previousStepRef = useRef(step);
  useEffect(() => {
    if (previousStepRef.current !== step) {
      previousStepRef.current = step;
      if (isEditing && !isPreview) {
        stepHeadingRef.current?.focus();
      }
    }
  }, [step, isEditing, isPreview]);

  /** Cocokkan ringkasan offline (bila ada) dengan isi paspor terbaru. */
  const syncOfflineSummary = (
    name: string,
    codes: Set<string>,
    note: string | null
  ) => {
    // Ringkasan offline hanya milik perangkat pasien sendiri, bukan perangkat pendamping.
    if (companion) return;
    refreshOfflineSummary({
      preferredName: name,
      note,
      needs: catalog.flatMap((group) =>
        group.items
          .filter((item) => codes.has(item.code))
          .map((item) => ({
            code: item.code,
            label: item.label,
            categoryLabel: group.categoryLabel,
          }))
      ),
    });
  };

  // Paspor yang sudah ada (mis. diubah pendamping): perbarui ringkasan offline.
  useEffect(() => {
    if (initialPassport) {
      syncOfflineSummary(
        initialPassport.preferredName ?? "",
        new Set(initialPassport.needCodes),
        initialPassport.patientNote?.trim() || null
      );
    }
    // Hanya saat pertama dibuka.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveEditor = () => {
    setIsPreview(false);
    if (hasSavedPassport) {
      resetToSaved();
      setIsEditing(false);
    } else {
      router.push(companion?.backHref ?? "/pasien");
    }
  };

  const handleExitClick = () => {
    if (isDirty) {
      setShowExitConfirm(true);
      return;
    }
    clearPassportDraft(ownerId);
    leaveEditor();
  };

  const handleKeepDraftAndExit = () => {
    setShowExitConfirm(false);
    // Draft sudah tersimpan otomatis. Pastikan versi terbaru tertulis sebelum keluar.
    savePassportDraft(ownerId, {
      preferredName,
      needCodes: Array.from(selectedCodes),
      patientNote,
      step,
      updatedAt: new Date().toISOString(),
    });
    setDraftReady(false); // hentikan autosave agar draft tidak terhapus oleh pemulihan nilai
    leaveEditor();
  };

  const handleDiscardAndExit = () => {
    setShowExitConfirm(false);
    clearPassportDraft(ownerId);
    setDraftReady(false);
    leaveEditor();
  };

  const startEditing = () => {
    clearSubmissionStatus();
    const draft = loadPassportDraft(ownerId, validCodes);
    if (
      draft &&
      !isPassportDraftEmpty(draft) &&
      !isDraftSameAsSaved(draft, {
        preferredName: savedValues.preferredName,
        needCodes: Array.from(savedValues.needCodes),
        patientNote: savedValues.patientNote,
      })
    ) {
      setPreferredName(draft.preferredName);
      setPatientNote(draft.patientNote);
      setSelectedCodes(new Set(draft.needCodes));
      setStep(Math.min(draft.step, catalog.length));
      setDraftRestored(true);
    } else {
      resetToSaved();
      setStep(0);
      setDraftRestored(false);
    }
    setIsPreview(false);
    setIsEditing(true);
    setDraftReady(true);
  };

  const handleToggleNeed = (code: string) => {
    setSelectedCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    setShowNeedsError(false);
    clearSubmissionStatus();
  };

  /** Memeriksa isian; mengembalikan true bila boleh lanjut ke pratinjau atau simpan. */
  const validateForPreview = (): boolean => {
    if (selectedCodes.size === 0) {
      setShowNeedsError(true);
      setStep(0);
      return false;
    }
    setShowNeedsError(false);

    const trimmedName = preferredName.trim();
    if (!trimmedName) {
      setNameError("Nama panggilan wajib diisi.");
      setStep(lastStep);
      window.setTimeout(() => preferredNameInputRef.current?.focus(), 0);
      return false;
    }
    if (trimmedName.length > PATIENT_PREFERRED_NAME_MAX_LENGTH) {
      setNameError(
        `Nama panggilan maksimal ${PATIENT_PREFERRED_NAME_MAX_LENGTH} karakter.`
      );
      setStep(lastStep);
      window.setTimeout(() => preferredNameInputRef.current?.focus(), 0);
      return false;
    }
    setNameError("");

    if (patientNote.trim().length > PATIENT_NOTE_MAX_LENGTH) {
      setNoteError(NOTE_TOO_LONG);
      setStep(lastStep);
      return false;
    }
    setNoteError("");
    return true;
  };

  const handleNext = () => {
    if (step < lastStep) {
      setStep(step + 1);
      return;
    }
    if (validateForPreview()) {
      setIsPreview(true);
    }
  };

  const handleSavePassport = async () => {
    if (!validateForPreview()) {
      setIsPreview(false);
      return;
    }
    const trimmedName = preferredName.trim();
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(companion?.submitUrl ?? "/api/pasien/paspor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredName: trimmedName,
          needCodes: Array.from(selectedCodes),
          patientNote: patientNote.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setSaveError(
          data?.error ||
            "Terjadi kesalahan saat menyimpan paspor. Silakan coba lagi."
        );
      } else {
        clearPassportDraft(ownerId);
        syncOfflineSummary(
          trimmedName,
          new Set(selectedCodes),
          patientNote.trim() || null
        );
        setSavedValues({
          preferredName: trimmedName,
          patientNote: patientNote.trim(),
          needCodes: new Set(selectedCodes),
        });
        setSavedAt(new Date().toISOString());
        setDraftRestored(false);
        setIsPreview(false);
        setIsEditing(false);
        setShowSuccessDialog(true);
      }
    } catch {
      setSaveError(
        "Terjadi kesalahan koneksi saat menyimpan paspor. Silakan periksa jaringan Anda."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-page text-main">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header className="fixed left-1/2 top-0 z-50 w-full max-w-md -translate-x-1/2 bg-page/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-200 text-cyan-900"
            >
              <ShieldPlus className="h-6 w-6" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                {companion ? "AKSESPASS Pendamping" : "AKSESPASS Pasien"}
              </span>
              <h1 className="truncate text-xl font-bold leading-7 text-main">
                Paspor Kesehatan
              </h1>
            </div>
            {!companion && (
              <Link
                href="/pasien/akses/riwayat"
                aria-label="Riwayat akses"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
              >
                <Bell aria-hidden="true" className="h-6 w-6" />
              </Link>
            )}
            <Link
              href={companion?.backHref ?? "/pasien"}
              aria-label={companion ? "Beranda pendamping" : "Beranda pasien"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
            >
              <UserRound aria-hidden="true" className="h-6 w-6" />
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex w-full flex-1 flex-col px-4 pb-32 pt-20 focus:outline-none ${
            isEditing ? "gap-6" : "gap-4"
          }`}
        >
          {companion && (
            <p className="rounded-xl border border-cyan-700 bg-cyan-100 px-4 py-3 text-sm font-bold text-cyan-900">
              Atas nama {companion.patientName}
            </p>
          )}

          {!isEditing && (
            <>
              <section className="flex flex-col gap-3">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  Tersimpan
                </p>
                {savedAt && (
                  <p className="flex items-center gap-2 text-sm text-secondary">
                    <Clock3
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0"
                    />
                    <span>
                      Diperbarui:{" "}
                      <strong className="font-bold text-main">
                        {formatDateTimeWib(new Date(savedAt))}
                      </strong>
                    </span>
                  </p>
                )}
                {initialPassport?.lastUpdatedByCompanion && (
                  <p className="text-xs italic text-secondary">
                    Terakhir diubah oleh pendamping{" "}
                    {initialPassport.lastUpdatedByCompanion.companionName},{" "}
                    {formatDateTimeWib(
                      new Date(initialPassport.lastUpdatedByCompanion.updatedAt)
                    )}
                  </p>
                )}
              </section>

              <section
                aria-labelledby="active-needs-heading"
                className="flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id="active-needs-heading"
                    className="text-lg font-bold text-main"
                  >
                    Kebutuhan Fasilitas Aktif
                  </h3>
                  <span className="shrink-0 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-secondary">
                    {selectedCodes.size} kebutuhan
                  </span>
                </div>

                {needs
                  .filter((item) => selectedCodes.has(item.code))
                  .map((item) => {
                    const categoryLabel =
                      catalog.find((group) => group.category === item.category)
                        ?.categoryLabel ?? item.category;
                    return (
                      <article
                        key={item.code}
                        className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-100"
                        >
                          {getNeedSummaryIcon(item.iconName)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <h4 className="min-w-0 break-words font-bold text-main">
                              {item.label}
                            </h4>
                            <span className="max-w-24 shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-[0.625rem] font-bold uppercase text-cyan-800">
                              {categoryLabel}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-secondary">
                            Kebutuhan ini akan disampaikan kepada petugas
                            sesuai persetujuan ConsentQR Anda.
                          </p>
                        </div>
                      </article>
                    );
                  })}
              </section>

              {patientNote.trim() && (
                <section
                  aria-labelledby="personal-note-heading"
                  className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      id="personal-note-heading"
                      className="font-bold text-main"
                    >
                      Catatan Pribadi untuk Petugas
                    </h3>
                    <Info
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-secondary"
                    />
                  </div>
                  <blockquote className="rounded-xl bg-cyan-50 p-4 text-base italic leading-7 text-secondary">
                    “{patientNote.trim()}”
                  </blockquote>
                  <p className="flex items-center gap-2 text-xs text-secondary">
                    <EyeOff
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0"
                    />
                    Hanya dibagikan kepada petugas saat Anda menyetujui
                    pembagian catatan melalui ConsentQR.
                  </p>
                </section>
              )}

              <section className="flex flex-col gap-3">
                {companion ? (
                  <Link
                    href={companion.qrHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-center font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
                  >
                    <QrCode aria-hidden="true" className="h-5 w-5" />
                    Buat ConsentQR atas nama {companion.patientName}
                  </Link>
                ) : (
                  <>
                <div className="flex items-center gap-3 rounded-2xl bg-cyan-900 p-4 text-white">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-900"
                  >
                    <QrCode className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">ConsentQR</h3>
                    <p className="text-sm">
                      {activeQrs.length > 0
                        ? `${activeQrs.length} QR aktif untuk fasilitas kesehatan.`
                        : "Belum ada QR akses aktif."}
                    </p>
                    {activeQrs[0] && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-cyan-100">
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span className="min-w-0">
                          {activeQrs[0].facilityName} ·{" "}
                          {activeQrs[0].expiryText}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {activeQrs.length > 0 && (
                  <Link
                    href="/pasien/akses/qr"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-700 bg-cyan-100 px-4 py-3 text-center font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                  >
                    Lihat ConsentQR Aktif
                  </Link>
                )}
                <Link
                  href="/pasien/kunjungan"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-center font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
                >
                  <QrCode aria-hidden="true" className="h-5 w-5" />
                  Buat ConsentQR Sekarang
                </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-100 px-4 py-3 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                >
                  <Pencil aria-hidden="true" className="h-5 w-5" />
                  Ubah Kebutuhan Paspor
                </button>
              </section>
            </>
          )}


          {isEditing && !isPreview && (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="text-sm font-bold text-main"
                    aria-current="step"
                  >
                    Langkah {step + 1} dari {totalSteps}
                  </p>
                  <button
                    ref={exitButtonRef}
                    type="button"
                    onClick={handleExitClick}
                    aria-label="Keluar dari pengisian paspor"
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-input bg-white text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                  >
                    <X aria-hidden="true" className="h-6 w-6" />
                  </button>
                </div>
                <div
                  aria-hidden="true"
                  className="h-2 w-full overflow-hidden rounded-full bg-cyan-100"
                >
                  <div
                    className="h-full rounded-full bg-cyan-700"
                    style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {draftRestored && (
                <StatusBanner
                  variant="success"
                  title="Draft dilanjutkan"
                  message="Isian terakhir Anda di perangkat ini sudah dipulihkan. Draft belum dibagikan lewat QR sampai Anda menyimpan paspor."
                />
              )}

              {step === 0 && (
                <section
                  aria-labelledby="privacy-title"
                  className="flex gap-3 rounded-2xl bg-cyan-100 p-4 shadow-sm"
                >
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-700 text-white"
                  >
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 id="privacy-title" className="font-bold text-main">
                      Prinsip Privasi Pasien
                    </h2>
                    <p className="mt-1 text-base leading-7 text-main">
                      Paspor ini hanya memuat kebutuhan fasilitas dan bantuan
                      akomodasi di lokasi,{" "}
                      <span className="font-bold text-red-700">BUKAN</span>{" "}
                      diagnosis atau rekam medis pribadi Anda.
                    </p>
                  </div>
                </section>
              )}

              {showNeedsError && (
                <StatusBanner
                  variant="warning"
                  title="Pilih minimal satu kebutuhan"
                  message="Paspor membutuhkan minimal satu kebutuhan layanan agar dapat disimpan."
                />
              )}

              {currentGroup && (
                <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0">
                  <legend className="w-full">
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="flex w-full items-center justify-between gap-3 focus:outline-none"
                    >
                      <span className="text-lg font-bold text-main">
                        {currentGroup.categoryLabel}
                      </span>
                      <span className="shrink-0 text-sm text-secondary">
                        Pilih yang berlaku
                      </span>
                    </h2>
                  </legend>
                  <div className="flex flex-col gap-3">
                    {currentGroup.items.map((item) => {
                      const checked = selectedCodes.has(item.code);
                      const inputId = `need-${item.code}`;
                      return (
                        <label
                          key={item.code}
                          htmlFor={inputId}
                          className={`flex min-h-14 w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm focus-within:ring-4 focus-within:ring-cyan-900 active:scale-[0.99] ${
                            checked
                              ? "border-cyan-700 bg-cyan-100 text-main"
                              : "border-cyan-400 bg-white text-secondary"
                          }`}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            name="needCodes"
                            value={item.code}
                            checked={checked}
                            onChange={() => handleToggleNeed(item.code)}
                            className="peer sr-only"
                          />
                          <span className="flex min-w-0 items-center gap-3 pr-2">
                            <span
                              aria-hidden="true"
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                checked
                                  ? "bg-cyan-700/10"
                                  : "bg-cyan-100 text-secondary [&_svg]:opacity-70"
                              }`}
                            >
                              {getNeedSummaryIcon(item.iconName)}
                            </span>
                            <span
                              className={`min-w-0 text-base leading-snug ${
                                checked
                                  ? "font-bold text-main"
                                  : "font-normal text-secondary"
                              }`}
                            >
                              {item.label}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow-inner peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-900 peer-focus-visible:ring-offset-2 ${
                              checked
                                ? "bg-cyan-700 text-white"
                                : "bg-cyan-100 text-transparent"
                            }`}
                          >
                            {checked && <Check className="h-6 w-6" />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {isNotesStep && (
                <section
                  aria-labelledby="notes-step-heading"
                  className="flex flex-col gap-6"
                >
                  <h2
                    id="notes-step-heading"
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    className="text-lg font-bold text-main focus:outline-none"
                  >
                    Nama dan Catatan
                  </h2>
                  <TextField
                    ref={preferredNameInputRef}
                    id="field-preferred-name"
                    label="Nama panggilan"
                    value={preferredName}
                    onChange={(event) => {
                      setPreferredName(event.target.value);
                      setNameError("");
                      clearSubmissionStatus();
                    }}
                    helperText="Boleh nama panggilan, tidak perlu nama lengkap."
                    helperTextAsPlaceholder
                    error={nameError}
                    maxLength={PATIENT_PREFERRED_NAME_MAX_LENGTH}
                    aria-required="true"
                  />
                  <TextField
                    id={noteInputId}
                    label="Catatan Bantuan Khusus (Opsional)"
                    variant="textarea"
                    value={patientNote}
                    maxLength={PATIENT_NOTE_MAX_LENGTH}
                    charCount={patientNote.length}
                    rows={4}
                    error={noteError}
                    helperText="Tuliskan preferensi komunikasi atau instruksi spesifik untuk petugas medis saat menyapa Anda. Hindari menulis diagnosis."
                    helperTextAsPlaceholder
                    onChange={(event) => {
                      const value = event.target.value;
                      setPatientNote(value);
                      setNoteError(
                        value.length > PATIENT_NOTE_MAX_LENGTH
                          ? NOTE_TOO_LONG
                          : ""
                      );
                      clearSubmissionStatus();
                    }}
                  />
                </section>
              )}

              <div className="flex items-center gap-3 pt-2">
                {step > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => setStep(step - 1)}
                    className="flex-1"
                  >
                    Kembali
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1">
                  {isNotesStep ? "Lihat Pratinjau" : "Lanjut"}
                </Button>
              </div>
              <p className="flex items-center justify-center gap-2 text-sm text-secondary">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                Pilihan Anda tersimpan otomatis sebagai draft di perangkat ini.
              </p>
            </>
          )}

          {isEditing && isPreview && (
            <>
              <section
                aria-labelledby="preview-heading"
                className="flex flex-col gap-2"
              >
                <h2
                  id="preview-heading"
                  className="text-xl font-bold text-main"
                >
                  Pratinjau Paspor
                </h2>
                <p className="text-base text-main">
                  Seperti inilah paspor Anda akan terlihat oleh petugas, hanya
                  berisi kebutuhan layanan. Aplikasi ini tidak meminta
                  diagnosis.
                </p>
                <p className="text-sm text-secondary">
                  Nama panggilan: <strong>{preferredName.trim()}</strong>
                </p>
              </section>

              {catalog
                .map((group) => ({
                  group,
                  chosen: group.items.filter((item) =>
                    selectedCodes.has(item.code)
                  ),
                }))
                .filter(({ chosen }) => chosen.length > 0)
                .map(({ group, chosen }) => (
                  <section
                    key={group.category}
                    aria-label={group.categoryLabel}
                    className="flex flex-col gap-2"
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
                      {group.categoryLabel}
                    </h3>
                    {chosen.map((item) => (
                      <div
                        key={item.code}
                        className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100"
                        >
                          {getNeedSummaryIcon(item.iconName)}
                        </span>
                        <span className="min-w-0 break-words font-bold text-main">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </section>
                ))}

              {patientNote.trim() && (
                <section
                  aria-labelledby="preview-note-heading"
                  className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <h3 id="preview-note-heading" className="font-bold text-main">
                    Catatan Pribadi untuk Petugas
                  </h3>
                  <blockquote className="rounded-xl bg-cyan-50 p-4 text-base italic leading-7 text-secondary">
                    “{patientNote.trim()}”
                  </blockquote>
                </section>
              )}

              {saveError && (
                <StatusBanner
                  variant="error"
                  title="Gagal menyimpan paspor"
                  message={saveError}
                />
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSavePassport}
                  disabled={isSaving}
                  isLoading={isSaving}
                  className="w-full gap-2 rounded-2xl py-4 text-lg"
                >
                  <Save aria-hidden="true" className="h-6 w-6" />
                  Simpan Paspor
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSaveError(null);
                    setIsPreview(false);
                  }}
                  disabled={isSaving}
                  className="w-full"
                >
                  <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                  Kembali Edit
                </Button>
                <p className="flex items-center justify-center gap-2 text-sm text-secondary">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                  Hanya kebutuhan yang Anda pilih yang dibagikan kepada petugas.
                </p>
              </div>
            </>
          )}
        </main>

        {!companion && (
        <nav
          aria-label="Navigasi utama pasien"
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-cyan-200 bg-page/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <ul className="flex h-16 items-center justify-between px-1">
            {PATIENT_NAV_ITEMS.map(({ href, label, Icon, emphasis }) => {
              const isActive = href === "/pasien/paspor";
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 ${
                      isActive
                        ? "font-bold text-cyan-700"
                        : "text-secondary hover:text-main"
                    }`}
                  >
                    {emphasis ? (
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-700 text-white shadow-sm"
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                    ) : (
                      <Icon aria-hidden="true" className="h-[22px] w-[22px]" />
                    )}
                    <span className="text-[11px] leading-tight">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        )}
      </div>

      <ActionDialog
        isOpen={showExitConfirm}
        title="Keluar dari pengisian paspor?"
        description="Isian Anda belum disimpan sebagai paspor. Simpan sebagai draft di perangkat ini, atau buang."
        triggerRef={exitButtonRef}
        onClose={() => setShowExitConfirm(false)}
        actions={[
          {
            label: "Simpan draft",
            onClick: handleKeepDraftAndExit,
            variant: "primary",
          },
          { label: "Buang", onClick: handleDiscardAndExit },
          {
            label: "Lanjut mengisi",
            onClick: () => setShowExitConfirm(false),
          },
        ]}
      />

      <ActionDialog
        isOpen={showSuccessDialog}
        title="Paspor tersimpan"
        description="Perubahan langsung berlaku, termasuk untuk ConsentQR yang masih aktif."
        onClose={() => setShowSuccessDialog(false)}
        actions={
          companion
            ? [
                {
                  label: "Ke Beranda Pendamping",
                  onClick: () => {
                    setShowSuccessDialog(false);
                    router.push(companion.backHref);
                  },
                  variant: "primary",
                },
              ]
            : [
                {
                  label: "Atur Kartu Cetak",
                  onClick: () => router.push("/pasien/kartu-cetak"),
                },
                {
                  label: "Ke Beranda",
                  onClick: () => router.push("/pasien"),
                  variant: "primary",
                },
              ]
        }
      />
    </div>
  );
}
