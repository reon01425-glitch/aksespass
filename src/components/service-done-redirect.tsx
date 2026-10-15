"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getNotificationSupport,
  vibrateForCall,
} from "@/lib/visits/call-feedback";

export interface ServiceDoneRedirectProps {
  visitId: string;
}

/**
 * Setelah petugas menyimpan catatan bantuan, pasien dibawa ke konfirmasi
 * kebutuhan (P16). Dipasang di P13, P14, dan P15 selama kunjungan.
 * Tidak menampilkan apa pun; memeriksa status tiap 5 detik.
 */
export function ServiceDoneRedirect({ visitId }: ServiceDoneRedirectProps) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      if (done.current) return;
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
        if (!mounted || !data.ok || data.phase !== "dilayani") return;
        done.current = true;
        vibrateForCall();
        if (
          document.visibilityState === "hidden" &&
          getNotificationSupport() === "granted"
        ) {
          try {
            new window.Notification("Pelayanan selesai", {
              body: "Mohon konfirmasi apakah kebutuhan Anda terpenuhi.",
              tag: "aksespass-konfirmasi",
            });
          } catch {
            // Notifikasi gagal tampil: pengalihan halaman tetap berjalan.
          }
        }
        router.push(`/pasien/konfirmasi/${encodeURIComponent(visitId)}`);
      } catch {
        // Abaikan galat jaringan sementara.
      }
    };

    void poll();
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
  }, [visitId, router]);

  return null;
}
