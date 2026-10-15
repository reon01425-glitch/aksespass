"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { vibrateForCall } from "@/lib/visits/call-feedback";

export interface PanggilanClientProps {
  visitId: string;
  facilityName: string;
  initialRoom: string | null;
  initialCalledAt: string | null;
}

/**
 * P14: layar penuh kontras tinggi "Giliran Anda" dengan nama ruangan, ikon besar, dan getar.
 * Suara bukan satu-satunya penanda. Bila petugas memanggil ulang, layar dan getar diperbarui.
 */
export function PanggilanClient({
  visitId,
  facilityName,
  initialRoom,
  initialCalledAt,
}: PanggilanClientProps) {
  const [room, setRoom] = useState<string | null>(initialRoom);
  const lastCalledAt = useRef<string | null>(initialCalledAt);

  useEffect(() => {
    vibrateForCall();
  }, []);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(
          `/api/pasien/kunjungan/${encodeURIComponent(visitId)}/status`,
          { headers: { "Cache-Control": "no-store" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted || !data.ok) return;
        setRoom(data.room ?? null);
        if (data.calledAt && data.calledAt !== lastCalledAt.current) {
          lastCalledAt.current = data.calledAt;
          vibrateForCall();
        }
      } catch {
        // Abaikan galat jaringan sementara.
      }
    };
    const interval = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [visitId]);

  return (
    <main
      aria-labelledby="judul-giliran"
      className="min-h-dvh w-full flex flex-col items-center justify-center gap-8 bg-cyan-900 px-6 py-10 text-center text-white"
    >
      <BellRing aria-hidden="true" className="w-32 h-32 shrink-0" />
      <div className="flex flex-col gap-3" role="alert">
        {/* div, bukan h1/p: aturan global h1/p menimpa ukuran teks utilitas. */}
        <div
          id="judul-giliran"
          role="heading"
          aria-level={1}
          className="text-5xl font-bold break-words leading-tight"
        >
          Giliran Anda
        </div>
        <div className="text-3xl font-bold break-words leading-tight">
          {room ? room : "Silakan menuju ruangan petugas"}
        </div>
        <div className="text-lg">{facilityName}</div>
      </div>
      <Link
        href={`/pasien/komunikacare?kunjungan=${encodeURIComponent(visitId)}`}
        className="inline-flex items-center justify-center min-h-16 w-full max-w-sm px-8 py-4 rounded-xl bg-white text-cyan-900 text-xl font-bold focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-4 focus:ring-offset-cyan-900"
      >
        Saya Menuju Ruangan
      </Link>
    </main>
  );
}
