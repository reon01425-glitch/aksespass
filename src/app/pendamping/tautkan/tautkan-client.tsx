"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Button,
  PageShell,
  StatusBanner,
  TextField,
} from "@/components";
import { CheckCircle2, UserPlus } from "lucide-react";

export function TautkanClient() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) {
      setError("Masukkan kode tautan 8 karakter.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pendamping/tautkan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "Kode tidak dapat dipakai. Minta kode baru ke pasien."
        );
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Kode tidak dapat dipakai. Minta kode baru ke pasien."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Tautkan ke Pasien"
      backHref="/pendamping"
      backLabel="Kembali ke Beranda Pendamping"
    >
      <div className="flex flex-col gap-6 max-w-full w-full">
        {isSuccess ? (
          <div className="flex flex-col gap-6">
            <StatusBanner
              variant="warning"
              title="Menunggu Persetujuan Pasien"
              message="Permintaan tautan telah berhasil diajukan. Pasien perlu menyetujui permintaan ini di halaman Pendamping akun mereka sebelum Anda dapat mengakses data layanan."
            />

            <div className="p-5 rounded-2xl border border-cyan-200 bg-surface flex flex-col gap-4 text-center">
              <CheckCircle2
                className="w-12 h-12 text-cyan-800 mx-auto"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-main">
                  Permintaan Terkirim
                </h2>
                <p className="text-sm text-secondary">
                  Beri tahu pasien bahwa Anda sudah mengajukan tautan. Setelah
                  disetujui, pasien akan muncul di Beranda Anda.
                </p>
              </div>

              <Link
                href="/pendamping"
                className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 bg-cyan-700 text-white font-bold rounded-lg hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors text-base mt-2"
              >
                Kembali ke Beranda Pendamping
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <p className="text-base text-main">
                Masukkan kode tautan 8 karakter yang diberikan oleh pasien. Kode
                berlaku selama 10 menit sejak dibuat.
              </p>
            </div>

            {error && (
              <StatusBanner
                variant="error"
                title="Gagal Mengajukan Tautan"
                message={error}
              />
            )}

            <TextField
              id="field-link-code"
              label="Kode Tautan Pasien"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              helperText="Format 8 karakter (misal ABCD-EFGH atau ABCDEFGH)."
              maxLength={9}
              autoCapitalize="characters"
              autoComplete="off"
              autoFocus
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={isLoading || !code.trim()}
                className="w-full sm:flex-1 text-lg"
              >
                <UserPlus className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                Ajukan Tautan
              </Button>
              <Link
                href="/pendamping"
                className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 border border-cyan-800 text-cyan-900 font-bold rounded-lg hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors text-base text-center w-full sm:w-auto"
              >
                Batal
              </Link>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}
