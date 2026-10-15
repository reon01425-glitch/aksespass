"use client";

import React, { useRef, useState } from "react";
import {
  Button,
  DemoOtpNote,
  OtpCodeInput,
  StatusBanner,
  TextField,
} from "@/components";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface MasukClientProps {
  reasonMessage?: string | null;
}

const FIELD_CLASS = "h-14 rounded-2xl! border-2!";
const BUTTON_CLASS = "h-14 w-full rounded-2xl!";
const SWITCH_BUTTON_CLASS =
  "flex min-h-12 w-full items-center justify-center rounded-2xl border border-cyan-800 bg-white px-4 py-2 text-center text-sm font-bold shadow-sm text-cyan-900 focus:outline-none focus:ring-4 focus:ring-cyan-900";
const LINK_BUTTON_CLASS =
  "flex min-h-12 w-full items-center justify-center rounded-2xl border border-cyan-800 bg-white px-3 py-2 text-center text-sm font-bold text-cyan-900 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 disabled:cursor-not-allowed disabled:opacity-60";

interface RecoveryHelpProps {
  role: "patient" | "companion";
  onUseCompanion: () => void;
}

/** [P3] Lupa akses: pemulihan lewat nomor yang sama atau lewat pendamping tertaut. */
function RecoveryHelp({ role, onUseCompanion }: RecoveryHelpProps) {
  return (
    <details className="rounded-2xl border border-cyan-800 bg-white px-4 py-1">
      <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900">
        Lupa akses atau tidak menerima kode?
      </summary>
      <div className="flex flex-col gap-3 border-t border-cyan-800 pb-3 pt-3 text-sm leading-6 text-main">
        <p>
          <span className="font-bold">Lewat nomor yang sama.</span> Masukkan
          nomor yang dulu Anda daftarkan, lalu minta kode baru. Kode lama tidak
          berlaku lagi setelah kode baru dikirim.
        </p>
        <p>
          <span className="font-bold">Lewat pendamping tertaut.</span> Jika
          nomor tersebut sudah tidak dapat dipakai, minta pendamping yang sudah
          Anda tautkan untuk masuk. Pendamping dapat membuka paspor dan QR atas
          nama Anda.
        </p>
        {role === "patient" && (
          <button
            type="button"
            onClick={onUseCompanion}
            className={SWITCH_BUTTON_CLASS}
          >
            Saya pendamping, masuk dengan nomor saya
          </button>
        )}
        <p className="text-xs text-secondary">
          Jika nomor lama hilang dan Anda belum punya pendamping tertaut,
          pemulihan akun belum tersedia di versi ini.
        </p>
      </div>
    </details>
  );
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

  const handleVerify = async (e?: React.SyntheticEvent) => {
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

  const goBackToPhone = () => {
  setStep(1);
  setCode("");
  setErrorMessage(null);
  };

  const TITLE =
    role === "companion" ? "Masuk sebagai Pendamping" : "Masuk ke AKSESPASS";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-dvh overflow-hidden bg-page text-main focus:outline-none"
    >
      {/* Dekorasi lengkung (disembunyikan pada mode kontras tinggi) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-64 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_70%,#A5F3FC_0%,#CFFAFE_55%,var(--bg-page)_72%)] [html[data-contrast='high']_&]:hidden"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-10">
        {step === 2 && (
          <button
            type="button"
            onClick={goBackToPhone}
            disabled={isVerifying}
            aria-label="Kembali ke input nomor telepon"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-800 bg-white text-main shadow-sm focus:outline-none focus:ring-4 focus:ring-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </button>
        )}

        <h1 className={`text-center text-main ${step === 2 ? "mt-6" : "mt-16"}`}>
          {TITLE}
        </h1>

        <div className="mt-6 flex flex-col gap-5">
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
          <p className="rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-main shadow-sm">
            Aplikasi ini tidak meminta diagnosis medis Anda.
          </p>

          {/* LANGKAH 1: Masukkan Nomor Telepon */}
          {step === 1 && (
            <form
              onSubmit={handleSendCode}
              className="flex flex-col gap-5"
              noValidate
            >
              <div className="rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
<TextField
                id="masuk-phone"
                label="Nomor Telepon Seluler"
                variant="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="Gunakan nomor aktif untuk menerima kode verifikasi SMS."
                disabled={isRequesting}
                className={FIELD_CLASS}
              />
              </div>

              {/* Kotak Persetujuan Statistik Anonim (Opsional) */}
              <label
                htmlFor="stats-consent-checkbox"
                className={`flex cursor-pointer select-none flex-col gap-1 rounded-2xl border-2 bg-white p-4 text-sm text-main shadow-sm focus-within:ring-4 focus-within:ring-cyan-900 ${
                  statsConsent ? "border-cyan-800" : "border-cyan-200"
                }`}
              >
                <input
                  id="stats-consent-checkbox"
                  type="checkbox"
                  checked={statsConsent}
                  onChange={(e) => setStatsConsent(e.target.checked)}
                  className="sr-only"
                />
                <span className="block font-bold">
                  Izinkan kunjungan saya dihitung dalam statistik anonim
                  fasilitas
                </span>
                <span className="block text-xs text-secondary">
                  {statsConsent ? "Dipilih. " : "Tidak dipilih. "}
                  Tanpa nama atau nomor Anda. Pilihan ini berlaku saat akun
                  baru dibuat.
                </span>
              </label>

              <Button
                type="submit"
                variant="primary"
                isLoading={isRequesting}
                className={BUTTON_CLASS}
              >
                Kirim Kode
              </Button>

              {/* Alihkan Peran: Pasien vs Pendamping */}
              <div className="flex flex-col gap-3">
                {role === "patient" ? (
                  <button
                    type="button"
                    onClick={() => setRole("companion")}
                    className={SWITCH_BUTTON_CLASS}
                  >
                    Saya pendamping pasien
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={SWITCH_BUTTON_CLASS}
                  >
                    Saya pasien
                  </button>
                )}

                <Link href="/masuk/petugas" className={SWITCH_BUTTON_CLASS}>
                  Masuk sebagai Petugas atau Admin Fasilitas
                </Link>
              </div>

              <RecoveryHelp
                role={role}
                onUseCompanion={() => setRole("companion")}
              />
            </form>
          )}

          {/* LANGKAH 2: Masukkan Kode OTP */}
          {step === 2 && (
            <form
              onSubmit={handleVerify}
              className="flex flex-col gap-5"
              noValidate
            >
              <div className="rounded-2xl border border-cyan-800 bg-white p-4 text-center shadow-sm">
                <p className="mx-auto text-xs text-secondary">
                  Nomor tujuan verifikasi:
                </p>
                <p className="mx-auto text-base font-bold text-main">{phone}</p>
              </div>

              {/* Kotak Mode Demo untuk OTP Tiruan */}
              {devOtp && <DemoOtpNote code={devOtp} />}

              <OtpCodeInput
                id="masuk-otp"
                inputRef={codeInputRef}
                value={code}
                onChange={setCode}
                disabled={isVerifying}
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isVerifying}
                disabled={code.length !== 6}
                className={BUTTON_CLASS}
              >
                Masuk
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={goBackToPhone}
                  disabled={isVerifying}
                  className={LINK_BUTTON_CLASS}
                >
                  Ubah Nomor
                </button>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isRequesting || isVerifying}
                  className={LINK_BUTTON_CLASS}
                >
                  Kirim Ulang Kode
                </button>
              </div>

              <RecoveryHelp
                role={role}
                onUseCompanion={() => {
                  setRole("companion");
                  goBackToPhone();
                }}
              />
            </form>
          )}
        </div>
      </div>
    </main>
  );
}