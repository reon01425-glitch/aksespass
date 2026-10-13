"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Button,
  PageShell,
  PatientNeedsSummary,
  StatusBanner,
  TextField,
  type StatusBannerVariant,
} from "@/components";
import { extractToken } from "@/lib/consent/extract-token";
import { formatVisitTimeWIB } from "@/lib/visits/format";
import type { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Sparkles, ArrowLeft } from "lucide-react";

export type PindaiStep = "pindai" | "kebutuhan" | "saran";

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
    if (step === "kebutuhan" || step === "saran") {
      inactivityTimerRef.current = setTimeout(() => {
        setIsDataHidden(true);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [step]);

  useEffect(() => {
    if (step === "kebutuhan" || step === "saran") {
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

  // 4. Pengiriman token ke /api/scan
  const sendTokenToScanApi = useCallback(
    async (tokenCandidate: string) => {
      if (isSubmitting || !tokenCandidate.trim()) return;

      const extracted = extractToken(tokenCandidate);
      setIsSubmitting(true);
      setBanner(null);

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: extracted }),
        });

        if (res.status === 401) {
          window.location.replace("/masuk/petugas?alasan=sesi-berakhir");
          return;
        }

        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          setBanner({
            variant: "error",
            title: "Akun Tidak Aktif",
            message:
              body.error || "Akun tidak aktif. Hubungi admin fasilitas.",
            action: (
              <Button
                variant="secondary"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" }).catch(
                    () => {}
                  );
                  window.location.replace("/masuk/petugas");
                }}
              >
                Keluar
              </Button>
            ),
          });
          return;
        }

        if (res.status === 429) {
          setBanner({
            variant: "warning",
            title: "Terlalu Banyak Percobaan",
            message:
              "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
          });
          return;
        }

        if (res.status === 422) {
          const body = await res.json().catch(() => ({}));
          setBanner({
            variant: "error",
            title: body.title || "QR Tidak Dapat Dipakai",
            message:
              body.message || "Minta pasien membuat ConsentQR baru.",
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
          return;
        }

        if (!res.ok) {
          setBanner({
            variant: "error",
            title: "Gagal Memproses",
            message: "Terjadi kesalahan saat memproses ConsentQR.",
          });
          return;
        }

        const data: ScanSuccessData = await res.json();
        setScanData(data);
        setIsDataHidden(false);
        setStep("kebutuhan");
      } catch {
        setBanner({
          variant: "error",
          title: "Gagal Koneksi",
          message:
            "Tidak ada koneksi. Pemindaian ConsentQR membutuhkan internet.",
        });
      } finally {
        setIsSubmitting(false);
        isScanningRef.current = false;
      }
    },
    [isSubmitting]
  );

  // 5. Inisialisasi token awal jika ada (misal dari /s#<token>)
  useEffect(() => {
    if (initialToken) {
      const timer = setTimeout(() => {
        sendTokenToScanApi(initialToken);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialToken, sendTokenToScanApi]);

  // 6. Penanganan kamera (Html5Qrcode API tingkat rendah)
  const startCamera = async () => {
    setBanner(null);

    // Periksa lingkungan konteks aman
    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setBanner({
        variant: "error",
        title: "Kamera Tidak Tersedia",
        message:
          "Kamera memerlukan koneksi aman (HTTPS). Izinkan kamera di pengaturan peramban, atau masukkan kode manual.",
        action: (
          <Button
            variant="secondary"
            onClick={() => manualInputRef.current?.focus()}
          >
            Masukkan kode manual
          </Button>
        ),
      });
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setBanner({
        variant: "error",
        title: "Kamera Tidak Tersedia",
        message:
          "Perangkat tidak mendukung akses kamera. Izinkan kamera di pengaturan peramban, atau masukkan kode manual.",
        action: (
          <Button
            variant="secondary"
            onClick={() => manualInputRef.current?.focus()}
          >
            Masukkan kode manual
          </Button>
        ),
      });
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("html5-qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const qrSuccessCallback = async (decodedText: string) => {
        if (isScanningRef.current) return;
        isScanningRef.current = true;

        await stopCamera();
        await sendTokenToScanApi(decodedText);
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          qrSuccessCallback,
          () => {}
        );
      } catch {
        // Fallback bila facingMode environment tidak didukung kamera webcam laptop
        await html5QrCode.start(
          {},
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          qrSuccessCallback,
          () => {}
        );
      }

      setIsCameraActive(true);
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string } | undefined;
      const msg = (errObj?.message || "").toLowerCase();
      const isDenied =
        errObj?.name === "NotAllowedError" ||
        errObj?.name === "PermissionDeniedError" ||
        msg.includes("permission") ||
        msg.includes("denied") ||
        msg.includes("ditolak");

      if (isDenied) {
        setBanner({
          variant: "error",
          icon: "ban",
          title: "Kamera Ditolak",
          message:
            "Izinkan kamera di pengaturan peramban, atau masukkan kode manual.",
          action: (
            <Button
              variant="secondary"
              onClick={() => manualInputRef.current?.focus()}
            >
              Masukkan kode manual
            </Button>
          ),
        });
      } else {
        setBanner({
          variant: "error",
          title: "Kamera Tidak Tersedia",
          message:
            "Izinkan kamera di pengaturan peramban, atau masukkan kode manual.",
          action: (
            <Button
              variant="secondary"
              onClick={() => manualInputRef.current?.focus()}
            >
              Masukkan kode manual
            </Button>
          ),
        });
      }
      setIsCameraActive(false);
    }
  };

  // 7. Selesai & bersihkan memori (Privasi Perangkat Bersama)
  const handleFinishAndExit = () => {
    // Bersihkan seluruh data pasien dari memori
    setScanData(null);
    setManualCode("");
    // Navigasi menggunakan location.replace agar data tidak tersimpan di riwayat tombol Back
    window.location.replace(returnHref);
  };

  // ==========================================
  // RENDER LANGKAH 1: PINDAI (T4)
  // ==========================================
  if (step === "pindai") {
    return (
      <PageShell
        title="Pindai ConsentQR"
        backHref={returnHref}
        backLabel="Kembali ke Beranda Petugas"
        titleRef={stepHeadingRef}
        titleTabIndex={-1}
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

          {/* Area Kamera Pratinjau */}
          <section
            aria-labelledby="heading-kamera"
            className="flex flex-col gap-3 p-4 rounded-xl border border-cyan-800 bg-white shadow-sm"
          >
            <h2 id="heading-kamera" className="text-base font-bold text-main">
              Kamera Pemindai
            </h2>

            {/* Kotak Video Pemindai */}
            <div
              id="html5-qr-reader"
              role="region"
              aria-label="Arahkan kamera ke QR pasien"
              className={`w-full min-h-[260px] rounded-lg border-2 border-dashed border-cyan-400 bg-surface flex flex-col items-center justify-center p-3 text-center overflow-hidden relative ${
                !isCameraActive ? "flex" : ""
              }`}
            >
              {!isCameraActive && (
                <div className="flex flex-col items-center gap-2 text-main">
                  <Camera
                    aria-hidden="true"
                    className="w-12 h-12 text-cyan-800"
                  />
                  <span className="text-sm font-bold">
                    Arahkan kamera ke QR pasien
                  </span>
                  <span className="text-xs text-secondary max-w-xs">
                    Kamera tidak menyala otomatis demi privasi dan daya. Ketuk
                    tombol di bawah untuk mengaktifkan.
                  </span>
                </div>
              )}
            </div>

            {isCameraActive && (
              <StatusBanner
                variant="success"
                title="Kamera aktif"
                message="Arahkan kamera ke QR pasien."
              />
            )}

            {/* Tombol Kontrol Kamera */}
            <div>
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

          {/* Input Kode Manual (Selalu Tersedia) */}
          <section
            aria-labelledby="heading-manual"
            className="flex flex-col gap-3 p-4 rounded-xl border border-cyan-800 bg-white shadow-sm"
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
    if (!scanData) {
      return null;
    }

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
          {/* Status Validitas QR */}
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

          {/* Ringkasan Kebutuhan Pasien */}
          <PatientNeedsSummary
            preferredName={scanData.preferredName || scanData.namaPanggilan}
            needs={scanData.kebutuhan}
            patientNote={scanData.catatanPasien}
            privacyNoteDescription="Hanya data yang diizinkan pasien. Diagnosis tidak diminta."
          />

          {/* Tombol Aksi Layar T5 */}
          <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
            <Button
              variant="primary"
              onClick={() => setStep("saran")}
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
  // RENDER LANGKAH 3: SARAN TINDAKAN (Prompt 14 Placeholder)
  // ==========================================
  return (
    <PageShell
      title="Saran Tindakan"
      titleRef={stepHeadingRef}
      titleTabIndex={-1}
    >
      <div className="flex flex-col gap-6">
        <StatusBanner
          variant="warning"
          title="Langkah Berikutnya"
          message="Smart Accommodation Engine (rekomendasi otomatis & catat bantuan) akan aktif di langkah selanjutnya (Prompt 14)."
        />

        <div className="p-4 rounded-xl bg-white border border-cyan-800 shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-main">
            Pasien: {scanData?.preferredName || scanData?.namaPanggilan || "Pasien"}
          </span>
          <p className="text-sm text-secondary">
            Kunjungan ID rujukan #{scanData?.visitId.slice(-4).toUpperCase()} telah tercatat di antrean hari ini.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-cyan-100">
          <Button
            variant="secondary"
            onClick={() => setStep("kebutuhan")}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
            <span>Kembali ke Kebutuhan</span>
          </Button>

          <Button
            variant="primary"
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
