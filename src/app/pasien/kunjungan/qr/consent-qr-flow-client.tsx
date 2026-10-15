"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Button,
  ConfirmDialog,
  PatientNeedsSummary,
  RadioList,
  StatusBanner,
  TextLink,
  Toggle,
} from "@/components";
import {
  buildQrPayload,
  formatExpiryText,
  formatRemainingTime,
  formatTimeWib,
  formatTokenForDisplay,
  getExpiryStatus,
  resolveDefaultSharedFields,
  type ConsentDuration,
} from "@/lib/consent/time";
import { DESIGN_TOKENS } from "@/lib/tokens";

const CATEGORY_LABELS: Record<string, string> = {
  komunikasi: "Kebutuhan Komunikasi",
  penglihatan: "Kebutuhan Penglihatan",
  pendengaran: "Kebutuhan Pendengaran",
  mobilitas: "Kebutuhan Mobilitas",
  sensorik_lingkungan: "Kebutuhan Sensorik & Lingkungan",
  pendampingan: "Kebutuhan Pendampingan",
};

export interface ConsentQrFlowClientProps {
  facility: {
    id: string;
    name: string;
  };
  passport: {
    preferredName: string;
    needs: Array<{
      code: string;
      label: string;
      iconName: string;
      category: string;
    }>;
    patientNote?: string | null;
  };
  lastSharedFields: string[] | null;
  initialActiveCount: number;
  appOrigin: string;
  createConsentUrl?: string;
  patientLabel?: string;
  cancelHref?: string;
  homeHref?: string;
  /** Bila diisi, setelah QR dipindai pasien diarahkan ke layar Menunggu Dipanggil (P13). */
  waitingHrefBase?: string;
}

export function ConsentQrFlowClient({
  facility,
  passport,
  lastSharedFields,
  initialActiveCount,
  appOrigin,
  createConsentUrl = "/api/pasien/kunjungan/consent",
  patientLabel,
  cancelHref = "/pasien/kunjungan",
  homeHref = "/pasien",
  waitingHrefBase,
}: ConsentQrFlowClientProps) {
  const router = useRouter();
  // 1. Kategori yang benar-benar ada di paspor
  const availableCategories = Array.from(
    new Set(passport.needs.map((n) => n.category))
  );
  const hasNote = Boolean(
    passport.patientNote && passport.patientNote.trim().length > 0
  );

  // 2. Bawaan toggle [Usulan]
  const defaultFields = resolveDefaultSharedFields({
    lastSharedFields,
    availableCategories,
    hasNote,
  });

  const [selectedFields, setSelectedFields] = useState<string[]>(defaultFields);
  const [duration, setDuration] = useState<ConsentDuration>("1 jam");

  // Step tampilan: "configure" (P11) atau "qr" (P12)
  const [step, setStep] = useState<"configure" | "qr">("configure");

  // State token HANYA di memori komponen
  const [token, setToken] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<
    "aktif" | "dipindai" | "kedaluwarsa" | "dicabut"
  >("aktif");
  const [activeQrCount, setActiveQrCount] = useState<number>(initialActiveCount);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isRejectedDialogOpen, setIsRejectedDialogOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  // Hitung kategori kebutuhan yang sedang aktif (di luar catatan)
  const activeNeedsCategories = selectedFields.filter((f) =>
    availableCategories.includes(f)
  );

  const toggleField = (field: string, checked: boolean) => {
    setSelectedFields((prev) => {
      if (checked) {
        return prev.includes(field) ? prev : [...prev, field];
      }
      return prev.filter((f) => f !== field);
    });
  };

  // Timer pembaruan per menit untuk teks statis sisa waktu
  useEffect(() => {
    if (
      step !== "qr" ||
      !expiresAt ||
      qrStatus === "dicabut" ||
      qrStatus === "kedaluwarsa"
    ) {
      return;
    }

    const timer = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);
      if (currentNow.getTime() >= expiresAt.getTime()) {
        setQrStatus("kedaluwarsa");
        setToken(null);
        setQrSvg(null);
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [step, expiresAt, qrStatus]);

  // Polling tiap 5 detik ke endpoint status milik pasien
  useEffect(() => {
    if (
      step !== "qr" ||
      !qrId ||
      qrStatus === "dipindai" ||
      qrStatus === "kedaluwarsa" ||
      qrStatus === "dicabut"
    ) {
      return;
    }

    let isMounted = true;

    const pollStatus = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      try {
        const res = await fetch(
          `/api/pasien/qr/${encodeURIComponent(qrId)}/status`,
          {
            headers: { "Cache-Control": "no-store" },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.ok) return;

        if (data.status === "dipindai") {
          setQrStatus("dipindai");
          if (waitingHrefBase && typeof data.visitId === "string") {
            router.push(`${waitingHrefBase}/${encodeURIComponent(data.visitId)}`);
          }
        } else if (data.status === "dicabut") {
          setQrStatus("dicabut");
          setToken(null);
          setQrSvg(null);
        } else if (data.status === "kedaluwarsa") {
          setQrStatus("kedaluwarsa");
          setToken(null);
          setQrSvg(null);
        }
      } catch {
        // Abaikan galat jaringan sementara saat polling
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = setInterval(pollStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [step, qrId, qrStatus, router, waitingHrefBase]);

  // Handler Buat QR (P11 -> P12)
  const handleCreateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeNeedsCategories.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(createConsentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: facility.id,
          sharedFields: selectedFields,
          duration,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Gagal membuat ConsentQR.");
        setIsSubmitting(false);
        return;
      }

      const payload = buildQrPayload(data.token, appOrigin);
      const svg = await QRCode.toString(payload, {
        type: "svg",
        margin: 4,
        color: {
          dark: DESIGN_TOKENS["--text-main"],
          light: DESIGN_TOKENS["--color-white"],
        },
      });

      setToken(data.token);
      setQrId(data.qrId);
      const expDate = new Date(data.expiresAt);
      setExpiresAt(expDate);
      setQrSvg(svg);
      setQrStatus("aktif");
      setNow(new Date());
      setActiveQrCount((prev) => prev + 1);
      setStep("qr");
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Cabut QR
  const handleRevoke = async () => {
    if (!qrId) return;
    setIsRevokeDialogOpen(false);
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/pasien/qr/${encodeURIComponent(qrId)}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (data.ok) {
        setQrStatus("dicabut");
        setToken(null);
        setQrSvg(null);
      } else {
        setErrorMessage(data.error || "Gagal mencabut QR.");
      }
    } catch {
      setErrorMessage("Gagal mencabut QR. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Petugas melaporkan QR ditolak: cabut QR lama lalu arahkan pasien membuat QR baru (P12 -> P11)
  const handleRejectedByStaff = async () => {
    if (!qrId) return;
    setIsRejectedDialogOpen(false);
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/pasien/qr/${encodeURIComponent(qrId)}/revoke`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.ok) {
        handleResetToConfigure();
      } else {
        setErrorMessage(data.error || "Gagal mencabut QR.");
      }
    } catch {
      setErrorMessage("Gagal mencabut QR. Periksa koneksi Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToConfigure = () => {
    setStep("configure");
    setToken(null);
    setQrId(null);
    setExpiresAt(null);
    setQrSvg(null);
    setQrStatus("aktif");
    setErrorMessage(null);
  };

  // Filter kebutuhan untuk pratinjau PatientNeedsSummary
  const previewNeeds = passport.needs.filter((n) =>
    selectedFields.includes(n.category)
  );
  const previewNote = selectedFields.includes("catatan_pasien")
    ? passport.patientNote
    : null;

  // Status masa berlaku
  const expiryStatus = expiresAt
    ? getExpiryStatus(expiresAt, now)
    : { isExpired: false, isExpiringSoon: false, remainingMinutes: 0 };

  // ==========================================================================
  // TAMPILAN P11 — PENGATURAN CONSENTQR
  // ==========================================================================
  if (step === "configure") {
    return (
      <form
        onSubmit={handleCreateQr}
        className="flex flex-col gap-6 max-w-full w-full"
      >
        <div className="flex flex-col gap-1">
          {patientLabel && (
            <span className="text-xs font-bold text-cyan-900 uppercase tracking-wider">
              {patientLabel}
            </span>
          )}
          <p className="text-base text-secondary">
            Tujuan kunjungan:{" "}
            <strong className="text-main font-bold">{facility.name}</strong>
          </p>
          <p className="text-sm text-secondary">
            Pilih data yang ingin Anda bagikan kepada petugas di fasilitas ini.
          </p>
        </div>

        {errorMessage && (
          <StatusBanner
            variant="error"
            title="Gagal Membuat QR"
            message={errorMessage}
          />
        )}

        {/* Info nama panggilan dan privasi */}
        <div className="p-4 rounded-xl bg-white border border-cyan-800 flex flex-col gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-main">
              Nama Panggilan Pasien
            </span>
            <span className="text-lg font-bold text-main mt-0.5">
              {passport.preferredName}
            </span>
            <span className="text-xs text-secondary mt-1">
              Nama panggilan selalu dibagikan agar petugas dapat menyapa Anda.
            </span>
          </div>
          <div className="border-t border-cyan-100 pt-2 mt-1">
            <span className="text-xs text-secondary">
              Diagnosis tidak diminta dan tidak ikut ke dalam ConsentQR.
            </span>
          </div>
        </div>

        {/* Toggle Kebutuhan Layanan */}
        <fieldset className="flex flex-col gap-4 border-0 p-0 m-0">
          <legend className="text-base font-bold text-main mb-1">
            Kebutuhan yang Dibagikan
          </legend>

          <div className="flex flex-col gap-3">
            {availableCategories.map((category) => {
              const label = CATEGORY_LABELS[category] || category;
              const isChecked = selectedFields.includes(category);

              return (
                <div
                  key={category}
                  className="p-3 bg-white border border-cyan-800/30 rounded-xl"
                >
                  <Toggle
                    id={`toggle-${category}`}
                    label={label}
                    checked={isChecked}
                    onChange={(e) => toggleField(category, e.target.checked)}
                  />
                </div>
              );
            })}

            {hasNote && (
              <div className="p-3 bg-white border border-cyan-800/30 rounded-xl">
                <Toggle
                  id="toggle-catatan-pasien"
                  label="Catatan untuk Petugas"
                  checked={selectedFields.includes("catatan_pasien")}
                  onChange={(e) =>
                    toggleField("catatan_pasien", e.target.checked)
                  }
                />
              </div>
            )}
          </div>
        </fieldset>

        {activeNeedsCategories.length === 0 && (
          <StatusBanner
            variant="warning"
            title="Pilih minimal satu kebutuhan"
            message="Pilih minimal satu kebutuhan untuk dibagikan."
          />
        )}

        {/* Masa Berlaku */}
        <RadioList
          name="consent-duration"
          legend="Masa Berlaku ConsentQR"
          value={duration}
          onChange={(val) => setDuration(val as ConsentDuration)}
          options={[
            {
              value: "1 jam",
              label: "1 jam (bawaan, paling singkat)",
              description: "Masa berlaku singkat untuk pemeriksaan langsung",
            },
            {
              value: "hari ini",
              label: "Hari ini (s.d. 23:59 WIB)",
              description: "Berlaku hingga akhir hari operasional faskes",
            },
            {
              value: "24 jam",
              label: "24 jam",
              description: "Masa berlaku satu hari penuh",
            },
          ]}
        />

        {/* Pratinjau "Yang akan dilihat petugas" */}
        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-lg font-bold text-main border-b border-cyan-100 pb-2">
            Yang akan dilihat petugas
          </h2>
          <PatientNeedsSummary
            preferredName={passport.preferredName}
            needs={previewNeeds}
            patientNote={previewNote}
            showPrivacyNotes={true}
          />
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-cyan-100">
          <Button
            type="submit"
            disabled={activeNeedsCategories.length === 0 || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Memproses…" : "Buat QR"}
          </Button>
          <Link
            href={cancelHref}
            className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900 text-center w-full sm:w-auto"
          >
            Batal
          </Link>
        </div>
      </form>
    );
  }

  // ==========================================================================
  // TAMPILAN P12 — TAMPILAN QR (SETELAH QR DIBUAT)
  // ==========================================================================
  const expiryTimeFormatted = expiresAt ? formatTimeWib(expiresAt) : "";
  const expiryFullText = expiresAt ? formatExpiryText(expiresAt, now) : "";

  return (
    <div className="flex flex-col gap-6 max-w-full w-full">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-main">
          ConsentQR untuk {facility.name}
        </h2>
        <p className="text-sm text-secondary">
          Tunjukkan QR ini ke petugas saat giliran Anda tiba.
        </p>
      </div>

      {errorMessage && (
        <StatusBanner
          variant="error"
          title="Pemberitahuan"
          message={errorMessage}
        />
      )}

      {/* Status: DIPINDAI */}
      {qrStatus === "dipindai" && (
        <div className="flex flex-col gap-3">
          <StatusBanner
            variant="success"
            title={`Dipindai oleh petugas — ${facility.name}`}
            message="Petugas telah berhasil memindai QR dan membaca kebutuhan layanan yang Anda bagikan."
          />
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm hover:bg-cyan-800 focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center w-full sm:w-auto"
          >
            Ke Beranda
          </Link>
        </div>
      )}

      {/* Status: KEDALUWARSA */}
      {qrStatus === "kedaluwarsa" && (
        <div className="flex flex-col gap-3">
          <StatusBanner
            variant="error"
            title="QR Kedaluwarsa"
            message="Masa berlaku QR sudah habis dan tidak dapat dipakai lagi."
          />
          <div>
            <Button onClick={handleResetToConfigure} className="w-full sm:w-auto">Buat QR Baru</Button>
          </div>
        </div>
      )}

      {/* Status: DICABUT */}
      {qrStatus === "dicabut" && (
        <div className="flex flex-col gap-3">
          <StatusBanner
            variant="success"
            title="QR dicabut"
            message="ConsentQR telah dicabut dan tidak dapat dipakai lagi."
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleResetToConfigure} className="w-full sm:w-auto">Buat QR Baru</Button>
            <Link
              href={homeHref}
              className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-100 border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900 text-center w-full sm:w-auto"
            >
              Ke Beranda
            </Link>
          </div>
        </div>
      )}

      {/* Peringatan Hampir Kedaluwarsa (≤ 15 menit dan masih aktif) */}
      {qrStatus === "aktif" && expiryStatus.isExpiringSoon && (
        <StatusBanner
          variant="warning"
          title="Hampir Kedaluwarsa"
          message={`Masa berlaku QR tersisa ${formatRemainingTime(
            expiresAt!,
            now
          )}. Tunjukkan segera ke petugas.`}
        />
      )}

      {/* Tampilan QR Gambar dan Kode Manual (Hanya saat status aktif) */}
      {qrStatus === "aktif" && qrSvg && (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border-2 border-cyan-800 shadow-sm max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            role="img"
            alt={`ConsentQR untuk ${facility.name}, berlaku sampai ${expiryTimeFormatted}`}
            src={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
            width={256}
            height={256}
            className="w-64 h-64 max-w-full aspect-square"
          />

          {token && (
            <div className="flex flex-col items-center gap-1 w-full text-center">
              <span className="text-xs text-secondary">
                Kode manual bila kamera petugas tidak bisa dipakai
              </span>
              <span className="text-lg font-bold text-main tracking-widest select-all break-all">
                {formatTokenForDisplay(token)}
              </span>
            </div>
          )}

          <p className="text-sm font-normal text-secondary text-center">
            {expiryFullText}
          </p>
        </div>
      )}

      {/* Teks Penjelasan Keamanan di Bawah QR */}
      <div className="p-4 rounded-xl bg-cyan-50/50 border border-cyan-800/20 flex flex-col gap-2">
        <p className="text-sm text-secondary">
          QR ini hanya tampil sekarang. Bila halaman ditutup, buat QR baru; QR
          lama tetap aktif sampai kedaluwarsa atau dicabut di Kontrol Akses.
        </p>
        {activeQrCount > 1 && (
          <p className="text-sm text-secondary">
            {homeHref === "/pasien" ? (
              <>
                Anda memiliki ConsentQR aktif lainnya. Buka{" "}
                <TextLink href="/pasien/akses/qr">Kontrol Akses</TextLink> untuk
                melihat atau mencabutnya.
              </>
            ) : (
              "Pasien memiliki ConsentQR aktif lainnya."
            )}
          </p>
        )}
      </div>

      {/* Ringkasan Data yang Dibagikan */}
      <div className="flex flex-col gap-3 pt-2">
        <h3 className="text-base font-bold text-main border-b border-cyan-100 pb-2">
          Data yang dibagikan pada kunjungan ini
        </h3>
        <PatientNeedsSummary
          preferredName={passport.preferredName}
          needs={previewNeeds}
          patientNote={previewNote}
          showPrivacyNotes={false}
        />
      </div>

      {/* Tombol Cabut Sekarang (Bila belum dicabut dan belum kedaluwarsa) */}
      {qrStatus !== "dicabut" && qrStatus !== "kedaluwarsa" && (
        <div className="flex flex-wrap gap-3 pt-4 border-t border-cyan-100">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsRevokeDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            Cabut Sekarang
          </Button>
          {qrStatus === "aktif" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRejectedDialogOpen(true)}
              className="w-full sm:w-auto"
            >
              Petugas bilang QR ditolak
            </Button>
          )}
        </div>
      )}

      {/* Pop-up Konfirmasi Pencabutan */}
      <ConfirmDialog
        isOpen={isRevokeDialogOpen}
        title="Cabut QR ini?"
        description="QR tidak bisa dipakai lagi."
        confirmLabel="Ya, Cabut"
        cancelLabel="Batal"
        onConfirm={handleRevoke}
        onClose={() => setIsRevokeDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={isRejectedDialogOpen}
        title="QR ditolak petugas?"
        description="QR ini akan dicabut, lalu Anda diarahkan membuat QR baru."
        confirmLabel="Cabut dan Buat QR Baru"
        cancelLabel="Batal"
        onConfirm={handleRejectedByStaff}
        onClose={() => setIsRejectedDialogOpen(false)}
      />
    </div>
  );
}
