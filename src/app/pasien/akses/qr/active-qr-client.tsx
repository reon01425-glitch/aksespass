"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ConfirmDialog, StatusBanner } from "@/components";
import type { ActiveQrItem } from "@/lib/consent";

export interface ActiveQrClientProps {
  initialQrs: ActiveQrItem[];
}

export function ActiveQrClient({ initialQrs }: ActiveQrClientProps) {
  const [qrs, setQrs] = useState<ActiveQrItem[]>(initialQrs);
  const [confirmTarget, setConfirmTarget] = useState<ActiveQrItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const handleRevoke = async () => {
    if (!confirmTarget || isRevoking) return;
    setIsRevoking(true);

    try {
      const res = await fetch(`/api/pasien/qr/${confirmTarget.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Gagal mencabut QR.");
      }

      setQrs((prev) => prev.filter((item) => item.id !== confirmTarget.id));
      setStatusMessage({
        title: "QR dicabut",
        message: "ConsentQR telah dicabut dan tidak dapat digunakan lagi.",
      });
      setConfirmTarget(null);

      // Fokus pindah ke judul daftar sesuai spesifikasi
      setTimeout(() => {
        listHeadingRef.current?.focus();
      }, 50);
    } catch {
      setStatusMessage({
        title: "Gagal mencabut QR",
        message: "Terjadi kesalahan saat mencabut QR. Silakan coba lagi.",
      });
      setConfirmTarget(null);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-full w-full">
      {statusMessage && (
        <StatusBanner
          variant={statusMessage.title.includes("Gagal") ? "error" : "success"}
          title={statusMessage.title}
          message={statusMessage.message}
        />
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2
          ref={listHeadingRef}
          tabIndex={-1}
          className="text-xl font-bold text-main focus:outline-none focus:ring-2 focus:ring-cyan-900 rounded p-1"
        >
          Daftar QR Aktif
        </h2>

        <Link
          href="/pasien/kunjungan"
          className="inline-flex items-center justify-center min-h-12 min-w-12 px-4 py-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 font-bold rounded-lg border border-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-900 text-sm"
        >
          Buat QR Baru
        </Link>
      </div>

      {qrs.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-cyan-200 text-center flex flex-col items-center gap-3">
          <p className="text-base font-bold text-main">Tidak ada QR aktif.</p>
          <p className="text-sm text-secondary max-w-sm">
            Semua ConsentQR yang pernah Anda buat sudah kedaluwarsa atau telah
            dicabut.
          </p>
        </div>
      ) : (
        <ul aria-label="Daftar ConsentQR Aktif" className="flex flex-col gap-4">
          {qrs.map((item) => (
            <li
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-cyan-200 flex flex-col gap-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-bold text-main break-words">
                    {item.facilityName}
                  </span>
                  <span className="text-sm font-bold text-cyan-800 mt-0.5 break-words">
                    {item.expiryText}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmTarget(item)}
                  className="inline-flex items-center justify-center min-h-12 min-w-12 px-5 py-2.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 font-bold rounded-lg border border-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors"
                >
                  Cabut
                </button>
              </div>

              <div className="pt-3 border-t border-cyan-100 flex flex-col gap-1">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Data yang dibagikan:
                </span>
                <p className="text-sm text-main font-normal break-words">
                  {item.sharedFieldLabels.length > 0
                    ? item.sharedFieldLabels.join(", ")
                    : "Nama panggilan saja"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        title="Cabut QR ini?"
        description="QR ini tidak akan bisa dipakai lagi."
        confirmLabel="Ya, Cabut"
        cancelLabel="Batal"
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
