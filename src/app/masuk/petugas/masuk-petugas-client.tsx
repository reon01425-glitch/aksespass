"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, DemoOtpNote, OtpCodeInput, StatusBanner, TextField } from "@/components";

export interface MasukPetugasClientProps {
  reasonMessage?: string | null;
}

/* Tanda "!" di akhir kelas (Tailwind v4) memaksa kelas ini menang atas
   rounded-lg / border bawaan Button dan TextField. */
const FIELD_CLASS = "h-14 rounded-2xl! border-2!";
const BUTTON_CLASS = "h-14 w-full rounded-2xl!";
const LINK_BUTTON_CLASS =
  "flex min-h-12 w-full items-center justify-center rounded-2xl border border-cyan-800 bg-white px-3 py-2 text-center text-sm font-bold text-cyan-900 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 disabled:cursor-not-allowed disabled:opacity-60";

const TITLE = "Masuk Petugas & Faskes";

export function MasukPetugasClient({ reasonMessage }: MasukPetugasClientProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setErrorMessage("Nomor telepon terdaftar wajib diisi.");
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
      // PERHATIKAN: Verify dipanggil TANPA intendedRole!
      // Nomor yang belum diundang atau tidak terdaftar tidak akan membuat akun baru.
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code: trimmedCode,
          portal: "institusi",
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
        } else if (
          rawErr.toLowerCase().includes("admin fasilitas") ||
          rawErr.toLowerCase().includes("tidak dapat masuk") ||
          rawErr.toLowerCase().includes("pendaftaran")
        ) {
          setErrorMessage("Tidak dapat masuk. Hubungi admin fasilitas.");
        } else {
          setErrorMessage(rawErr || "Tidak dapat masuk. Hubungi admin fasilitas.");
        }
        return;
      }

      // Berhasil -> arahkan ke dashboard peran petugas / admin / kurator
      window.location.href = data.destination || "/petugas";
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
          {/* Banner Peringatan Sesi Berakhir */}
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

          {/* Catatan Peran & Privasi */}
          <p className="rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-main shadow-sm">
            Khusus akun petugas kesehatan, admin faskes, dan kurator yang telah
            diundang.
          </p>

          {/* LANGKAH 1: Masukkan Nomor Telepon Staf */}
          {step === 1 && (
            <form
              onSubmit={handleSendCode}
              className="flex flex-col gap-5"
              noValidate
            >
              <div className="rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
<TextField
                id="petugas-phone"
                label="Nomor Telepon Petugas"
                variant="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="Masukkan nomor yang didaftarkan oleh admin fasilitas."
                disabled={isRequesting}
                className={FIELD_CLASS}
              />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isRequesting}
                className={BUTTON_CLASS}
              >
                Kirim Kode
              </Button>

              <Link href="/masuk" className={LINK_BUTTON_CLASS}>
                Kembali ke Masuk Pasien atau Pendamping
              </Link>
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
                id="petugas-otp"
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
                Masuk sebagai Petugas
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
            </form>
          )}
        </div>
      </div>
    </main>
  );
}