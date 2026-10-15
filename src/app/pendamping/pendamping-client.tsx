"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  LogoutButton,
  PageShell,
  StatusBanner,
} from "@/components";
import type { ListLinkedPatientsResult } from "@/lib/companions";
import {
  Users,
  UserPlus,
  FileText,
  QrCode,
  ClipboardCheck,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export interface PendampingClientProps {
  data: ListLinkedPatientsResult;
}

export function PendampingClient({ data }: PendampingClientProps) {
  const { activePatients, revokedCount, pendingCount } = data;

  // Banner tautan berakhir hanya tampil sekali: tandai sudah dilihat setelah halaman tampil.
  useEffect(() => {
    if (revokedCount > 0) {
      fetch("/api/pendamping/tautan/dilihat", { method: "POST" }).catch(() => {
        // Banner mungkin muncul sekali lagi bila permintaan gagal.
      });
    }
  }, [revokedCount]);

  return (
    <PageShell title="Beranda Pendamping">
      <div className="flex flex-col gap-6 max-w-full w-full">
        {/* Banner Tautan Berakhir bila ada */}
        {revokedCount > 0 && (
          <StatusBanner
            variant="warning"
            title="Tautan Berakhir"
            message={
              revokedCount === 1
                ? "Satu tautan telah berakhir."
                : `${revokedCount} tautan telah berakhir.`
            }
          />
        )}

        {pendingCount > 0 && (
          <StatusBanner
            variant="warning"
            title="Menunggu Persetujuan Pasien"
            message={
              pendingCount === 1
                ? "Satu permintaan tautan menunggu persetujuan pasien."
                : `${pendingCount} permintaan tautan menunggu persetujuan pasien.`
            }
          />
        )}

        {/* Header Profil Pendamping */}
        <div className="p-4 rounded-xl border border-cyan-800 bg-surface flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-100 text-cyan-900 shrink-0">
              <Users className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-secondary font-bold">Akun Pendamping</span>
              <span className="text-base font-bold text-main">
                {activePatients.length} Pasien Tertaut Aktif
              </span>
            </div>
          </div>
          <Link
            href="/pendamping/tautkan"
            className="inline-flex items-center justify-center min-h-[48px] px-4 py-2 bg-cyan-700 text-white font-bold rounded-lg hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors text-sm shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />
            Tautkan Pasien
          </Link>
        </div>

        {/* Daftar Pasien Tertaut Aktif */}
        <section aria-labelledby="heading-pasien-tertaut">
          <h2
            id="heading-pasien-tertaut"
            className="text-lg font-bold text-main border-b border-cyan-100 pb-2 mb-3"
          >
            Pasien yang Didampingi
          </h2>

          {activePatients.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-cyan-200 bg-surface flex flex-col items-center text-center gap-3">
              <Users className="w-10 h-10 text-cyan-800" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-base font-bold text-main">
                  Belum ada pasien yang tertaut
                </p>
                <p className="text-sm text-secondary max-w-sm">
                  Minta kode tautan 8 karakter dari pasien di menu Pendamping mereka, lalu tautkan akun Anda.
                </p>
              </div>
              <Link
                href="/pendamping/tautkan"
                className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 bg-cyan-700 text-white font-bold rounded-lg hover:bg-cyan-800 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors text-base mt-2"
              >
                <UserPlus className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                Tautkan Pasien Sekarang
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activePatients.map((patient) => {
                const isPassportComplete = patient.passportStatus === "complete";
                return (
                  <div
                    key={patient.linkId}
                    className="p-5 rounded-2xl border border-cyan-200 bg-surface flex flex-col gap-4 shadow-sm"
                  >
                    {/* Header Pasien */}
                    <div className="flex items-start justify-between gap-3 border-b border-cyan-100 pb-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-secondary font-bold uppercase tracking-wider">
                          Pasien
                        </span>
                        <h3 className="text-xl font-bold text-main break-words">
                          {patient.preferredName}
                        </h3>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 bg-cyan-100 text-cyan-900 border border-cyan-700">
                        {isPassportComplete ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            Paspor Lengkap
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            Paspor Belum Diisi
                          </>
                        )}
                      </span>
                    </div>

                    {/* Informasi Status Konfirmasi */}
                    {patient.pendingConfirmationsCount > 0 && (
                      <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="w-5 h-5 text-cyan-800 shrink-0" aria-hidden="true" />
                          <span className="font-bold text-main">
                            {patient.pendingConfirmationsCount} konfirmasi kunjungan menunggu
                          </span>
                        </div>
                        <Link
                          href={`/pendamping/tautan/${patient.linkId}/konfirmasi`}
                          className="font-bold text-cyan-800 hover:text-cyan-900 underline shrink-0 ml-2 text-sm"
                        >
                          Lihat
                        </Link>
                      </div>
                    )}

                    {/* Menu Aksi Atas Nama Pasien */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <Link
                        href={`/pendamping/tautan/${patient.linkId}/paspor`}
                        className="flex items-center justify-between p-3 rounded-lg border border-cyan-200 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors min-h-[48px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-cyan-800 shrink-0" aria-hidden="true" />
                          <span className="text-sm font-bold text-main truncate">
                            Kelola Paspor
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
                      </Link>

                      <Link
                        href={`/pendamping/tautan/${patient.linkId}/qr`}
                        className="flex items-center justify-between p-3 rounded-lg border border-cyan-200 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors min-h-[48px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <QrCode className="w-4 h-4 text-cyan-800 shrink-0" aria-hidden="true" />
                          <span className="text-sm font-bold text-main truncate">
                            Kelola QR
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
                      </Link>

                      <Link
                        href={`/pendamping/tautan/${patient.linkId}/konfirmasi`}
                        aria-label={`Konfirmasi CareProof atas nama ${patient.preferredName}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-cyan-200 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-900 transition-colors min-h-[48px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ClipboardCheck className="w-4 h-4 text-cyan-800 shrink-0" aria-hidden="true" />
                          <span className="text-sm font-bold text-main truncate">
                            CareProof
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tombol Keluar */}
        <div className="pt-4 border-t border-cyan-100">
          <LogoutButton redirectTo="/masuk" className="w-full" />
        </div>
      </div>
    </PageShell>
  );
}
