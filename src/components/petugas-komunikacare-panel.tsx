"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button, StatusBanner, TextField } from "@/components";
import { KomunikaMessageList, useKomunikaThread } from "@/components/komunikacare-thread";
import { KOMUNIKACARE_TEXT_MAX_LENGTH } from "@/lib/komunikacare/board";

const QUICK = ["Silakan duduk.", "Mohon tunggu sebentar.", "Apakah Anda mengerti?"];

/**
 * T7: panel percakapan di layar petugas. Sinkron dua arah dengan KomunikaCare di
 * HP pasien (polling 2 detik). Petugas menulis; pasien memilih gambar atau
 * mengetik. Pesan dihapus saat pelayanan selesai.
 */
export function PetugasKomunikaPanel({ visitId }: { visitId: string }) {
  const thread = useKomunikaThread(visitId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (value: string) => {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const r = await thread.send("text", body);
    setSending(false);
    if (r.ok) setText("");
    else setError(r.message ?? "Pesan tidak terkirim.");
  };

  return (
    <section
      aria-labelledby="heading-komunikacare"
      className="flex flex-col gap-3 p-4 rounded-xl bg-white border border-cyan-800"
    >
      <h2 id="heading-komunikacare" className="text-base font-bold text-main">
        KomunikaCare dengan Pasien
      </h2>
      <p className="text-sm text-secondary">
        Pesan tampil besar di HP pasien. Pesan pasien muncul di sini. Semua pesan
        dihapus saat pelayanan selesai.
      </p>
      {!thread.online && (
        <StatusBanner
          variant="warning"
          title="Sambungan terputus"
          message="Mencoba lagi otomatis."
        />
      )}
      {error && <StatusBanner variant="error" title="Perlu perhatian" message={error} />}
      <KomunikaMessageList
        messages={thread.messages}
        viewer="staff"
        label="Percakapan dengan pasien"
      />
      <ul className="flex flex-wrap gap-2" aria-label="Kalimat cepat petugas">
        {QUICK.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => void send(q)}
              className="min-h-12 rounded-lg border border-cyan-700 bg-cyan-100 px-4 py-2 text-left text-base font-bold text-cyan-900 focus:outline-none focus:ring-4 focus:ring-cyan-900"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
      <TextField
        id="komunikacare-petugas-teks"
        label="Tulis pesan untuk pasien"
        variant="textarea"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={KOMUNIKACARE_TEXT_MAX_LENGTH}
      />
      <Button
        type="button"
        onClick={() => void send(text)}
        disabled={!text.trim()}
        isLoading={sending}
        className="w-full flex items-center justify-center gap-2"
      >
        <Send aria-hidden="true" className="w-5 h-5 shrink-0" />
        <span>Kirim ke Pasien</span>
      </Button>
    </section>
  );
}
