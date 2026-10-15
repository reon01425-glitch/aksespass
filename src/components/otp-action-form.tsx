"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "./button";
import { StatusBanner } from "./status-banner";
import { TextField } from "./text-field";

export interface OtpActionFormProps {
  /** Awalan id unik untuk kolom input. */
  idPrefix: string;
  /** Bila true, pasien mengetik nomor HP dulu (mis. nomor baru); kode dikirim ke nomor itu. */
  askPhone?: boolean;
  phoneLabel?: string;
  /** Tujuan permintaan kode di /api/pasien/akun/kode. */
  purpose: "hapus" | "kontak";
  /** Endpoint yang dipanggil setelah kode diisi. */
  submitUrl: string;
  sendLabel: string;
  submitLabel: string;
  onSuccess: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

/**
 * Alur dua langkah untuk tindakan akun yang memakai kode verifikasi (P22 ubah kontak, P23 hapus akun):
 * kirim kode, lalu isi kode untuk menyelesaikan tindakan.
 */
export function OtpActionForm({
  idPrefix,
  askPhone = false,
  phoneLabel = "Nomor HP",
  purpose,
  submitUrl,
  sendLabel,
  submitLabel,
  onSuccess,
  onCancel,
  cancelLabel = "Batal",
}: OtpActionFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendCode = async () => {
    if (isSending) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch("/api/pasien/akun/kode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, ...(askPhone ? { phone } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Gagal mengirim kode. Coba lagi.");
        return;
      }
      setDevOtp(data.devOtp ?? null);
      setCodeSent(true);
    } catch {
      setError("Koneksi gagal. Periksa koneksi internet Anda.");
    } finally {
      setIsSending(false);
    }
  };

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...(askPhone ? { phone } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Gagal memproses. Coba lagi.");
        return;
      }
      onSuccess();
    } catch {
      setError("Koneksi gagal. Periksa koneksi internet Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <StatusBanner variant="error" title="Belum berhasil" message={error} />}

      {askPhone && (
        <TextField
          id={`${idPrefix}-phone`}
          label={phoneLabel}
          variant="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={codeSent}
          helperText="Contoh: 0812 3456 7890"
        />
      )}

      {!codeSent ? (
        <Button
          onClick={sendCode}
          isLoading={isSending}
          disabled={askPhone && phone.trim().length === 0}
          className="w-full"
        >
          {sendLabel}
        </Button>
      ) : (
        <>
          {devOtp && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-2xl border-2 border-input bg-surface p-4"
            >
              <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-main" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-main">Mode demo: SMS belum aktif.</span>
                <span className="text-base font-bold text-main">Kode Anda: {devOtp}</span>
              </div>
            </div>
          )}
          <TextField
            id={`${idPrefix}-code`}
            label="Kode verifikasi"
            variant="otp"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            helperText="Masukkan 6 digit kode yang dikirim."
          />
          <Button
            onClick={submit}
            isLoading={isSubmitting}
            disabled={code.length !== 6}
            className="w-full"
          >
            {submitLabel}
          </Button>
          <Button variant="secondary" onClick={sendCode} isLoading={isSending} className="w-full">
            Kirim ulang kode
          </Button>
        </>
      )}

      {onCancel && (
        <Button variant="secondary" onClick={onCancel} className="w-full">
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}
