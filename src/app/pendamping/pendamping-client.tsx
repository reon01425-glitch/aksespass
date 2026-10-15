"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  HeroCard,
  PageShell,
  RecoveryNotice,
  StatusBanner,
} from "@/components";
import { Users } from "lucide-react";
import type { ListLinkedPatientsResult } from "@/lib/companions";
import type { RecoveryRequestItem } from "@/lib/recovery";

export interface PendampingClientProps {
  data: ListLinkedPatientsResult;
  recoveryRequests?: RecoveryRequestItem[];
}

export function PendampingClient({ data, recoveryRequests = [] }: PendampingClientProps) {
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
    <PageShell title="Beranda Pendamping" companionNav>
      <div className="flex flex-col gap-6 max-w-full w-full">
        {recoveryRequests.map((r) => (
          <RecoveryNotice
            key={r.id}
            requestId={r.id}
            initiatorName={r.initiatorName}
            initiatedByMe={r.initiatedByMe}
            maskedNewPhone={r.maskedNewPhone}
            eligibleAt={r.eligibleAt}
            audience="companion"
            patientName={activePatients.find((p) => p.linkId === r.linkId)?.preferredName}
          />
        ))}

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

        {/* Ringkasan Akun Pendamping */}
        <HeroCard
          Icon={Users}
          title={`${activePatients.length} Pasien Tertaut Aktif`}
          description="Akun pendamping"
        />

        {/* Daftar Pasien Tertaut Aktif */}
        <section aria-labelledby="heading-pasien-tertaut">
          <h2
            id="heading-pasien-tertaut"
            className="mb-3 text-lg font-bold text-main"
          >
            Pasien yang Didampingi
          </h2>

          {activePatients.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1">
                <p className="text-base font-bold text-main">
                  Belum ada pasien yang tertaut
                </p>
                <p className="text-sm leading-6 text-secondary">
                  Minta kode tautan 8 karakter dari pasien di menu Pendamping
                  mereka, lalu tautkan akun Anda.
                </p>
              </div>
              <Link
                href="/pendamping/tautkan"
                className="flex min-h-12 items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-cyan-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
              >
                Tautkan Pasien Sekarang
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
              {activePatients.map((patient) => {
                const isPassportComplete = patient.passportStatus === "complete";
                const actions = [
                  { href: `/pendamping/tautan/${patient.linkId}/paspor`, label: "Kelola Paspor", aria: undefined },
                  { href: `/pendamping/tautan/${patient.linkId}/qr`, label: "Kelola QR", aria: undefined },
                  {
                    href: `/pendamping/tautan/${patient.linkId}/konfirmasi`,
                    label: "CareProof",
                    aria: `Konfirmasi CareProof atas nama ${patient.preferredName}`,
                  },
                  {
                    href: `/pendamping/tautan/${patient.linkId}/pemulihan`,
                    label: "Pemulihan Akun",
                    aria: `Pemulihan nomor akun ${patient.preferredName}`,
                  },
                ];
                return (
                  <div
                    key={patient.linkId}
                    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col items-start gap-2">
                      <h3 className="min-w-0 break-words text-base font-bold leading-snug text-main">
                        {patient.preferredName}
                      </h3>
                      <span className="shrink-0 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-900">
                        {isPassportComplete ? "Paspor Lengkap" : "Paspor Belum Diisi"}
                      </span>
                    </div>

                    {patient.pendingConfirmationsCount > 0 && (
                      <div className="flex flex-col items-start gap-1 text-sm">
                        <span className="font-bold text-main">
                          {patient.pendingConfirmationsCount} konfirmasi kunjungan menunggu
                        </span>
                        <Link
                          href={`/pendamping/tautan/${patient.linkId}/konfirmasi`}
                          className="shrink-0 rounded-lg py-1 font-bold text-cyan-900 underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                        >
                          Lihat
                        </Link>
                      </div>
                    )}

                    <ul className="m-0 mt-auto flex list-none flex-col gap-2 p-0">
                      {actions.map((action) => (
                        <li key={action.href}>
                          <Link
                            href={action.href}
                            aria-label={action.aria}
                            className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-2 text-center text-sm font-bold text-cyan-900 transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                          >
                            {action.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
