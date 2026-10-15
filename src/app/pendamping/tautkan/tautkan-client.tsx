"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Button,
  PageShell,
  StatusBanner,
  TextField,
} from "@/components";

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
      companionNav
    >
      <div className="flex flex-col gap-5 max-w-full w-full">
        {isSuccess ? (
          <div className="flex flex-col gap-5">
            <StatusBanner
              variant="warning"
              title="Menunggu Persetujuan Pasien"
              message="Permintaan tautan telah berhasil diajukan. Pasien perlu menyetujui permintaan ini di halaman Pendamping akun mereka sebelum Anda dapat mengakses data layanan."
            />

            <div className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 text-center shadow-sm">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-main">
                  Permintaan Terkirim
                </h2>
                <p className="max-w-none text-sm text-secondary">
                  Beri tahu pasien bahwa Anda sudah mengajukan tautan. Setelah
                  disetujui, pasien akan muncul di Beranda Anda.
                </p>
              </div>

              <Link
                href="/pendamping"
                className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 bg-cyan-700 text-white font-bold rounded-2xl hover:bg-cyan-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 transition-colors text-base"
              >
                Kembali ke Beranda Pendamping
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <p className="max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary">
              Masukkan kode tautan 8 karakter yang diberikan oleh pasien. Kode
              berlaku selama 10 menit sejak dibuat.
            </p>

            {error && (
              <StatusBanner
                variant="error"
                title="Gagal Mengajukan Tautan"
                message={error}
              />
            )}

            <div className="rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
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
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={isLoading || !code.trim()}
                className="w-full text-base"
              >
                Ajukan Tautan
              </Button>
              <Link
                href="/pendamping"
                className="inline-flex w-full items-center justify-center min-h-12 rounded-2xl border border-cyan-800 bg-white px-6 py-2.5 text-center text-base font-bold text-cyan-900 transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
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
