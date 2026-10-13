"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PetugasPindaiClient } from "@/components";
import { extractToken } from "@/lib/consent/extract-token";
import { LogIn, QrCode } from "lucide-react";

interface SPageClientProps {
  isStaff: boolean;
}

export function SPageClient({ isStaff }: SPageClientProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isProcessed, setIsProcessed] = useState<boolean>(false);

  useEffect(() => {
    const processHash = () => {
      const rawHash = window.location.hash;
      if (rawHash) {
        // SEGERA history.replaceState ke "/s", sehingga token hilang dari address bar dan riwayat
        window.history.replaceState(null, "", "/s");
        if (isStaff) {
          const extracted = extractToken(rawHash);
          if (extracted) {
            setToken(extracted);
          }
        }
      }
      setIsProcessed(true);
    };

    processHash();

    window.addEventListener("hashchange", processHash);
    return () => window.removeEventListener("hashchange", processHash);
  }, [isStaff]);

  if (!isProcessed) {
    return null;
  }

  // Jika bukan sesi petugas: tampilkan penjelasan publik tanpa memproses token
  if (!isStaff) {
    return (
      <PageShell title="Pemeriksaan ConsentQR">
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-xl border border-cyan-800 bg-white shadow-sm flex flex-col gap-4 text-center items-center">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-cyan-800">
              <QrCode className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-main">
              Halaman Khusus Petugas Fasilitas
            </h2>
            <p className="text-base text-main leading-relaxed max-w-md">
              Halaman ini untuk petugas fasilitas. Bila Anda pasien, tunjukkan QR ini kepada petugas.
            </p>
            <div className="w-full pt-4 border-t border-cyan-100 flex flex-col gap-3">
              <Link
                href="/masuk/petugas"
                className="flex items-center justify-center gap-2 min-h-12 w-full px-6 py-3 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center"
              >
                <LogIn className="w-5 h-5" aria-hidden="true" />
                <span>Masuk sebagai Petugas</span>
              </Link>
              <Link
                href="/"
                className="flex items-center justify-center min-h-12 w-full px-6 py-3 bg-surface border border-cyan-700 text-cyan-900 font-bold rounded-lg hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-900 text-center"
              >
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Jika sesi petugas: jalankan alur pemindaian dengan token yang diekstrak
  return (
    <PetugasPindaiClient
      key={token || "default"}
      initialToken={token || undefined}
      returnHref="/petugas"
    />
  );
}
