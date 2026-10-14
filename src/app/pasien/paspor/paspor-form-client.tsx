"use client";

import { useMemo, useRef, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  ConfirmDialog,
  StatusBanner,
  TextField,
  getNeedSummaryIcon,
} from "@/components";
import type { NeedsCategoryGroup, OwnPassportData } from "@/lib/passport";
import {
  PATIENT_NOTE_MAX_LENGTH,
  PATIENT_PREFERRED_NAME_MAX_LENGTH,
} from "@/lib/passport/constants";
import type { ActiveQrItem } from "@/lib/consent";
import { formatDateTimeWib } from "@/lib/consent/time";

interface PassportFormClientProps {
  catalog: NeedsCategoryGroup[];
  initialPassport: OwnPassportData | null;
  activeQrs: ActiveQrItem[];
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

export function PassportFormClient({
  catalog,
  initialPassport,
  activeQrs,
}: PassportFormClientProps) {
  const router = useRouter();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const preferredNameInputRef = useRef<HTMLInputElement>(null);
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
  const [noteError, setNoteError] = useState(() =>
    (initialPassport?.patientNote?.length ?? 0) > PATIENT_NOTE_MAX_LENGTH
      ? `Catatan tersimpan melebihi batas ${PATIENT_NOTE_MAX_LENGTH} karakter. Ringkas catatan sebelum menyimpan.`
      : ""
  );
  const [showNeedsError, setShowNeedsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const hasSavedPassport = savedAt !== null;

  const needs = useMemo(
    () => catalog.flatMap((group) => group.items),
    [catalog]
  );

  const isDirty = useMemo(() => {
    const originalCodes = savedValues.needCodes;
    if (
      preferredName.trim() !== savedValues.preferredName.trim() ||
      patientNote.trim() !== savedValues.patientNote.trim() ||
      selectedCodes.size !== originalCodes.size
    ) {
      return true;
    }
    for (const code of selectedCodes) {
      if (!originalCodes.has(code)) return true;
    }
    return false;
  }, [patientNote, preferredName, savedValues, selectedCodes]);

  const clearSubmissionStatus = () => {
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleExitClick = () => {
    if (isDirty && !saveSuccess) {
      setShowExitConfirm(true);
      return;
    }
    if (hasSavedPassport) {
      setIsEditing(false);
    } else {
      router.push("/pasien");
    }
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

  const handleSavePassport = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const trimmedName = preferredName.trim();

    if (!trimmedName) {
      setNameError("Nama panggilan wajib diisi.");
      preferredNameInputRef.current?.focus();
      return;
    }
    if (trimmedName.length > PATIENT_PREFERRED_NAME_MAX_LENGTH) {
      setNameError(
        `Nama panggilan maksimal ${PATIENT_PREFERRED_NAME_MAX_LENGTH} karakter.`
      );
      preferredNameInputRef.current?.focus();
      return;
    }
    setNameError("");

    if (patientNote.trim().length > PATIENT_NOTE_MAX_LENGTH) {
      setNoteError(
        `Catatan maksimal ${PATIENT_NOTE_MAX_LENGTH} karakter. Ringkas catatan sebelum menyimpan.`
      );
      return;
    }
    setNoteError("");

    if (selectedCodes.size === 0) {
      setShowNeedsError(true);
      return;
    }
    setShowNeedsError(false);
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/pasien/paspor", {
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
        setSavedValues({
          preferredName: trimmedName,
          patientNote: patientNote.trim(),
          needCodes: new Set(selectedCodes),
        });
        setSavedAt(new Date().toISOString());
        setSaveSuccess(true);
        setIsEditing(false);
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
                AKSESPASS Pasien
              </span>
              <h1 className="truncate text-xl font-bold leading-7 text-main">
                Paspor Kesehatan
              </h1>
            </div>
            <Link
              href="/pasien/akses/riwayat"
              aria-label="Riwayat akses"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              <Bell aria-hidden="true" className="h-6 w-6" />
            </Link>
            <Link
              href="/pasien"
              aria-label="Beranda pasien"
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
                <button
                  type="button"
                  onClick={() => {
                    clearSubmissionStatus();
                    setIsEditing(true);
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-100 px-4 py-3 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                >
                  <Pencil aria-hidden="true" className="h-5 w-5" />
                  Ubah Kebutuhan Paspor
                </button>
              </section>
            </>
          )}

          {isEditing && hasSavedPassport && (
            <button
              ref={backButtonRef}
              type="button"
              onClick={handleExitClick}
              className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl px-3 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Kembali ke pratinjau
            </button>
          )}

          {isEditing && (
            <>
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
                <span className="font-bold text-red-700">BUKAN</span> diagnosis
                atau rekam medis pribadi Anda.
              </p>
            </div>
          </section>

              <form
            className="flex flex-col gap-6"
            onSubmit={handleSavePassport}
            noValidate
          >
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

            <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0">
              <legend className="w-full">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-lg font-bold text-main">
                    Kebutuhan Fasilitas Layanan
                  </span>
                  <span className="shrink-0 text-sm text-secondary">
                    Pilih yang berlaku
                  </span>
                </span>
              </legend>
              {showNeedsError && (
                <StatusBanner
                  variant="warning"
                  title="Pilih minimal satu kebutuhan"
                  message="Paspor membutuhkan minimal satu kebutuhan layanan agar dapat disimpan."
                />
              )}
              <div className="flex flex-col gap-3">
                {needs.map((item) => {
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
                            checked ? "font-bold text-main" : "font-normal text-secondary"
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

            <div className="flex flex-col gap-2">
              <TextField
                id={noteInputId}
                label="Catatan Bantuan Khusus (Bebas)"
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
                      ? `Catatan maksimal ${PATIENT_NOTE_MAX_LENGTH} karakter. Ringkas catatan sebelum menyimpan.`
                      : ""
                  );
                  clearSubmissionStatus();
                }}
              />
            </div>

            {saveSuccess && (
              <StatusBanner
                variant="success"
                title="Paspor tersimpan"
                message="Perubahan langsung berlaku, termasuk untuk ConsentQR yang masih aktif."
              />
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
                type="submit"
                disabled={isSaving}
                isLoading={isSaving}
                className="w-full gap-2 rounded-2xl py-4 text-lg"
              >
                <Save aria-hidden="true" className="h-6 w-6" />
                Simpan Paspor Kebutuhan
              </Button>
              <p className="flex items-center justify-center gap-2 text-sm text-secondary">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                Hanya kebutuhan yang Anda pilih yang dibagikan kepada petugas.
              </p>
            </div>
              </form>
            </>
          )}
        </main>

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
      </div>

      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Kembali tanpa menyimpan?"
        description="Perubahan paspor akan hilang."
        confirmLabel="Ya, Buang"
        cancelLabel="Tetap mengisi"
        triggerRef={backButtonRef}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          if (hasSavedPassport) {
            setIsEditing(false);
          } else {
            router.push("/pasien");
          }
        }}
      />
    </div>
  );
}
