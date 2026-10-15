"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { messageText, type KomunikaMessage } from "@/lib/komunikacare/board";

export const KOMUNIKACARE_POLL_MS = 2000;

interface ThreadState {
  messages: KomunikaMessage[];
  ended: boolean;
  /** false bila polling gagal (jaringan/server). */
  online: boolean;
}

/**
 * Polling pesan KomunikaCare tiap 2 detik selama tab terlihat (pola yang sama
 * dengan P12–P14). Pesan terkirim langsung ditambahkan secara lokal agar
 * terasa instan.
 */
export function useKomunikaThread(visitId: string | null) {
  const [state, setState] = useState<ThreadState>({ messages: [], ended: false, online: true });
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    if (!visitId) return;
    try {
      const res = await fetch(`/api/komunikacare/pesan?kunjungan=${encodeURIComponent(visitId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setState((s) => ({ ...s, online: false }));
        return;
      }
      const data = (await res.json()) as { messages: KomunikaMessage[]; ended: boolean };
      if (data.ended) stopped.current = true;
      setState({ messages: data.messages, ended: data.ended, online: true });
    } catch {
      setState((s) => ({ ...s, online: false }));
    }
  }, [visitId]);

  useEffect(() => {
    if (!visitId) return;
    stopped.current = false;
    // Muat awal lewat polling; setState terjadi setelah await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = window.setInterval(() => {
      if (stopped.current || document.visibilityState !== "visible") return;
      void refresh();
    }, KOMUNIKACARE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [visitId, refresh]);

  const send = useCallback(
    async (kind: "icon" | "text", body: string): Promise<{ ok: boolean; message?: string }> => {
      if (!visitId) return { ok: false };
      try {
        const res = await fetch("/api/komunikacare/pesan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId, kind, body }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: KomunikaMessage | string;
        };
        if (!res.ok || !data.ok) {
          if (res.status === 404) stopped.current = true;
          return { ok: false, message: "Pesan tidak terkirim. Coba lagi." };
        }
        const sent = data.message as KomunikaMessage;
        setState((s) =>
          s.messages.some((m) => m.id === sent.id)
            ? s
            : { ...s, messages: [...s.messages, sent] }
        );
        return { ok: true };
      } catch {
        return { ok: false, message: "Pesan tidak terkirim. Periksa sambungan internet." };
      }
    },
    [visitId]
  );

  return { ...state, send };
}

/** Riwayat percakapan; `viewer` menentukan sisi "Anda". */
export function KomunikaMessageList({
  messages,
  viewer,
  label,
}: {
  messages: KomunikaMessage[];
  viewer: "patient" | "staff";
  label: string;
}) {
  return (
    <ul aria-label={label} aria-live="polite" className="flex flex-col gap-2">
      {messages.length === 0 && (
        <li className="text-base text-secondary">Belum ada pesan.</li>
      )}
      {messages.map((m) => {
        const mine = m.sender === viewer;
        const who = mine ? "Anda" : m.sender === "staff" ? "Petugas" : "Pasien";
        return (
          <li
            key={m.id}
            data-testid={`pesan-${m.sender}`}
            className={`rounded-xl border-2 p-3 ${
              mine ? "border-cyan-700 bg-cyan-100" : "border-cyan-800 bg-white"
            }`}
          >
            <p className="text-sm font-bold text-secondary">{who}</p>
            <p className="break-words text-lg font-bold text-main">{messageText(m)}</p>
          </li>
        );
      })}
    </ul>
  );
}
