"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Button,
  CareProofScale,
  type CareProofValue,
  ChoiceChip,
  ChoiceGroup,
  PageShell,
  PatientNeedsSummary,
  StatusBanner,
  TextField,
  type StatusBannerVariant,
} from "@/components";
import { extractToken } from "@/lib/consent/extract-token";
import { formatVisitTimeWIB } from "@/lib/visits/format";
import type { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Hand,
  FileText,
  MessageSquare,
  LayoutGrid,
  BellRing,
  Volume2,
  Type,
  Accessibility,
  HeartHandshake,
  VolumeX,
  ListChecks,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export type PindaiStep = "pindai" | "kebutuhan" | "saran" | "catat" | "konfirmasi";

export interface ScanSuccessData {
  visitId: string;
  namaPanggilan?: string;
  preferredName?: string;
  kebutuhan: Array<{
    kode?: string;
    label: string;
    ikon?: string;
    kategori?: string;
  }>;
  catatanPasien?: string | null;
  expiresAt: string;
  expiresSoon: boolean;
}

export interface ClientAccommodationSuggestion {
  id: string;
  ruleIds: string[];
  actionText: string;
  iconName: string;
  source: string;
  version: number;
  category: string;
  triggerNeedCodes: string[];
}

export interface ClientUncoveredNeed {
  code: string;
  label: string;
}

interface BannerState {
  variant: StatusBannerVariant;
  icon?: "default" | "ban";
  title: string;
  message: string;
  action?: React.ReactNode;
}

interface PetugasPindaiClientProps {
  initialToken?: string;
  returnHref?: string;
}

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit

function renderRuleIcon(iconName: string) {
  const iconMap: Record<
    string,
    React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  > = {
    Hand,
    FileText,
    MessageSquare,
    LayoutGrid,
    BellRing,
    Volume2,
    Type,
    Accessibility,
    HeartHandshake,
    VolumeX,
    ListChecks,
    Users,
  };
  const IconComponent = iconMap[iconName] || Sparkles;
  return <IconComponent className="w-6 h-6 shrink-0 text-cyan-900" aria-hidden="true" />;
}

export function PetugasPindaiClient({
  initialToken,
  returnHref = "/petugas",
}: PetugasPindaiClientProps) {
  const [step, setStep] = useState<PindaiStep>("pindai");
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>("");
  const [scanData, setScanData] = useState<ScanSuccessData | null>(null);
  const [isDataHidden, setIsDataHidden] = useState<boolean>(false);

  // State untuk Saran Tindakan (T6) dan Catat Bantuan (T8)
  const [suggestions, setSuggestions] = useState<ClientAccommodationSuggestion[]>([]);
  const [uncoveredNeeds, setUncoveredNeeds] = useState<ClientUncoveredNeed[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // State untuk Bantuan Dicatat (T8) - Semua tercentang di awal
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [staffNote, setStaffNote] = useState<string>("");
  const [isSavingAssistance, setIsSavingAssistance] = useState<boolean>(false);
  const [saveAssistanceError, setSaveAssistanceError] = useState<string | null>(null);
  const [alreadyRecordedConflict, setAlreadyRecordedConflict] = useState<boolean>(false);

  // State untuk Konfirmasi (T9)
  const [showOnSiteConfirmation, setShowOnSiteConfirmation] = useState<boolean>(false);
  const [onSiteScaleValue, setOnSiteScaleValue] = useState<CareProofValue | undefined>(undefined);
  const [unmetSelectedCodes, setUnmetSelectedCodes] = useState<Set<string>>(new Set());
  const [isSubmittingOnSite, setIsSubmittingOnSite] = useState<boolean>(false);
  const [onSiteSuccess, setOnSiteSuccess] = useState<boolean>(false);
  const [onSiteError, setOnSiteError] = useState<string | null>(null);

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Pengelolaan judul halaman & fokus keyboard saat ganti langkah
  useEffect(() => {
    if (step === "pindai") {
      document.title = "Pindai ConsentQR — AKSESPASS";
    } else if (step === "kebutuhan") {
      document.title = "Kebutuhan Pasien — AKSESPASS";
    } else if (step === "saran") {
      document.title = "Saran Tindakan — AKSESPASS";
    } else if (step === "catat") {
      document.title = "Catat Bantuan — AKSESPASS";
    } else if (step === "konfirmasi") {
      document.title = "Kirim Permintaan Konfirmasi — AKSESPASS";
    }

    const t = setTimeout(() => {
      stepHeadingRef.current?.focus();
    }, 50);

    return () => clearTimeout(t);
  }, [step]);

  // 2. Timer ketidakaktifan 10 menit (data pasien disembunyikan otomatis)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (step !== "pindai") {
      inactivityTimerRef.current = setTimeout(() => {
        setIsDataHidden(true);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [step]);

  useEffect(() => {
    if (step !== "pindai") {
      resetInactivityTimer();

      const handleUserActivity = () => {
        if (!isDataHidden) {
          resetInactivityTimer();
        }
      };

      window.addEventListener("mousemove", handleUserActivity);
      window.addEventListener("keydown", handleUserActivity);
      window.addEventListener("touchstart", handleUserActivity);
      window.addEventListener("scroll", handleUserActivity);

      return () => {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
        window.removeEventListener("touchstart", handleUserActivity);
        window.removeEventListener("scroll", handleUserActivity);
      };
    }
  }, [step, isDataHidden, resetInactivityTimer]);

  // 3. Menghentikan kamera saat komponen dilepas atau langkah berpindah
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // Abaikan galat stop
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Mengambil saran tindakan dari server untuk kebutuhan yang dibagikan
  const fetchSuggestions = useCallback(
    async (kebutuhanList: ScanSuccessData["kebutuhan"]) => {
      setIsLoadingSuggestions(true);
      setSuggestionsError(null);
      try {
        const needCodes = kebutuhanList
          .map((k) => k.kode)
          .filter((c): c is string => Boolean(c));

        const res = await fetch("/api/petugas/saran", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ needCodes }),
        });

        if (!res.ok) {
          throw new Error("Gagal mengambil saran tindakan");
        }

        const data = await res.json();
        if (data.ok) {
          const list: ClientAccommodationSuggestion[] = data.suggestions || [];
          setSuggestions(list);
          setUncoveredNeeds(data.uncoveredNeeds || []);

          // SEMUA tercentang di awal untuk T8
          const allIds = new Set<string>();
          for (const s of list) {
            allIds.add(s.id);
          }
          setSelectedRuleIds(allIds);
        }
      } catch {
        setSuggestionsError("Tidak dapat memuat saran akomodasi saat ini.");
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    []
  );

  // 4. Pengiriman token ke /api/scan
  const sendTokenToScanApi = useCallback(
    async (tokenCandidate: string) => {
      if (isSubmitting || !tokenCandidate.trim()) return;

      const extracted = extractToken(tokenCandidate);
      if (!extracted) {
        setBanner({
          variant: "error",
          title: "Kode Tidak Valid",
          message: "Format kode tidak dikenali. Masukkan 26 karakter kode manual.",
        });
        return;
      }

      setIsSubmitting(true);
      setBanner(null);

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: extracted }),
        });

        const data = await res.json().catch(() => null);

        if (res.status === 200 && data && data.ok) {
          await stopCamera();
          const nextScanData: ScanSuccessData = {
            visitId: data.visitId,
            namaPanggilan: data.namaPanggilan,
            preferredName: data.preferredName,
            kebutuhan: data.kebutuhan || [],
            catatanPasien: data.catatanPasien,
            expiresAt: data.expiresAt,
            expiresSoon: Boolean(data.expiresSoon),
          };
          setScanData(nextScanData);
          setStep("kebutuhan");
          setManualCode("");

          // Prefetch saran tindakan di latar belakang agar T6 langsung siap
          fetchSuggestions(nextScanData.kebutuhan);
          return;
        }

        if (res.status === 429) {
          setBanner({
            variant: "error",
            title: "Terlalu Banyak Percobaan",
            message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
          });
          return;
        }

        if (res.status === 403) {
          setBanner({
            variant: "error",
            icon: "ban",
            title: "Akun Tidak Aktif",
            message: "Akun tidak aktif atau keanggotaan fasilitas nonaktif. Hubungi admin fasilitas.",
            action: (
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.replace("/masuk/petugas");
                }}
              >
                Keluar
              </Button>
            ),
          });
          return;
        }

        if (res.status === 401) {
          window.location.replace("/masuk/petugas?alasan=sesi-berakhir");
          return;
        }

        // Respons 422 atau status lain
        setBanner({
          variant: "error",
          title: "QR Tidak Dapat Dipakai",
          message: "Minta pasien membuat ConsentQR baru.",
          action: (
            <Button
              variant="secondary"
              onClick={() => {
                setBanner(null);
                setManualCode("");
                manualInputRef.current?.focus();
              }}
            >
              Pindai lagi
            </Button>
          ),
        });
      } catch {
        setBanner({
          variant: "error",
          title: "Gangguan Koneksi",
          message: "Tidak dapat menghubungi server. Periksa koneksi internet Anda.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, stopCamera, fetchSuggestions]
  );

  // 5. Inisialisasi token dari properti initialToken (misal dari /s)
  const initialTokenTriggeredRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialToken && initialTokenTriggeredRef.current !== initialToken) {
      initialTokenTriggeredRef.current = initialToken;
      void sendTokenToScanApi(initialToken);
    }
  }, [initialToken, sendTokenToScanApi]);

  // 6. Penanganan kamera
  const startCamera = async () => {
    setBanner(null);

    if (typeof window === "undefined") return;

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setBanner({
        variant: "error",
        title: "Kamera Tidak Tersedia",
        message: "Akses kamera membutuhkan konteks aman (HTTPS). Gunakan input manual di bawah.",
      });
      return;
    }

    try {
      const { Html5Qrcode: Html5QrcodeClass } = await import("html5-qrcode");

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5QrcodeClass("qr-reader-container", {
          verbose: false,
        });
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          if (isScanningRef.current) return;
          isScanningRef.current = true;
          sendTokenToScanApi(decodedText).finally(() => {
            setTimeout(() => {
              isScanningRef.current = false;
            }, 1000);
          });
        },
        () => {
          // Abaikan frame tak terbaca
        }
      );

      setIsCameraActive(true);
    } catch (err: unknown) {
      const errorStr = String(err);
      if (
        errorStr.includes("NotAllowedError") ||
        errorStr.includes("Permission denied") ||
        errorStr.includes("PermissionDismissedError")
      ) {
        setBanner({
          variant: "error",
          icon: "ban",
          title: "Kamera Ditolak",
          message: "Izin kamera ditolak. Berikan izin di browser atau gunakan input kode manual di bawah.",
          action: (
            <Button
              variant="secondary"
              onClick={() => {
                manualInputRef.current?.focus();
              }}
            >
              Masukkan kode manual
            </Button>
          ),
        });
      } else {
        setBanner({
          variant: "error",
          title: "Kamera Tidak Tersedia",
          message: "Tidak dapat membuka kamera perangkat. Gunakan input kode manual di bawah.",
        });
      }
      setIsCameraActive(false);
    }
  };

  // 7. Bersihkan data pasien dan keluar
  const handleFinishAndExit = () => {
    setScanData(null);
    setSuggestions([]);
    setSelectedRuleIds(new Set());
    setStaffNote("");
    setStep("pindai");
    window.location.replace(returnHref);
  };

  // 8. Simpan Bantuan (T8 -> POST /api/petugas/kunjungan/catat)
  const handleSaveAssistance = async () => {
    if (!scanData || isSavingAssistance) return;

    setIsSavingAssistance(true);
    setSaveAssistanceError(null);
    setAlreadyRecordedConflict(false);

    try {
      const res = await fetch("/api/petugas/kunjungan/catat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: scanData.visitId,
          ruleIds: Array.from(selectedRuleIds),
          note: staffNote.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 200 && data && data.ok) {
        setStep("konfirmasi");
        return;
      }

      if (res.status === 409) {
        setAlreadyRecordedConflict(true);
        setSaveAssistanceError("Kunjungan ini sudah dicatat sebelumnya.");
        return;
      }

      if (res.status === 400 && data && data.message) {
        setSaveAssistanceError(data.message);
        return;
      }

      setSaveAssistanceError("Tidak ada koneksi. Coba simpan lagi.");
    } catch {
      setSaveAssistanceError("Tidak ada koneksi. Coba simpan lagi.");
    } finally {
      setIsSavingAssistance(false);
    }
  };

  // 9. Kirim Konfirmasi di Tempat (T9 -> POST /api/petugas/kunjungan/konfirmasi)
  const handleSubmitOnSiteConfirmation = async () => {
    if (!scanData || !onSiteScaleValue || isSubmittingOnSite) return;

    setIsSubmittingOnSite(true);
    setOnSiteError(null);

    try {
      const res = await fetch("/api/petugas/kunjungan/konfirmasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: scanData.visitId,
          status: onSiteScaleValue,
          unmetNeedCodes:
            onSiteScaleValue === "terpenuhi" ? [] : Array.from(unmetSelectedCodes),
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 200 && data && data.ok) {
        setOnSiteSuccess(true);
        return;
      }

      if (res.status === 409) {
        setOnSiteError(data?.message || "Pasien sudah mengonfirmasi di aplikasinya.");
        return;
      }

      setOnSiteError("Gagal menyimpan konfirmasi di tempat. Coba lagi.");
    } catch {
      setOnSiteError("Tidak ada koneksi. Coba kirim lagi.");
    } finally {
      setIsSubmittingOnSite(false);
    }
  };

  // ==========================================
  // RENDER LANGKAH 1: PINDAI & KODE MANUAL (T4)
  // ==========================================
  if (step === "pindai") {
    return (
      <PageShell
        title="Pindai ConsentQR"
        titleRef={stepHeadingRef}
        titleTabIndex={-1}
        backHref={returnHref}
        backLabel="Ke Beranda Petugas"
      >
        <div className="flex flex-col gap-6">
          {banner && (
            <StatusBanner
              variant={banner.variant}
              icon={banner.icon}
              title={banner.title}
              message={banner.message}
              action={banner.action}
            />
          )}

          {/* Area Kamera */}
          <section
            aria-labelledby="heading-camera"
            className="flex flex-col gap-4 p-4 rounded-xl border border-cyan-800 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 id="heading-camera" className="text-base font-bold text-main">
                Pindai dengan Kamera
              </h2>
              {isCameraActive && (
                <span
                  role="status"
                  aria-live="polite"
                  className="text-xs text-secondary font-bold"
                >
                  Kamera aktif
                </span>
              )}
            </div>

            <div
              id="qr-reader-container"
              className={`w-full overflow-hidden rounded-lg bg-surface border border-cyan-200 ${
                isCameraActive ? "min-h-64" : "min-h-16 flex items-center justify-center"
              }`}
            >
              {!isCameraActive && (
                <p className="text-sm text-secondary p-4 text-center">
                  Kamera tidak menyala otomatis. Ketuk tombol di bawah untuk memulai.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!isCameraActive ? (
                <Button
                  variant="primary"
                  onClick={startCamera}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Camera aria-hidden="true" className="w-5 h-5 shrink-0" />
                  <span>Mulai kamera</span>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={stopCamera}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <CameraOff aria-hidden="true" className="w-5 h-5 shrink-0" />
                  <span>Hentikan kamera</span>
                </Button>
              )}
            </div>
          </section>

          {/* Input Kode Manual */}
          <section
            aria-labelledby="heading-manual"
            className="flex flex-col gap-4 p-4 rounded-xl border border-cyan-800 bg-white shadow-sm"
          >
            <h2 id="heading-manual" className="text-base font-bold text-main">
              Masukkan Kode Manual
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendTokenToScanApi(manualCode);
              }}
              className="flex flex-col gap-4"
            >
              <TextField
                ref={manualInputRef}
                id="manual-qr-code"
                label="Kode ConsentQR (26 karakter)"
                helperText="Huruf dan angka di bawah QR pasien. Spasi boleh diketik."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !manualCode.trim()}
                className="w-full"
              >
                {isSubmitting ? "Memeriksa QR..." : "Kirim Kode Manual"}
              </Button>
            </form>
          </section>
        </div>
      </PageShell>
    );
  }

  // ==========================================
  // RENDER LANGKAH 2: KEBUTUHAN PASIEN (T5)
  // ==========================================
  if (step === "kebutuhan") {
    if (!scanData) return null;

    if (isDataHidden) {
      return (
        <PageShell
          title="Kebutuhan Pasien"
          titleRef={stepHeadingRef}
          titleTabIndex={-1}
        >
          <div className="flex flex-col gap-6">
            <StatusBanner
              variant="warning"
              title="Data Pasien Disembunyikan"
              message="Data pasien disembunyikan karena tidak ada aktivitas. Pindai ulang bila perlu."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDataHidden(false);
                    setStep("pindai");
                    setBanner(null);
                  }}
                >
                  Pindai ulang
                </Button>
              }
            />
          </div>
        </PageShell>
      );
    }

    const expiryDate = new Date(scanData.expiresAt);
    const expiryTimeStr = formatVisitTimeWIB(expiryDate);

    return (
      <PageShell
        title="Kebutuhan Pasien"
        titleRef={stepHeadingRef}
        titleTabIndex={-1}
      >
        <div className="flex flex-col gap-6">
          {scanData.expiresSoon ? (
            <StatusBanner
              variant="warning"
              title={`Hampir Kedaluwarsa — berakhir pukul ${expiryTimeStr}`}
              message="Sisa masa berlaku kurang dari 15 menit. Berikan layanan sebelum kedaluwarsa."
            />
          ) : (
            <StatusBanner
              variant="success"
              title="QR Valid"
              message="Data kebutuhan berhasil dibuka dari ConsentQR pasien."
            />
          )}

          <PatientNeedsSummary
            preferredName={scanData.preferredName || scanData.namaPanggilan}
            needs={scanData.kebutuhan}
            patientNote={scanData.catatanPasien}
            privacyNoteDescription="Hanya data yang diizinkan pasien. Diagnosis tidak diminta."
          />

          <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
            <Button
              variant="primary"
              onClick={() => {
                if (suggestions.length === 0 && !isLoadingSuggestions) {
                  fetchSuggestions(scanData.kebutuhan);
                }
                setStep("saran");
              }}
              className="w-full flex items-center justify-center gap-2 text-base"
            >
              <Sparkles aria-hidden="true" className="w-5 h-5 shrink-0" />
              <span>Lihat Saran</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleFinishAndExit}
              className="w-full"
            >
              Selesai
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ==========================================
  // RENDER LANGKAH 3: SARAN TINDAKAN (T6)
  // ==========================================
  if (step === "saran") {
    if (!scanData) return null;

    return (
      <PageShell
        title="Saran Tindakan"
        titleRef={stepHeadingRef}
        titleTabIndex={-1}
      >
        <div className="flex flex-col gap-6">
          {/* Label Tetap Batasan Klinis */}
          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-800 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-main">
              <AlertTriangle className="w-5 h-5 shrink-0 text-cyan-900" aria-hidden="true" />
              <span className="text-sm font-bold">
                Saran, bukan instruksi klinis. Keputusan tetap di tangan tenaga kesehatan.
              </span>
            </div>
            <p className="text-sm text-secondary">
              Panggil pasien secara langsung dan visual sesuai saran di atas.
            </p>
          </div>

          {/* Konteks Pasien */}
          <div className="p-3 rounded-lg bg-surface border border-cyan-200 flex items-center justify-between">
            <span className="text-sm font-bold text-main">
              Pasien: {scanData.preferredName || scanData.namaPanggilan || "Pasien"}
            </span>
            <span className="text-xs text-secondary font-bold">
              Rujukan #{scanData.visitId.slice(-4).toUpperCase()}
            </span>
          </div>

          {/* Galat atau Status Pemuatan */}
          {isLoadingSuggestions && (
            <div role="status" aria-live="polite" className="text-sm text-secondary p-4 text-center">
              Memuat saran tindakan akomodasi...
            </div>
          )}

          {suggestionsError && (
            <StatusBanner
              variant="error"
              title="Gagal Memuat Saran"
              message={suggestionsError}
              action={
                <Button
                  variant="secondary"
                  onClick={() => fetchSuggestions(scanData.kebutuhan)}
                >
                  Coba lagi
                </Button>
              }
            />
          )}

          {/* Daftar Saran Tindakan */}
          {!isLoadingSuggestions && suggestions.length > 0 && (
            <section aria-label="Daftar Saran Tindakan" className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
                Panduan Pelayanan
              </h2>
              <div className="flex flex-col gap-3">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-4 rounded-xl bg-white border border-cyan-800 shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      {renderRuleIcon(sug.iconName)}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-base sm:text-lg font-bold text-main break-words">
                          {sug.actionText}
                        </span>
                        <span className="text-xs text-secondary">
                          Versi {sug.version} • {sug.source}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Kebutuhan Tanpa Aturan Terbitan */}
          {!isLoadingSuggestions && uncoveredNeeds.length > 0 && (
            <div className="p-4 rounded-xl bg-white border border-cyan-200 flex flex-col gap-2">
              <span className="text-sm font-bold text-main">
                Belum ada saran untuk:
              </span>
              <ul className="list-disc list-inside text-sm text-secondary flex flex-col gap-1">
                {uncoveredNeeds.map((un) => (
                  <li key={un.code}>
                    <span className="font-bold text-main">{un.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tombol Aksi Layar T6 */}
          <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
            <Button
              variant="primary"
              onClick={() => setStep("catat")}
              className="w-full flex items-center justify-center gap-2 text-base"
            >
              <span>Lanjut: Catat Bantuan</span>
              <ArrowRight aria-hidden="true" className="w-5 h-5 shrink-0" />
            </Button>

            <Button
              variant="secondary"
              onClick={() => setStep("kebutuhan")}
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Kembali ke Kebutuhan</span>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ==========================================
  // RENDER LANGKAH 4: CATAT BANTUAN (T8)
  // ==========================================
  if (step === "catat") {
    if (!scanData) return null;

    return (
      <PageShell
        title="Catat Bantuan"
        titleRef={stepHeadingRef}
        titleTabIndex={-1}
      >
        <div className="flex flex-col gap-6">
          {/* Konteks Pasien */}
          <div className="p-3 rounded-lg bg-surface border border-cyan-200 flex items-center justify-between">
            <span className="text-sm font-bold text-main">
              Pasien: {scanData.preferredName || scanData.namaPanggilan || "Pasien"}
            </span>
            <span className="text-xs text-secondary font-bold">
              Rujukan #{scanData.visitId.slice(-4).toUpperCase()}
            </span>
          </div>

          {/* Banner Galat Penyimpanan */}
          {saveAssistanceError && (
            <StatusBanner
              variant={alreadyRecordedConflict ? "warning" : "error"}
              title={alreadyRecordedConflict ? "Kunjungan Sudah Dicatat" : "Gagal Menyimpan"}
              message={saveAssistanceError}
              action={
                alreadyRecordedConflict ? (
                  <Button variant="secondary" onClick={() => setStep("konfirmasi")}>
                    Lanjut ke konfirmasi
                  </Button>
                ) : undefined
              }
            />
          )}

          {/* Pilihan Bantuan Diberikan (ChoiceGroup dengan seluruh saran tercentang) */}
          <ChoiceGroup
            legend="Bantuan yang Diberikan"
            helperText="Hapus centang bantuan yang tidak diberikan."
          >
            {suggestions.map((sug) => {
              const isChecked = selectedRuleIds.has(sug.id);
              return (
                <ChoiceChip
                  key={sug.id}
                  id={`chip-rule-${sug.id}`}
                  name="bantuan-diberikan"
                  label={sug.actionText}
                  icon={renderRuleIcon(sug.iconName)}
                  checked={isChecked}
                  onChange={() => {
                    setSelectedRuleIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(sug.id)) {
                        next.delete(sug.id);
                      } else {
                        next.add(sug.id);
                      }
                      return next;
                    });
                  }}
                  className="w-full"
                />
              );
            })}
          </ChoiceGroup>

          {/* Catatan Bebas Petugas (Opsional) */}
          <TextField
            id="staff-note"
            label="Catatan Petugas (Opsional)"
            variant="textarea"
            rows={3}
            maxLength={280}
            helperText="Jangan menulis diagnosis atau data sensitif."
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
          />

          {/* Tombol Aksi Simpan T8 */}
          <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
            <Button
              variant="primary"
              onClick={handleSaveAssistance}
              disabled={isSavingAssistance}
              aria-busy={isSavingAssistance ? "true" : undefined}
              className="w-full flex items-center justify-center gap-2 text-base"
            >
              <span>{isSavingAssistance ? "Menyimpan..." : "Simpan"}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => setStep("saran")}
              disabled={isSavingAssistance}
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Kembali ke Saran</span>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ==========================================
  // RENDER LANGKAH 5: KIRIM KONFIRMASI (T9)
  // ==========================================
  if (step === "konfirmasi") {
    if (!scanData) return null;

    const recordedAssistanceList = suggestions.filter((s) =>
      selectedRuleIds.has(s.id)
    );

    return (
      <PageShell
        title="Kirim Permintaan Konfirmasi"
        titleRef={stepHeadingRef}
        titleTabIndex={-1}
      >
        <div className="flex flex-col gap-6">
          {/* Ringkasan Bantuan yang Dicatat */}
          <section
            aria-labelledby="heading-summary-assistance"
            className="p-4 rounded-xl bg-white border border-cyan-800 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
              <h2
                id="heading-summary-assistance"
                className="text-base font-bold text-main"
              >
                Ringkasan Bantuan yang Dicatat
              </h2>
              <span className="text-xs font-bold text-secondary">
                #{scanData.visitId.slice(-4).toUpperCase()}
              </span>
            </div>

            {recordedAssistanceList.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {recordedAssistanceList.map((sug) => (
                  <li
                    key={sug.id}
                    className="flex items-start gap-2.5 text-sm text-main"
                  >
                    <CheckCircle2
                      className="w-4 h-4 shrink-0 text-cyan-800 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="font-bold">{sug.actionText}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary">
                Tidak ada bantuan spesifik yang dicentang.
              </p>
            )}

            {staffNote.trim() && (
              <div className="mt-2 pt-2 border-t border-cyan-100 flex flex-col gap-1">
                <span className="text-xs font-bold text-secondary">
                  Catatan Petugas:
                </span>
                <p className="text-sm text-main italic">&ldquo;{staffNote.trim()}&rdquo;</p>
              </div>
            )}
          </section>

          {/* OPSI 1: Kirim ke Pasien */}
          {!showOnSiteConfirmation && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-surface border border-cyan-800 flex flex-col gap-2">
                <span className="text-base font-bold text-main">
                  Kirim ke Pasien
                </span>
                <p className="text-sm text-secondary">
                  Kunjungan berstatus <strong className="text-main">Menunggu konfirmasi pasien</strong>. Pasien akan melihat permintaan konfirmasi saat membuka aplikasinya.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={handleFinishAndExit}
                  className="w-full text-base"
                >
                  Selesai dan Kembali ke Beranda
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setShowOnSiteConfirmation(true)}
                  className="w-full text-base"
                >
                  Konfirmasi di Tempat
                </Button>
              </div>
            </div>
          )}

          {/* OPSI 2: Konfirmasi di Tempat */}
          {showOnSiteConfirmation && (
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-white border border-cyan-800 shadow-sm">
              <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
                <h2 className="text-base font-bold text-main">
                  Konfirmasi di Tempat
                </h2>
                <span className="text-xs text-secondary font-normal">
                  Jawaban ini ditandai &apos;di tempat&apos;
                </span>
              </div>

              {onSiteSuccess ? (
                <div className="flex flex-col gap-4">
                  <StatusBanner
                    variant="success"
                    title="Konfirmasi Berhasil Disimpan"
                    message="Jawaban konfirmasi di tempat telah tercatat."
                  />
                  <Button
                    variant="primary"
                    onClick={handleFinishAndExit}
                    className="w-full"
                  >
                    Kembali ke Beranda
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-secondary">
                    Tunjukkan skala ini kepada pasien atau pendamping untuk menjawab langsung.
                  </p>

                  {onSiteError && (
                    <StatusBanner
                      variant="error"
                      title="Gagal Menyimpan"
                      message={onSiteError}
                    />
                  )}

                  {/* Skala CareProof Tiga Ikon */}
                  <CareProofScale
                    name="careproof-on-site"
                    legend="Apakah kebutuhan Anda terpenuhi?"
                    value={onSiteScaleValue}
                    onChange={(val) => {
                      setOnSiteScaleValue(val);
                      if (val === "terpenuhi") {
                        setUnmetSelectedCodes(new Set());
                      }
                    }}
                  />

                  {/* Bila Sebagian atau Belum: Pasien memilih kebutuhan yang belum terpenuhi */}
                  {(onSiteScaleValue === "sebagian" || onSiteScaleValue === "belum") && (
                    <ChoiceGroup
                      legend="Kebutuhan yang Belum Terpenuhi"
                      helperText="Pilih kebutuhan pada kunjungan ini yang belum terpenuhi."
                    >
                      {scanData.kebutuhan.map((keb) => {
                        if (!keb.kode) return null;
                        const isUnmet = unmetSelectedCodes.has(keb.kode);
                        return (
                          <ChoiceChip
                            key={keb.kode}
                            id={`unmet-${keb.kode}`}
                            name="unmet-needs"
                            label={keb.label}
                            checked={isUnmet}
                            onChange={() => {
                              setUnmetSelectedCodes((prev) => {
                                const next = new Set(prev);
                                if (next.has(keb.kode!)) {
                                  next.delete(keb.kode!);
                                } else {
                                  next.add(keb.kode!);
                                }
                                return next;
                              });
                            }}
                            className="w-full"
                          />
                        );
                      })}
                    </ChoiceGroup>
                  )}

                  <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
                    <Button
                      variant="primary"
                      onClick={handleSubmitOnSiteConfirmation}
                      disabled={!onSiteScaleValue || isSubmittingOnSite}
                      aria-busy={isSubmittingOnSite ? "true" : undefined}
                      className="w-full text-base"
                    >
                      {isSubmittingOnSite ? "Menyimpan..." : "Kirim Jawaban di Tempat"}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setShowOnSiteConfirmation(false)}
                      disabled={isSubmittingOnSite}
                      className="w-full"
                    >
                      Batal (Gunakan Kirim ke Pasien)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  return null;
}
