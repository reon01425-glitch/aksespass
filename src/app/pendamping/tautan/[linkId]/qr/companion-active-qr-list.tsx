"use client";

import React, { useState } from "react";
import { ConfirmDialog, StatusBanner } from "@/components";
import type { ActiveQrItem } from "@/lib/consent";
import { TampilkanQr } from "@/app/pasien/akses/qr/tampilkan-qr";

/**
 * D6: daftar ConsentQR aktif atas nama pasien. Pendamping aktif boleh mencabut QR kapan saja.
 */
export function CompanionActiveQrList({
  initialQrs,
  patientName,
}: {
  initialQrs: ActiveQrItem[];
  patientName: string;
}) {
  const [qrs, setQrs] = useState(initialQrs);
  const [target, setTarget] = useState<ActiveQrItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [currentIds, setCurrentIds] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    variant: "success" | "error";
    title: string;
    text: string;
  } | null>(null);

  const revoke = async () => {
    if (!target || isRevoking) return;
    setIsRevoking(true);
    try {
      const res = await fetch(
        `/api/pasien/qr/${encodeURIComponent(currentIds[target.id] ?? target.id)}/revoke`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("gagal");
      setQrs((prev) => prev.filter((item) => item.id !== target.id));
      setMessage({
        variant: "success",
        title: "QR dicabut",
        text: "ConsentQR sudah dicabut dan tidak bisa dipakai lagi.",
      });
    } catch {
      setMessage({
        variant: "error",
        title: "Gagal mencabut QR",
        text: "Periksa koneksi Anda lalu coba lagi.",
      });
    } finally {
      setTarget(null);
      setIsRevoking(false);
    }
  };

  return (
    <section aria-labelledby="d6-qr-aktif" className="flex flex-col gap-3">
      <h2 id="d6-qr-aktif" className="text-lg font-bold text-main">
        QR aktif atas nama {patientName}
      </h2>
      {message && (
        <StatusBanner
          variant={message.variant}
          title={message.title}
          message={message.text}
        />
      )}
      {qrs.length === 0 && (
        <p className="max-w-none rounded-2xl border border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary shadow-sm">
          Belum ada QR aktif atas nama {patientName}.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {qrs.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
          >
            <h3 className="break-words text-lg font-bold leading-snug text-main">
              {item.facilityName}
            </h3>

            <div className="flex flex-col gap-1 border-t border-cyan-800 pt-3">
              <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                Data yang dibagikan
              </span>
              <p className="break-words text-sm text-main">
                {item.sharedFieldLabels.length > 0
                  ? item.sharedFieldLabels.join(", ")
                  : "Nama panggilan saja"}
              </p>
            </div>

            <div className="flex flex-col gap-1 border-t border-cyan-800 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                  Kedaluwarsa otomatis
                </span>
                <span className="text-sm font-bold text-main">
                  {item.remainingTimeText}
                </span>
              </div>
              <p className="text-sm text-secondary">{item.expiryText}</p>
            </div>

            <TampilkanQr
              qrId={currentIds[item.id] ?? item.id}
              facilityName={item.facilityName}
              onReplaced={(newId) =>
                setCurrentIds((prev) => ({ ...prev, [item.id]: newId }))
              }
            />
            <button
              type="button"
              onClick={() => setTarget(item)}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 py-3 text-base font-bold text-cyan-900 transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              Cabut Akses QR Sekarang
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        isOpen={Boolean(target)}
        title="Cabut QR ini?"
        description="QR ini tidak akan bisa dipakai lagi."
        confirmLabel="Ya, Cabut"
        cancelLabel="Batal"
        onClose={() => setTarget(null)}
        onConfirm={revoke}
      />
    </section>
  );
}
