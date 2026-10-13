"use client";

import React, { useMemo, useState } from "react";
import { ConfirmDialog, StatusBanner } from "@/components";
import type { AccessHistoryEntry } from "@/lib/audit";

export interface RiwayatAksesClientProps {
  initialHistory: AccessHistoryEntry[];
  initialActiveCount: number;
  availableFacilities: string[];
}

export function RiwayatAksesClient({
  initialHistory,
  initialActiveCount,
  availableFacilities,
}: RiwayatAksesClientProps) {
  const [history, setHistory] = useState<AccessHistoryEntry[]>(initialHistory);
  const [hasActiveQrs, setHasActiveQrs] = useState<boolean>(initialActiveCount > 0);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [isRevokingAll, setIsRevokingAll] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  // Filter state (Prioritas 4)
  const [nowTimestamp] = useState<number>(() => Date.now());
  const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d">("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Filter periode
      if (periodFilter === "7d") {
        const itemTime = new Date(item.occurredAt).getTime();
        if (nowTimestamp - itemTime > 7 * 24 * 60 * 60 * 1000) {
          return false;
        }
      } else if (periodFilter === "30d") {
        const itemTime = new Date(item.occurredAt).getTime();
        if (nowTimestamp - itemTime > 30 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      // Filter fasilitas
      if (facilityFilter !== "all") {
        if (!item.facilityName || item.facilityName !== facilityFilter) {
          return false;
        }
      }

      return true;
    });
  }, [history, periodFilter, facilityFilter, nowTimestamp]);

  const handleRevokeAll = async () => {
    if (isRevokingAll) return;
    setIsRevokingAll(true);

    try {
      const res = await fetch("/api/pasien/qr/revoke-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Gagal mencabut semua QR.");
      }

      setHasActiveQrs(false);
      setStatusBanner({
        variant: "success",
        title: "Semua QR dicabut",
        message: "Semua ConsentQR aktif berhasil dicabut dan tidak dapat digunakan lagi.",
      });
      setIsConfirmDialogOpen(false);

      // Muat ulang riwayat akses agar kejadian qr_revoked terbaru muncul
      try {
        const historyRes = await fetch("/api/pasien/akses/riwayat");
        if (historyRes.ok) {
          const json = await historyRes.json();
          if (json.ok && Array.isArray(json.data)) {
            setHistory(json.data);
          }
        }
      } catch {
        // Abaikan galat fetch riwayat
      }
    } catch {
      setStatusBanner({
        variant: "error",
        title: "Gagal mencabut QR",
        message: "Terjadi kesalahan saat memproses pencabutan semua QR. Silakan coba lagi.",
      });
      setIsConfirmDialogOpen(false);
    } finally {
      setIsRevokingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-full w-full">
      {statusBanner && (
        <StatusBanner
          variant={statusBanner.variant}
          title={statusBanner.title}
          message={statusBanner.message}
        />
      )}

      {/* Header & Aksi Cabut Semua QR */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-cyan-100">
        <div className="flex flex-col min-w-0">
          <h2 className="text-xl font-bold text-main break-words">
            Riwayat Akses Data
          </h2>
          <p className="text-sm text-secondary mt-1">
            Catatan setiap kali profil kebutuhan Anda dibuka atau dipindai oleh
            petugas.
          </p>
        </div>

        {hasActiveQrs && (
          <button
            type="button"
            onClick={() => setIsConfirmDialogOpen(true)}
            className="inline-flex items-center justify-center min-h-12 min-w-12 px-4 py-2.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 font-bold rounded-lg border border-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors text-sm"
          >
            Cabut Semua QR
          </button>
        )}
      </div>

      {/* Filter Periode dan Fasilitas (Prioritas 4) */}
      <div className="p-4 rounded-xl bg-white border border-cyan-200 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <label
            htmlFor="filter-periode"
            className="text-xs font-bold text-secondary uppercase tracking-wider"
          >
            Periode
          </label>
          <select
            id="filter-periode"
            value={periodFilter}
            onChange={(e) =>
              setPeriodFilter(e.target.value as "all" | "7d" | "30d")
            }
            className="h-12 min-h-12 px-3 py-2 text-base rounded-lg border border-cyan-700 bg-white text-main focus:outline-none focus:ring-4 focus:ring-cyan-900"
          >
            <option value="all">Semua Waktu</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <label
            htmlFor="filter-fasilitas"
            className="text-xs font-bold text-secondary uppercase tracking-wider"
          >
            Fasilitas
          </label>
          <select
            id="filter-fasilitas"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="h-12 min-h-12 px-3 py-2 text-base rounded-lg border border-cyan-700 bg-white text-main focus:outline-none focus:ring-4 focus:ring-cyan-900"
          >
            <option value="all">Semua Fasilitas</option>
            {availableFacilities.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daftar Kronologis */}
      {filteredHistory.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-cyan-200 text-center flex flex-col items-center gap-2">
          <p className="text-base font-bold text-main">Belum ada akses</p>
          <p className="text-sm text-secondary max-w-sm">
            {history.length === 0
              ? "Belum ada riwayat pembukaan data atau pembuatan QR."
              : "Tidak ada riwayat yang cocok dengan filter yang dipilih."}
          </p>
        </div>
      ) : (
        <ul aria-label="Daftar Riwayat Akses" className="flex flex-col gap-4">
          {filteredHistory.map((item) => (
            <li
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-cyan-200 flex flex-col gap-3 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                <span className="text-base font-bold text-main break-words">
                  {item.title}
                </span>
                <span className="text-xs font-normal text-secondary sm:shrink-0">
                  {item.timeTextWib}
                </span>
              </div>

              {/* Rincian Pelaku & Fasilitas */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-secondary">
                {item.actorLabel && item.actorLabel !== "Anda" && (
                  <span>
                    Pelaku:{" "}
                    <strong className="text-main">{item.actorLabel}</strong>
                  </span>
                )}
                {item.facilityName && (
                  <span>
                    Fasilitas:{" "}
                    <strong className="text-main">{item.facilityName}</strong>
                  </span>
                )}
              </div>

              {/* Data yang Dilihat (khusus profile_read) */}
              {item.fieldLabels && item.fieldLabels.length > 0 && (
                <div className="pt-2 border-t border-cyan-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Data yang dilihat:
                  </span>
                  <p className="text-sm text-main font-normal break-words">
                    {item.fieldLabels.join(", ")}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Dialog Konfirmasi Cabut Semua QR */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Cabut semua QR aktif?"
        description="Semua QR tidak bisa dipakai lagi."
        confirmLabel="Ya, Cabut Semua"
        cancelLabel="Batal"
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleRevokeAll}
      />
    </div>
  );
}
