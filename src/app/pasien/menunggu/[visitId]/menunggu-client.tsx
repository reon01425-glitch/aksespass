"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, PatientNeedsSummary, ServiceDoneRedirect, StatusBanner } from "@/components";
import type { PatientNeedSummaryItem } from "@/components/patient-needs-summary";
import {
  getNotificationSupport,
  requestNotificationPermission,
  showCallNotification,
  vibrateForCall,
  type NotificationSupport,
} from "@/lib/visits/call-feedback";
import type { WaitingPhase } from "@/lib/visits/call";

export interface MenungguClientProps {
  visitId: string;
  facilityName: string;
  initialPhase: WaitingPhase;
  summary: {
    preferredName: string;
    needs: PatientNeedSummaryItem[];
    patientNote: string | null;
  };
}

const linkClass =
  "inline-flex items-center justify-center min-h-12 py-2.5 px-6 font-bold rounded-lg focus:ring-4 focus:ring-cyan-900 text-center w-full sm:w-auto";

/** P13: pasien menunggu dipanggil. Memeriksa status tiap 5 detik. */
export function MenungguClient({
  visitId,
  facilityName,
  initialPhase,
  summary,
}: MenungguClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<WaitingPhase>(initialPhase);
  const [support, setSupport] = useState<NotificationSupport>("default");
  const navigated = useRef(false);

  useEffect(() => {
    // Izin notifikasi hanya bisa dibaca di peramban, setelah hidrasi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport(getNotificationSupport());
  }, []);

  useEffect(() => {
    let mounted = true;

    const goToCall = (room: string | null) => {
      if (navigated.current) return;
      navigated.current = true;
      vibrateForCall();
      if (document.visibilityState === "hidden") showCallNotification(room);
      router.push(`/pasien/panggilan/${encodeURIComponent(visitId)}`);
    };

    if (initialPhase === "dipanggil") goToCall(null);

    const poll = async () => {
      if (document.visibilityState === "hidden" && getNotificationSupport() !== "granted") {
        return;
      }
      try {
        const res = await fetch(
          `/api/pasien/kunjungan/${encodeURIComponent(visitId)}/status`,
          { headers: { "Cache-Control": "no-store" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data.ok) return;
        setPhase(data.phase as WaitingPhase);
        if (data.phase === "dipanggil") goToCall(data.room ?? null);
      } catch {
        // Abaikan galat jaringan sementara.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(poll, 5000);
    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [visitId, initialPhase, router]);

  const notifyUnavailable = support === "unsupported" || support === "denied";

  return (
    <div className="flex flex-col gap-6 max-w-full w-full">
      <ServiceDoneRedirect visitId={visitId} />
      <section
        aria-labelledby="heading-status"
        className="flex flex-col gap-2 p-5 rounded-2xl bg-white border-2 border-cyan-800"
      >
        <div id="heading-status" className="text-sm font-bold text-secondary">
          Status Anda di {facilityName}
        </div>
        {/* div, bukan p: aturan global p menimpa ukuran teks utilitas. */}
        <div
          role="status"
          aria-live="polite"
          className="text-3xl font-bold text-main break-words leading-tight"
        >
          {phase === "menunggu" && "Menunggu"}
          {phase === "dipanggil" && "Giliran Anda"}
          {phase === "dilayani" && "Sedang dilayani"}
        </div>
        <p className="text-base text-secondary">
          {phase === "menunggu" &&
            "Petugas sudah menerima kebutuhan Anda. Layar ini akan memberi tahu saat giliran tiba. Posisi antrean belum tersedia."}
          {phase === "dilayani" &&
            "Bantuan untuk kunjungan ini sudah dicatat petugas."}
        </p>
      </section>

      {notifyUnavailable && (
        <StatusBanner
          variant="warning"
          title="Pemberitahuan tidak tersedia"
          message="Perhatikan layar ruang tunggu atau petugas. Petugas akan memanggil Anda dengan cara visual."
        />
      )}

      {support === "default" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-secondary">
            Aktifkan pemberitahuan agar layar menyala saat giliran Anda tiba
            walau halaman ini sedang tidak dilihat.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => setSupport(await requestNotificationPermission())}
            className="w-full sm:w-auto"
          >
            Aktifkan Pemberitahuan
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/pasien/komunikacare?kunjungan=${encodeURIComponent(visitId)}`}
          className={`${linkClass} bg-cyan-700 text-white shadow-sm`}
        >
          Buka KomunikaCare
        </Link>
        {phase === "dilayani" && (
          <Link
            href="/pasien/konfirmasi"
            className={`${linkClass} bg-cyan-100 border border-cyan-700 text-cyan-900`}
          >
            Konfirmasi Kunjungan
          </Link>
        )}
      </div>

      <section aria-labelledby="heading-diketahui" className="flex flex-col gap-3">
        <h2
          id="heading-diketahui"
          className="text-base font-bold text-main border-b border-cyan-100 pb-2"
        >
          Yang diketahui petugas
        </h2>
        <PatientNeedsSummary
          preferredName={summary.preferredName}
          needs={summary.needs}
          patientNote={summary.patientNote}
          showPrivacyNotes={false}
        />
      </section>
    </div>
  );
}
