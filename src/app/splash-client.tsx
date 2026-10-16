"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Lama tampil splash sebelum pindah otomatis (milidetik). Dapat dilewati kapan saja. */
export const SPLASH_DURATION_MS = 1200;

export interface SplashClientProps {
  /** Tujuan yang sudah ditentukan server (beranda peran, /mulai, atau /masuk). */
  destination: string;
}

/**
 * [P1] Splash Screen: logo, tagline, dan indikator memuat. Singkat dan dapat
 * dilewati. Tujuan sudah ditentukan server, sehingga tampilan ini hanya
 * menahan pengguna sebentar lalu berpindah.
 */
export function SplashClient({ destination }: SplashClientProps) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(destination);
    const timer = window.setTimeout(() => {
      router.replace(destination);
    }, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [destination, router]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-dvh bg-page text-main focus:outline-none"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <Image
          src="/logo-aksespass.png"
          alt=""
          aria-hidden="true"
          width={800}
          height={178}
          priority
          unoptimized
          className="h-auto w-full max-w-xs"
        />

        <h1 className="sr-only">AKSESPASS</h1>

        <p className="text-base text-main">
          Sampaikan kebutuhan layanan kesehatan Anda, dengan persetujuan tetap
          di tangan Anda.
        </p>

        <p role="status" className="flex items-center gap-2 text-sm text-secondary">
          <Loader2 aria-hidden="true" className="h-5 w-5" />
          Memuat AKSESPASS…
        </p>

        <Link
          href={destination}
          replace
          className="inline-flex min-h-12 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold text-link underline focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
        >
          Lewati
        </Link>
      </div>
    </main>
  );
}
