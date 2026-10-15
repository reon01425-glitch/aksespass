"use client";

import React, { useState } from "react";
import { Button } from "./button";
import { StatusBanner } from "./status-banner";
import { TextField } from "./text-field";
import { DemoOtpNote, OtpCodeInput } from "./otp-code-input";

export interface OtpActionFormProps {
  /** Awalan id unik untuk kolom input. */
  idPrefix: string;
  /** Bila true, pasien mengetik nomor HP dulu (mis. nomor baru); kode dikirim ke nomor itu. */
  askPhone?: boolean;
  phoneLabel?: string;
  /** Tujuan permintaan kode di /api/pasien/akun/kode (diabaikan bila codeUrl diisi). */
  purpose?: "hapus" | "kontak";
  /** Endpoint pengirim kode khusus (mis. pemulihan akun oleh pendamping); hanya menerima { phone }. */
  codeUrl?: string;
  /** Isian tambahan yang ikut dikirim ke submitUrl (mis. { linkId }). */
  extraBody?: Record<string, string>;
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
  codeUrl,
  extraBody,
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
      const res = await fetch(codeUrl ?? "/api/pasien/akun/kode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(codeUrl ? {} : { purpose }), ...(askPhone ? { phone } : {}) }),
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
        body: JSON.stringify({ code, ...(extraBody ?? {}), ...(askPhone ? { phone } : {}) }),
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
          {devOtp && <DemoOtpNote code={devOtp} />}
          <OtpCodeInput
            id={`${idPrefix}-code`}
            label="Kode verifikasi"
            value={code}
            onChange={setCode}
            disabled={isSubmitting}
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
