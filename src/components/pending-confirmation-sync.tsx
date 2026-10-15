"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBanner } from "./status-banner";
import {
  flushConfirmQueue,
  readConfirmQueue,
  type FlushOutcome,
  type QueuedConfirmation,
} from "@/lib/careproof/offline-queue";

export interface PendingConfirmationSyncProps {
  userId: string;
}

async function sendOne(item: QueuedConfirmation): Promise<FlushOutcome> {
  try {
    const res = await fetch("/api/pasien/kunjungan/konfirmasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitId: item.visitId,
        status: item.status,
        unmetNeedCodes: item.unmetNeedCodes,
      }),
    });
    if (res.ok) return "synced";
    if (res.status >= 500 || res.status === 429 || res.status === 401) return "retry";
    return "dropped";
  } catch {
    return "retry";
  }
}

/**
 * Menampilkan status antrean jawaban CareProof (P16) dan mengirimnya otomatis
 * saat koneksi kembali: "Menunggu sinkron" lalu "Tersinkron".
 */
export function PendingConfirmationSync({ userId }: PendingConfirmationSyncProps) {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(0);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    if (readConfirmQueue(userId).length === 0) {
      setPending(0);
      return;
    }
    running.current = true;
    try {
      const res = await flushConfirmQueue(userId, sendOne);
      setPending(res.remaining);
      if (res.synced > 0) {
        setJustSynced((n) => n + res.synced);
        router.refresh();
      }
    } finally {
      running.current = false;
    }
  }, [userId, router]);

  useEffect(() => {
    // Membaca antrean dari localStorage hanya mungkin setelah hidrasi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(readConfirmQueue(userId).length);
    void run();
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => void run(), 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [userId, run]);

  if (pending > 0) {
    return (
      <StatusBanner
        variant="warning"
        title="Menunggu sinkron"
        message={`${pending} jawaban konfirmasi tersimpan di perangkat dan akan terkirim otomatis saat Anda online.`}
      />
    );
  }
  if (justSynced > 0) {
    return (
      <StatusBanner
        variant="success"
        title="Tersinkron"
        message="Jawaban konfirmasi yang menunggu sudah terkirim."
      />
    );
  }
  return null;
}
