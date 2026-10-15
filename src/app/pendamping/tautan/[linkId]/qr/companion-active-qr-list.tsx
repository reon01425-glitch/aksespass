"use client";

import React, { useState } from "react";
import { Clock3, QrCode } from "lucide-react";
import { Button, ConfirmDialog, StatusBanner } from "@/components";
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
        <p className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm text-secondary">
          Belum ada QR aktif atas nama {patientName}.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {qrs.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-900">
                <QrCode aria-hidden="true" className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-secondary">
                  Fasilitas layanan
                </div>
                <div className="break-words text-base font-bold text-main">
                  {item.facilityName}
                </div>
              </div>
            </div>
            <div className="text-sm text-secondary">
              <span className="font-bold text-main">Data yang dibagikan: </span>
              {item.sharedFieldLabels.length > 0
                ? item.sharedFieldLabels.join(", ")
                : "Nama panggilan saja"}
            </div>
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Clock3 aria-hidden="true" className="h-5 w-5 shrink-0" />
              {item.remainingTimeText}
            </div>
            <TampilkanQr
              qrId={currentIds[item.id] ?? item.id}
              facilityName={item.facilityName}
              onReplaced={(newId) =>
                setCurrentIds((prev) => ({ ...prev, [item.id]: newId }))
              }
            />
            <Button
              variant="secondary"
              onClick={() => setTarget(item)}
              className="w-full"
            >
              Cabut QR
            </Button>
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
