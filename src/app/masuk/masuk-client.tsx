"use client";

import React, { useRef, useState } from "react";
import {
  Button,
  PageShell,
  StatusBanner,
  TextField,
  TextLink,
} from "@/components";
import { Info, ShieldCheck } from "lucide-react";

export interface MasukClientProps {
  reasonMessage?: string | null;
}

export function MasukClient({ reasonMessage }: MasukClientProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"patient" | "companion">("patient");
  const [statsConsent, setStatsConsent] = useState(false);

  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setErrorMessage("Nomor telepon wajib diisi.");
      return;
    }

    setIsRequesting(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Gagal mengirim kode verifikasi.");
        return;
      }

      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }

      setStep(2);
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 50);
    } catch {
      setErrorMessage("Koneksi gagal. Periksa koneksi internet Anda.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      setErrorMessage("Kode verifikasi harus 6 digit angka.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code: trimmedCode,
          intendedRole: role,
          statsConsent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const rawErr = String(data.error || "");
        if (
          rawErr.toLowerCase().includes("salah") ||
          rawErr.toLowerCase().includes("kedaluwarsa") ||
          rawErr.toLowerCase().includes("tidak valid")
        ) {
          setErrorMessage("Kode salah atau kedaluwarsa. Minta kode baru.");
        } else if (rawErr.toLowerCase().includes("admin fasilitas")) {
          setErrorMessage("Tidak dapat masuk. Hubungi admin fasilitas.");
        } else {
          setErrorMessage(rawErr || "Gagal memverifikasi kode.");
        }
        return;
      }

      // Berhasil -> arahkan ke halaman tujuan peran tanpa parameter open redirect
      window.location.href = data.destination || (role === "companion" ? "/pendamping" : "/pasien");
    } catch {
      setErrorMessage("Koneksi gagal. Periksa koneksi internet Anda.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <PageShell
      title={role === "companion" ? "Masuk sebagai Pendamping" : "Masuk ke AKSESPASS"}
    >
      <div className="flex flex-col gap-6">
        {/* Banner Peringatan Sesi Berakhir dari Daftar Alasan Tetap */}
        {reasonMessage && (
          <StatusBanner
            variant="warning"
            title="Peringatan Sesi"
            message={reasonMessage}
          />
        )}

        {/* Banner Galat Operasi */}
        {errorMessage && (
          <StatusBanner
            variant="error"
            title="Tidak Dapat Masuk"
            message={errorMessage}
          />
        )}

        {/* Pernyataan Privasi */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-cyan-400">
          <ShieldCheck aria-hidden="true" className="w-5 h-5 text-cyan-600 shrink-0" />
          <p className="text-sm text-main">
            Aplikasi ini tidak meminta diagnosis medis Anda.
          </p>
        </div>

        {/* LANGKAH 1: Masukkan Nomor Telepon */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-5" noValidate>
            <TextField
              id="masuk-phone"
              label="Nomor Telepon Seluler"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Gunakan nomor aktif untuk menerima kode verifikasi SMS."
              disabled={isRequesting}
            />

            {/* Kotak Persetujuan Statistik Anonim (Opsional) */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-cyan-200 bg-surface">
              <input
                id="stats-consent-checkbox"
                type="checkbox"
                checked={statsConsent}
                onChange={(e) => setStatsConsent(e.target.checked)}
                className="mt-1 h-6 w-6 rounded border-2 border-cyan-800 text-cyan-700 focus:ring-4 focus:ring-cyan-900 shrink-0 cursor-pointer"
              />
              <label
                htmlFor="stats-consent-checkbox"
                className="text-sm text-main cursor-pointer select-none"
              >
                <span className="font-bold block">
                  Izinkan kunjungan saya dihitung dalam statistik anonim fasilitas
                </span>
                <span className="text-xs text-secondary block mt-0.5">
                  (Tanpa nama atau nomor Anda. Pilihan ini berlaku saat akun baru dibuat).
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isRequesting}
              className="w-full"
            >
              Kirim Kode
            </Button>

            {/* Alihkan Peran: Pasien vs Pendamping */}
            <div className="flex flex-col items-center gap-3 pt-4 border-t border-cyan-100">
              {role === "patient" ? (
                <button
                  type="button"
                  onClick={() => setRole("companion")}
                  className="min-h-[48px] px-3 py-2 text-sm font-bold text-link underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 rounded-lg"
                >
                  Saya pendamping pasien (Masuk dengan bantuan pendamping)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRole("patient")}
                  className="min-h-[48px] px-3 py-2 text-sm font-bold text-link underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 rounded-lg"
                >
                  Saya pasien (Kembali ke alur pasien)
                </button>
              )}

              <TextLink href="/masuk/petugas" standalone>
                Masuk sebagai Petugas atau Admin Fasilitas
              </TextLink>
            </div>
          </form>
        )}

        {/* LANGKAH 2: Masukkan Kode OTP */}
        {step === 2 && (
          <form onSubmit={handleVerify} className="flex flex-col gap-5" noValidate>
            <div className="p-3 rounded-lg bg-surface flex flex-col gap-1">
              <span className="text-xs text-secondary">Nomor tujuan verifikasi:</span>
              <span className="text-sm font-bold text-main">{phone}</span>
            </div>

            {/* Kotak Mode Demo untuk OTP Tiruan */}
            {devOtp && (
              <div
                role="note"
                className="p-4 rounded-xl border-2 border-cyan-800 bg-surface flex items-start gap-3"
              >
                <Info aria-hidden="true" className="w-5 h-5 text-cyan-800 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-main">
                    Mode demo: SMS belum aktif.
                  </span>
                  <span className="text-base font-bold text-main">
                    Kode Anda: {devOtp}
                  </span>
                </div>
              </div>
            )}

            <TextField
              ref={codeInputRef}
              id="masuk-otp"
              label="Kode Verifikasi (6 Digit)"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              helperText="Kode berlaku 5 menit."
              disabled={isVerifying}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isVerifying}
              disabled={code.length !== 6}
              className="w-full"
            >
              Masuk
            </Button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMessage(null);
                }}
                disabled={isVerifying}
                className="min-h-[48px] px-2 py-2 text-sm font-bold text-link underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 rounded-lg"
              >
                Ubah Nomor
              </button>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={isRequesting || isVerifying}
                className="min-h-[48px] px-2 py-2 text-sm font-bold text-link underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 rounded-lg"
              >
                Kirim Ulang Kode
              </button>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}
